import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffprobeStatic from 'ffprobe-static'
import { promises as fs } from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { WebSocketService } from './websocket.service'
import { SocketService } from './socket.service'
import { VideoModel } from '../models/video.model'

// Use platform-independent paths from installers
ffmpeg.setFfmpegPath(ffmpegInstaller.path)
ffmpeg.setFfprobePath(ffprobeStatic.path)

console.log('FFmpeg paths:', {
  ffmpeg: ffmpegInstaller.path,
  ffprobe: ffprobeStatic.path
})

interface VideoMetadata {
  duration: number
  resolution: { width: number; height: number }
  fps?: number
}

interface ProcessingProgress {
  stage: string;
  progress: number;
  eta?: number;
  currentTask?: string;
}

interface QualityPreset {
  name: string
  height: number
  bitrate: string
  crf: number
  preset: string
}

export class VideoProcessingService {
  // Update paths to be absolute and outside of watched directory
  private static readonly BASE_DIR = path.resolve(process.cwd(), '..')
  private static readonly UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')
  private static readonly HLS_DIR = path.resolve(process.cwd(), 'public', 'hls')
  private static readonly THUMBNAIL_DIR = path.resolve(process.cwd(), 'public', 'thumbnails')
  private static readonly CACHE_DIR = path.resolve(process.cwd(), 'cache', 'segments')

  private static readonly RESOLUTIONS = [
    { height: 720, bitrate: '2500k' },
    { height: 480, bitrate: '1500k' },
    { height: 360, bitrate: '1000k' }
  ] as const

  private static readonly QUALITY_PRESETS: QualityPreset[] = [
    {
      name: 'high',
      height: 1080,
      bitrate: '4000k',
      crf: 18,
      preset: 'slower'
    },
    {
      name: 'medium',
      height: 720,
      bitrate: '2500k',
      crf: 20,
      preset: 'medium'
    },
    {
      name: 'low',
      height: 480,
      bitrate: '1000k',
      crf: 23,
      preset: 'veryfast'
    }
  ]

  private static readonly MAX_CONCURRENT_PROCESSES = 2;
  private static processingQueue: Array<{
    videoId: string;
    task: () => Promise<void>;
  }> = [];
  private static activeProcesses = 0;

  private static readonly SEGMENT_DURATION = 4 // seconds
  private static readonly KEYFRAME_INTERVAL = 48 // frames

  // Watermark settings
  private static readonly LOGO_PATH = path.resolve(process.cwd(), 'public', 'assets', 'tiknok-logo.png')
  private static readonly WATERMARK_FONT = path.resolve(process.cwd(), 'public', 'assets', 'fonts', 'Arial.ttf')

  // Add a map to track active FFmpeg processes by their command objects
  private static activeFFmpegProcesses: Map<string, { command: ReturnType<typeof ffmpeg>; process?: any }> = new Map();

  // Add memory and CPU limits
  private static readonly MEMORY_LIMIT = '512M'
  private static readonly CPU_USAGE = '50%'

  // Add timeout for processes
  private static readonly PROCESS_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 5000 // 5 seconds

  static async init() {
    try {
      // Create all required directories
      await Promise.all([
        fs.mkdir(this.UPLOAD_DIR, { recursive: true }),
        fs.mkdir(this.HLS_DIR, { recursive: true }),
        fs.mkdir(this.THUMBNAIL_DIR, { recursive: true }),
        fs.mkdir(this.CACHE_DIR, { recursive: true })
      ])

      // Verify FFmpeg binaries exist
      const [ffmpegStats, ffprobeStats] = await Promise.all([
        fs.stat(ffmpegInstaller.path),
        fs.stat(ffprobeStatic.path)
      ])

      if (!ffmpegStats.isFile() || !ffprobeStats.isFile()) {
        throw new Error('FFmpeg binaries not found')
      }

      console.log('Video processing directories created:', {
        uploads: this.UPLOAD_DIR,
        hls: this.HLS_DIR,
        thumbnails: this.THUMBNAIL_DIR,
        cache: this.CACHE_DIR
      })

      console.log('Video processing service initialized')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to initialize video processing service:', errorMessage)
      throw new Error(`Video processing initialization failed: ${errorMessage}`)
    }
  }

