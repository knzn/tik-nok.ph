import mongoose from 'mongoose'
import { promises as fs } from 'fs'
import path from 'path'
import { VideoModel } from '../models/video.model'
import { config } from '../config/environment'

async function cleanupUploads() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri)
    console.log('Connected to MongoDB')

    // Get all videos
    const videos = await VideoModel.find({})
    console.log(`Found ${videos.length} videos to delete`)

    // Delete all video files and their directories
    const directories = [
      'uploads',
      'uploads/temp',
      'public/hls',
      'public/thumbnails',
      'cache/segments'
    ]

    for (const dir of directories) {
      const fullPath = path.resolve(process.cwd(), dir)
      try {
        await fs.rm(fullPath, { recursive: true, force: true })
        await fs.mkdir(fullPath, { recursive: true })
        console.log(`Cleaned directory: ${dir}`)
      } catch (error) {
        console.error(`Error cleaning directory ${dir}:`, error)
      }
    }

    // Delete all video records from database
    await VideoModel.deleteMany({})
    console.log('Deleted all video records from database')

    console.log('Cleanup completed successfully')
  } catch (error) {
    console.error('Cleanup failed:', error)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

cleanupUploads() 