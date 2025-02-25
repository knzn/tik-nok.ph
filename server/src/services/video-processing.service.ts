import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffprobeStatic from 'ffprobe-static'
import { promises as fs } from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { WebSocketService } from './websocket.service'
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

  // Add a map to track active FFmpeg processes
  private static activeFFmpegProcesses: Map<string, ReturnType<typeof ffmpeg>> = new Map();

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
    if (!(await this.checkSystemResources())) {
      throw new Error('System resources not available')
    }
    console.log(`[VideoProcessing] Starting process for video ${videoId}`)
    
    try {
      // Update initial status
      await VideoModel.findByIdAndUpdate(videoId, {
        processingStage: 'initializing',
        processingProgress: 0
      });

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
              processingStage: 'ready',
              processingProgress: 100,
              status: 'ready'
            });

            // Broadcast completion status
            WebSocketService.broadcastStatus(videoId, 'ready')

            console.log(`[VideoProcessing] Completed processing video ${videoId}`);
            resolve(result);
          } catch (error) {
            console.error(`[VideoProcessing] Error processing video ${videoId}:`, error);
            
            // Update error status
            await VideoModel.findByIdAndUpdate(videoId, {
              status: 'failed',
              processingStage: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            // Broadcast error status
            WebSocketService.broadcastStatus(videoId, 'failed')
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
        processingStage: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private static generateThumbnail(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          count: 1,
          folder: path.dirname(outputPath),
          filename: path.basename(outputPath),
          size: '320x240'
        })
        .on('end', resolve)
        .on('error', reject)
    })
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
    const startTime = Date.now()
    const outputDirName = path.basename(outputDir)
    
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('FFmpeg process timed out'))
        }, this.PROCESS_TIMEOUT)
      })

      await Promise.race([
        new Promise<void>((resolve, reject) => {
          const command = ffmpeg(inputPath)
            .outputOptions([
              '-c:v libx264',
              '-profile:v main',
              `-crf ${this.QUALITY_PRESETS[0].crf}`,
              '-preset medium',
              '-sc_threshold 0',
              `-g ${this.KEYFRAME_INTERVAL}`,
              `-keyint_min ${this.KEYFRAME_INTERVAL}`,
              `-hls_time ${this.SEGMENT_DURATION}`,
              '-hls_list_size 0',
              '-hls_playlist_type vod',
              `-b:v ${this.getOptimalBitrate(metadata.resolution.width, metadata.resolution.height, metadata.fps)}`,
              `-maxrate ${this.getOptimalBitrate(metadata.resolution.width, metadata.resolution.height, metadata.fps)}`,
              `-bufsize ${this.getOptimalBitrate(metadata.resolution.width, metadata.resolution.height, metadata.fps)}`,
              `-vf scale=-2:${this.QUALITY_PRESETS[0].height}`,
              '-c:a aac',
              '-b:a 128k',
              '-ac 2',
              '-hls_segment_filename',
              path.join(outputDir, `${this.QUALITY_PRESETS[0].height}p_%03d.ts`),
              // Add resource constraints
              `-threads ${Math.max(2, Math.floor(require('os').cpus().length / 2))}`,
              '-memory_limit 512M',
            ])
            .output(path.join(outputDir, `${this.QUALITY_PRESETS[0].height}p.m3u8`))

          command.on('progress', (progress: { percent: number }) => {
            const totalProgress = progress.percent / 100
            WebSocketService.broadcastProgress(
              outputDirName,
              totalProgress,
              'transcoding',
              {
                stage: 'transcoding',
                progress: totalProgress,
                currentTask: `${this.QUALITY_PRESETS[0].height}p variant (${Math.round(progress.percent)}%)`,
                eta: this.calculateETA(startTime, totalProgress)
              }
            )
          })

          command.on('end', () => {
            this.activeFFmpegProcesses.delete(outputDirName)
            resolve()
          })

          command.on('error', (err: Error) => {
            this.activeFFmpegProcesses.delete(outputDirName)
            reject(err)
          })

          // Use process termination event
          process.on('SIGTERM', () => {
            if (command) {
              try {
                command.kill()
                this.activeFFmpegProcesses.delete(outputDirName)
              } catch (error) {
                console.error('Error killing FFmpeg process:', error)
              }
            }
          })

          this.activeFFmpegProcesses.set(outputDirName, command)
          command.run()
        }),
        timeoutPromise
      ])
    } catch (error) {
      // Cleanup on error
      const ffmpegProcess = this.activeFFmpegProcesses.get(outputDirName)
      if (ffmpegProcess) {
        try {
          ffmpegProcess.kill()
        } catch (killError) {
          console.error('Error killing FFmpeg process:', killError)
        }
        this.activeFFmpegProcesses.delete(outputDirName)
      }
      throw error
    }
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
    for (const [videoId, ffmpegProcess] of this.activeFFmpegProcesses.entries()) {
      try {
        console.log(`[VideoProcessing] Killing FFmpeg process for video ${videoId}`)
        ffmpegProcess.kill()
      } catch (error) {
        console.error(`[VideoProcessing] Error killing FFmpeg process for video ${videoId}:`, error)
      }
    }
    
    this.activeFFmpegProcesses.clear()
    this.processingQueue = []
    this.activeProcesses = 0
  }
} 