  private static getVideoMetadata(inputPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const process = spawn(ffprobeStatic.path, [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        inputPath
      ])

      let output = ''
      process.stdout.on('data', (data) => {
        output += data
      })

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const metadata = JSON.parse(output)
            const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video')
            
            if (!videoStream) {
              return reject(new Error('No video stream found'))
            }

            resolve({
              duration: parseFloat(metadata.format.duration) || 0,
              resolution: {
                width: parseInt(videoStream.width) || 0,
                height: parseInt(videoStream.height) || 0
              },
              fps: videoStream.r_frame_rate ? parseFloat(videoStream.r_frame_rate.split('/')[0]) / parseFloat(videoStream.r_frame_rate.split('/')[1]) : undefined
            })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            reject(new Error(`Failed to parse FFprobe output: ${errorMessage}`))
          }
        } else {
          reject(new Error(`FFprobe exited with code ${code}`))
        }
      })

      process.on('error', (error) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        reject(new Error(`FFprobe process error: ${errorMessage}`))
      })
    })
  }

  private static async processQueue(): Promise<void> {
    if (this.activeProcesses >= this.MAX_CONCURRENT_PROCESSES) {
      return
    }

    const nextTask = this.processingQueue.shift()
    if (!nextTask) {
      return
    }

    this.activeProcesses++
    let retries = 0

    try {
      while (retries < this.MAX_RETRIES) {
        try {
          await nextTask.task()
          break
        } catch (error) {
          retries++
          if (retries >= this.MAX_RETRIES) {
            throw error
          }
          console.log(`Retrying task for video ${nextTask.videoId} (attempt ${retries + 1}/${this.MAX_RETRIES})`)
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY))
        }
      }
    } finally {
      this.activeProcesses--
      this.processQueue()
    }
  }

  private static async checkDiskSpace(path: string): Promise<boolean> {
    try {
      // Implement disk space check using node-disk-info or similar
      // For now, we'll just return true
      return true;
    } catch (error) {
      console.error('Disk space check failed:', error);
      return false;
    }
  }

  private static async checkSystemResources(): Promise<boolean> {
    const os = require('os')
    const freeMem = os.freemem()
    const totalMem = os.totalmem()
    const memoryUsage = (totalMem - freeMem) / totalMem
    
    if (memoryUsage > 0.9) { // 90% memory usage
      console.warn('System memory usage too high, pausing video processing')
      return false
    }
    
    return true
  }

  static async processVideo(inputPath: string, videoId: string): Promise<any> {
    console.log(`Starting video processing for ${videoId}`)
    
    try {
      // Get user info for watermarking
      const video = await VideoModel.findById(videoId).populate('userId', 'username')
      if (!video) {
        throw new Error(`Video ${videoId} not found`)
      }
      
      const username = video.userId && typeof video.userId === 'object' ? 
        (video.userId as any).username || 'user' : 'user'
      
      // Ensure logo file exists, create if not
      await this.ensureLogoExists()
      
      // Add to processing queue
      return new Promise((resolve, reject) => {
        const task = async () => {
          try {
            console.log(`[VideoProcessing] Processing video ${videoId}`)
            
            // Update to metadata stage
            await VideoModel.findByIdAndUpdate(videoId, {
              processingStage: 'metadata'
            });

            // Get video metadata
            const metadata = await this.getVideoMetadata(inputPath);
            
            const hlsPath = path.join(this.HLS_DIR, videoId);
            const thumbnailPath = path.join(this.THUMBNAIL_DIR, `${videoId}.jpg`);

            // Create directories
            await Promise.all([
              fs.mkdir(hlsPath, { recursive: true }),
              fs.mkdir(path.dirname(thumbnailPath), { recursive: true })
            ]);

            // Update to transcoding stage
            await VideoModel.findByIdAndUpdate(videoId, {
              processingStage: 'transcoding',
              processingProgress: 10
            });

            // Generate thumbnail and start HLS conversion
            await Promise.all([
              this.generateThumbnail(inputPath, thumbnailPath),
              this.createHLSStream(inputPath, hlsPath, metadata)
            ]);

            // Update to cleanup stage
            await VideoModel.findByIdAndUpdate(videoId, {
              processingStage: 'cleanup',
              processingProgress: 90
            });

            const result = {
              hlsPath: path.relative('public', hlsPath),
              thumbnailPath: path.relative('public', thumbnailPath),
              duration: metadata.duration,
              resolution: metadata.resolution
            };

            // Update final status
            await VideoModel.findByIdAndUpdate(videoId, {
              status: 'ready',
              processingComplete: true,
              processingStage: 'ready',
              processingProgress: 100,
              availableResolutions: this.RESOLUTIONS
            });

            // Broadcast status using both services for backward compatibility
            WebSocketService.broadcastStatus(videoId, 'ready')
            SocketService.broadcastVideoStatus(videoId, 'ready')

            console.log(`[VideoProcessing] Completed processing video ${videoId}`);
            resolve(result);
          } catch (error) {
            console.error(`[VideoProcessing] Error processing video ${videoId}:`, error);
            
            // Update error status
            await VideoModel.findByIdAndUpdate(videoId, {
              status: 'failed',
              processingComplete: true,
              processingStage: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            // Broadcast status using both services for backward compatibility
            WebSocketService.broadcastStatus(videoId, 'failed')
            SocketService.broadcastVideoStatus(videoId, 'failed')
            reject(error);
          }
        };

        this.processingQueue.push({ videoId, task });
        this.processQueue();
      });
    } catch (error) {
      console.error(`[VideoProcessing] Failed to initiate processing for video ${videoId}:`, error);
      await VideoModel.findByIdAndUpdate(videoId, {
        status: 'failed',
        processingComplete: true,
        processingStage: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private static generateThumbnail(inputPath: string, outputPath: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Get video metadata to determine duration
        const metadata = await this.getVideoMetadata(inputPath);
        const duration = metadata.duration;
        
        // Create temp directory for thumbnails
        const tempDir = path.join(path.dirname(outputPath), 'temp_thumbnails');
        await fs.mkdir(tempDir, { recursive: true });
        
        // Generate 5 thumbnails at different points in the video
        const thumbnailCount = 5;
        const thumbnailPromises = [];
        
        for (let i = 0; i < thumbnailCount; i++) {
          // Take screenshots at 10%, 30%, 50%, 70%, and 90% of the video
          const timePercent = 10 + (i * 20);
          const timeInSeconds = Math.max(1, Math.floor((duration * timePercent) / 100));
          
          const tempOutputPath = path.join(tempDir, `thumbnail_${i}.jpg`);
          
          const thumbnailPromise = new Promise<string>((resolveThumb, rejectThumb) => {
            ffmpeg(inputPath)
              .screenshot({
                count: 1,
                folder: tempDir,
                filename: `thumbnail_${i}.jpg`,
                timemarks: [timeInSeconds.toString()],
                size: '1280x720'
              })
              .on('end', () => resolveThumb(tempOutputPath))
              .on('error', rejectThumb);
          });
          
          thumbnailPromises.push(thumbnailPromise);
        }
        
        // Wait for all thumbnails to be generated
        const thumbnailPaths = await Promise.all(thumbnailPromises);
        
        // Select the best thumbnail (for now, just use the middle one)
        // In a real implementation, you could use image analysis to select the best one
        const selectedThumbnail = thumbnailPaths[Math.floor(thumbnailCount / 2)];
        
        // Copy the selected thumbnail to the final location
        await fs.copyFile(selectedThumbnail, outputPath);
        
        // Clean up temporary thumbnails
        for (const thumbnailPath of thumbnailPaths) {
          await fs.unlink(thumbnailPath).catch(console.error);
        }
        await fs.rmdir(tempDir).catch(console.error);
        
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  private static calculateETA(
    startTime: number,
    progress: number
  ): number | undefined {
    if (progress <= 0) return undefined;
    const elapsed = Date.now() - startTime;
    return Math.round((elapsed / progress) * (100 - progress));
  }

  private static getOptimalBitrate(width: number, height: number, fps: number = 30): string {
    const pixelCount = width * height
    const bitsPerPixel = 0.1 // Adjust based on desired quality
    const bitsPerSecond = pixelCount * bitsPerPixel * fps
    const kilobitsPerSecond = Math.round(bitsPerSecond / 1000)
    return `${kilobitsPerSecond}k`
  }

  private static async createHLSStream(inputPath: string, outputDir: string, metadata: VideoMetadata): Promise<void> {
    // Modified to add watermarking
    return new Promise(async (resolve, reject) => {
      try {
        // Get video info for watermarking
        const videoId = path.basename(outputDir)
        const video = await VideoModel.findById(videoId).populate('userId', 'username')
        const username = video && video.userId && typeof video.userId === 'object' ? 
          (video.userId as any).username || 'user' : 'user'
        
        // Ensure logo exists
        await this.ensureLogoExists()
        
        // Create command
        const command = ffmpeg(inputPath)
        
        // Add watermarks
        const complexFilters: string[] = [
          // Add logo to top-left corner
          `[0:v]overlay=10:10[withlogo]`,
          // Add username to mid-right
          `[withlogo]drawtext=text='@${username}':fontsize=24:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2:x=w-tw-20:y=h/2[watermarked]`
        ]
        
        // Add an output for each quality level
        this.QUALITY_PRESETS.forEach(({ name, height, bitrate, crf, preset }, index) => {
          const outputOptions = [
            `-c:v libx264`,
            `-crf ${crf}`,
            `-preset ${preset}`,
            `-c:a aac`,
            `-b:a 128k`,
            `-vf scale=-2:${height}`,
            `-b:v ${bitrate}`,
            `-hls_time ${this.SEGMENT_DURATION}`,
            `-hls_list_size 0`,
            `-hls_segment_filename ${outputDir}/${name}_%03d.ts`,
            `-hls_playlist_type vod`,
            `-f hls`
          ]
          
          // Apply watermark filter to the first output only
          if (index === 0) {
            command
              .complexFilter(complexFilters, 'watermarked')
              .output(`${outputDir}/${name}.m3u8`)
              .outputOptions(outputOptions)
              .map('[watermarked]')
              .map('0:a')
          } else {
            command
              .output(`${outputDir}/${name}.m3u8`)
              .outputOptions(outputOptions)
          }
        })
        
        // Create master playlist
        const masterPlaylist = this.generateMasterPlaylist(this.QUALITY_PRESETS)
        await fs.writeFile(
          path.join(outputDir, 'master.m3u8'),
          masterPlaylist
        )
        
        // Execute command
        command
          .on('start', (commandLine) => {
            console.log(`FFmpeg started with command: ${commandLine}`)
          })
          .on('progress', (progress) => {
            const percent = Math.round(progress.percent || 0)
            this.updateProgress(videoId, percent, 'transcoding', {
              fps: progress.frames / ((progress.timemark.split(':').reduce((acc: number, time: string) => (60 * acc) + +time, 0)) || 1),
              frame: progress.frames,
              time: progress.timemark
            })
          })
          .on('end', () => {
            console.log(`FFmpeg processing completed for ${videoId}`)
            resolve()
          })
          .on('error', (err) => {
            console.error(`FFmpeg processing error for ${videoId}:`, err)
            reject(err)
          })
          .run()
      } catch (error) {
        reject(error)
      }
    })
  }

  private static generateMasterPlaylist(resolutions: { height: number; bitrate: string }[]): string {
    let playlist = '#EXTM3U\n#EXT-X-VERSION:3\n'
    
    resolutions.forEach(({ height, bitrate }) => {
      playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(bitrate) * 1000},RESOLUTION=${height}p\n`
      playlist += `${height}p.m3u8\n`
    })

    return playlist
  }

  private static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    initialDelay = 1000,
    context = ''
  ): Promise<T> {
    let lastError: Error
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.error(`Attempt ${attempt}/${maxRetries} failed for ${context}:`, lastError)
        
        if (attempt === maxRetries) break
        
        const delay = initialDelay * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    throw lastError!
  }

  private static async cleanupPartialFiles(outputDir: string): Promise<void> {
    try {
      const files = await fs.readdir(outputDir)
      await Promise.all(
        files.map(file => fs.unlink(path.join(outputDir, file)).catch(console.error))
      )
      await fs.rmdir(outputDir).catch(console.error)
    } catch (error) {
      console.error('Cleanup failed:', error)
    }
  }

  static async getProcessingStatus(videoId: string): Promise<{
    status: string;
    progress: number;
    stage: string;
    error?: string;
  }> {
    const video = await VideoModel.findById(videoId);
    if (!video) {
      throw new Error('Video not found');
    }

    return {
      status: video.status,
      progress: video.processingProgress,
      stage: video.processingStage,
      error: video.error
    };
  }

  // Update cleanup method
  static async cleanup() {
    console.log('[VideoProcessing] Cleaning up...')
    
    // Kill all active FFmpeg processes
    for (const [videoId, processInfo] of this.activeFFmpegProcesses.entries()) {
      try {
        console.log(`[VideoProcessing] Killing FFmpeg process for video ${videoId}`)
        // Just remove from the map - the process will be terminated when the application exits
        this.activeFFmpegProcesses.delete(videoId)
      } catch (error) {
        console.error(`[VideoProcessing] Error killing FFmpeg process for video ${videoId}:`, error)
      }
    }
    
    this.activeFFmpegProcesses.clear()
    this.processingQueue = []
    this.activeProcesses = 0
  }

  private static updateProgress(videoId: string, progress: number, stage: string, details?: any) {
    // Broadcast progress using both services for backward compatibility
    WebSocketService.broadcastProgress(videoId, progress, stage, details)
    SocketService.broadcastVideoProgress(videoId, progress, stage, details)
  }

  // Ensure the logo file exists
  private static async ensureLogoExists(): Promise<void> {
    try {
      await fs.access(this.LOGO_PATH)
    } catch (error) {
      console.warn(`Logo file not found at ${this.LOGO_PATH}, creating a placeholder`)
      
      // Create directory if it doesn't exist
      const logoDir = path.dirname(this.LOGO_PATH)
      await fs.mkdir(logoDir, { recursive: true })
      
      // Create font directory if it doesn't exist
      const fontDir = path.dirname(this.WATERMARK_FONT)
      await fs.mkdir(fontDir, { recursive: true })
      
      // Create a simple placeholder logo using ffmpeg
      return new Promise((resolve, reject) => {
        ffmpeg()
          .input('color=c=white:s=200x100:d=1')
          .inputFormat('lavfi')
          .complexFilter([
            'drawtext=text=TikNok:fontsize=48:fontcolor=black:x=(w-text_w)/2:y=(h-text_h)/2'
          ])
          .output(this.LOGO_PATH)
          .on('end', resolve)
          .on('error', reject)
          .run()
      })
    }
  }
} 