import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffprobeStatic from 'ffprobe-static'
import { promises as fs } from 'fs'
import path from 'path'
import { VideoModel } from '../models/video.model'
import { config } from '../../../config/environment'
import { StorageFactory } from '../../../services/storage'

ffmpeg.setFfmpegPath(ffmpegInstaller.path)
ffmpeg.setFfprobePath(ffprobeStatic.path)

export class VideoProcessingService {
  private readonly qualities = [
    { resolution: '1080p', height: 1080, bitrate: '4000k' },
    { resolution: '720p', height: 720, bitrate: '2500k' },
    { resolution: '480p', height: 480, bitrate: '1000k' },
    { resolution: '360p', height: 360, bitrate: '600k' }
  ]

  // Get the storage service
  private storageService = StorageFactory.getStorageService();
  private useSpaces = config.spaces.useSpacesStorage;

  async processVideo(
    inputPath: string,
    outputDir: string,
    videoId: string
  ): Promise<void> {
    try {
      // Create temporary output directory for processing
      const tempOutputDir = path.join(process.cwd(), 'uploads', 'temp', videoId);
      await fs.mkdir(tempOutputDir, { recursive: true });

      // Generate thumbnail
      const thumbnailPath = path.join(tempOutputDir, 'thumbnail.jpg');
      await this.generateThumbnail(inputPath, thumbnailPath);

      // Create HLS manifest and segments
      await this.createHLSStream(inputPath, tempOutputDir);

      // Upload files to storage (either local or DigitalOcean Spaces)
      await this.uploadProcessedFiles(tempOutputDir, videoId);

      // Update video record with paths
      let hlsUrl: string;
      let thumbnailUrl: string;
      
      if (this.useSpaces) {
        // Use Spaces URLs
        hlsUrl = this.storageService.getFileUrl(`videos/${videoId}/playlist.m3u8`);
        thumbnailUrl = this.storageService.getFileUrl(`thumbnails/${videoId}/thumbnail.jpg`);
      } else {
        // Use local storage URLs
        hlsUrl = `${config.baseUrl}/uploads/${videoId}/playlist.m3u8`;
        thumbnailUrl = `${config.baseUrl}/uploads/${videoId}/thumbnail.jpg`;
      }

      await VideoModel.findByIdAndUpdate(videoId, {
        status: 'ready',
        hlsUrl,
        thumbnailUrl,
        quality: this.qualities.map(q => q.resolution)
      });

      // Clean up temporary files
      await this.cleanupTempFiles(tempOutputDir);
    } catch (error) {
      console.error('Video processing failed:', error)
      await VideoModel.findByIdAndUpdate(videoId, {
        status: 'failed'
      })
      throw error
    } finally {
      // Clean up input file
      await fs.unlink(inputPath).catch(console.error)
    }
  }

  private async generateThumbnail(
    inputPath: string,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          count: 1,
          folder: path.dirname(outputPath),
          filename: path.basename(outputPath),
          size: '1280x720'
        })
        .on('end', resolve)
        .on('error', reject)
    })
  }

  private async createHLSStream(
    inputPath: string,
    outputDir: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)

      // Add an output for each quality level
      this.qualities.forEach(({ height, bitrate }) => {
        command
          .output(`${outputDir}/${height}p.m3u8`)
          .outputOptions([
            '-c:v libx264',
            '-crf 22',
            '-c:a aac',
            `-vf scale=-2:${height}`,
            `-b:v ${bitrate}`,
            '-hls_time 10',
            '-hls_list_size 0',
            '-hls_segment_filename',
            `${outputDir}/${height}p_%03d.ts`,
            '-f hls'
          ])
      })

      // Create master playlist
      const masterPlaylist = this.generateMasterPlaylist()
      fs.writeFile(
        path.join(outputDir, 'playlist.m3u8'),
        masterPlaylist
      ).catch(console.error)

      command
        .on('end', resolve)
        .on('error', reject)
        .run()
    })
  }

  private generateMasterPlaylist(): string {
    let playlist = '#EXTM3U\n#EXT-X-VERSION:3\n'
    
    this.qualities.forEach(({ resolution, height }) => {
      playlist += `#EXT-X-STREAM-INF:RESOLUTION=${resolution},NAME=${resolution}\n`
      playlist += `${height}p.m3u8\n`
    })

    return playlist
  }

  /**
   * Upload processed video files to storage (local or DigitalOcean Spaces)
   */
  private async uploadProcessedFiles(tempDir: string, videoId: string): Promise<void> {
    // Get all files in the temp directory
    const files = await fs.readdir(tempDir);
    
    // Upload each file
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        // Determine content type based on file extension
        const ext = path.extname(file).toLowerCase();
        let contentType = 'application/octet-stream';
        
        if (ext === '.m3u8') {
          contentType = 'application/vnd.apple.mpegurl';
        } else if (ext === '.ts') {
          contentType = 'video/mp2t';
        } else if (ext === '.jpg' || ext === '.jpeg') {
          contentType = 'image/jpeg';
        } else if (ext === '.png') {
          contentType = 'image/png';
        }
        
        // Determine appropriate destination path
        let destinationPath: string;
        
        if (file === 'thumbnail.jpg') {
          // Store thumbnails in the thumbnails directory
          destinationPath = `thumbnails/${videoId}/thumbnail.jpg`;
        } else {
          // Store video files in the videos directory
          destinationPath = `videos/${videoId}/${file}`;
        }
        
        // Upload to storage
        await this.storageService.uploadFile(
          filePath,
          destinationPath,
          {
            contentType,
            isPublic: true
          }
        );
      }
    }
  }

  /**
   * Clean up temporary files after processing
   */
  private async cleanupTempFiles(tempDir: string): Promise<void> {
    try {
      // Recursively delete the temp directory
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up temp files:', error);
    }
  }

  /**
   * Delete all files related to a video from storage
   * @param videoId The ID of the video to delete
   */
  async deleteVideoFiles(videoId: string): Promise<void> {
    try {
      console.log(`Deleting all files for video: ${videoId}`);
      
      // Delete thumbnail directory
      console.log(`Deleting thumbnail directory for video: ${videoId}`);
      try {
        await this.storageService.deleteDirectory(`thumbnails/${videoId}`);
      } catch (error) {
        console.error(`Error deleting thumbnail directory: thumbnails/${videoId}`, error);
      }
      
      // Delete videos directory
      console.log(`Deleting videos directory for video: ${videoId}`);
      try {
        await this.storageService.deleteDirectory(`videos/${videoId}`);
      } catch (error) {
        console.error(`Error deleting videos directory: videos/${videoId}`, error);
      }
      
      console.log(`Successfully deleted all files for video: ${videoId}`);
    } catch (error) {
      console.error(`Error deleting video files for ${videoId}:`, error);
      throw error;
    }
  }
} 