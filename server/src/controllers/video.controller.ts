import { VideoProcessingService } from '../services/video-processing.service'
import { Request, Response } from 'express'
import { promises as fs } from 'fs'
import { ObjectId } from 'mongodb'
import { VideoModel } from '../models/video.model'
import { AuthRequest } from '../middleware/auth'
import { QueueService } from '../services/queue.service'

export class VideoController {
  static async uploadVideo(req: AuthRequest, res: Response) {
    let videoId: string | undefined
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No video file provided' })
      }

      console.log('Upload request received:', {
        file: {
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype
        },
        body: req.body
      })

      videoId = new ObjectId().toString()
      
      // Create video document with initial status
      const video = await VideoModel.create({
        _id: videoId,
        title: req.body.title,
        description: req.body.description,
        userId: req.user!.id,
        status: 'processing',
        processingProgress: 0,
        processingStage: 'initializing'
      })

      // Add to processing queue instead of direct processing
      await QueueService.addVideoJob(videoId, req.file.path)

      // Return the video immediately
      res.status(201).json({
        ...video.toJSON(),
        id: video._id
      })
    } catch (error) {
      if (videoId) {
        await VideoModel.findByIdAndUpdate(videoId, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          processingStage: 'failed'
        }).catch(console.error)
      }
      
      console.error('Upload error:', error)
      res.status(500).json({ 
        error: 'Failed to process video',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
} 