import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffprobeStatic from 'ffprobe-static'
import { promises as fs } from 'fs'
import path from 'path'
import { VideoModel } from '../models/video.model'
import { config } from '../../../config/environment'

ffmpeg.setFfmpegPath(ffmpegInstaller.path)
ffmpeg.setFfprobePath(ffprobeStatic.path)

export class VideoProcessingService {
  private readonly qualities = [
    { resolution: '1080p', height: 1080, bitrate: '4000k' },
    { resolution: '720p', height: 720, bitrate: '2500k' },
    { resolution: '480p', height: 480, bitrate: '1000k' },
    { resolution: '360p', height: 360, bitrate: '600k' }
  ]

  async processVideo(
    inputPath: string,
    outputDir: string,
    videoId: string
  ): Promise<void> {
    try {
      // Create output directory if it doesn't exist
      await fs.mkdir(outputDir, { recursive: true })

      // Generate thumbnail
      const thumbnailPath = path.join(outputDir, 'thumbnail.jpg')
      await this.generateThumbnail(inputPath, thumbnailPath)

      // Create HLS manifest and segments
      await this.createHLSStream(inputPath, outputDir)

      // Update video record with paths
      await VideoModel.findByIdAndUpdate(videoId, {
        status: 'ready',
        hlsUrl: `${config.baseUrl}/uploads/${videoId}/playlist.m3u8`,
        thumbnailUrl: `${config.baseUrl}/uploads/${videoId}/thumbnail.jpg`,
        quality: this.qualities.map(q => q.resolution)
      })
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
} 