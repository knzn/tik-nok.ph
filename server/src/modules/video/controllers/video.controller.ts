import { Request, Response } from 'express'
import { VideoProcessingService } from '../services/video-processing.service'
import { VideoModel } from '../models/video.model'
import { AuthRequest } from '../../auth/types/auth.types'
import { Document } from 'mongoose'
import multer from 'multer'
import path from 'path'
import { CommentModel } from '../models/comment.model'
import { FollowModel } from '../../user/models/follow.model'

interface UserDocument extends Document {
  _id: string;
  username: string;
  profilePicture?: string;
}

interface VideoDocument extends Document {
  userId: UserDocument;
  title: string;
  description?: string;
}

const storage = multer.diskStorage({
  destination: 'uploads/temp',
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`)
  }
})

export const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true)
    } else {
      cb(new Error('Not a video file'))
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
})

export class VideoController {
  constructor(private videoProcessingService: VideoProcessingService) {}

  upload = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      console.log('Upload request:', {
        file: req.file,
        body: req.body,
        user: req.user,
        headers: req.headers
      })

      if (!req.file) {
        res.status(400).json({ error: 'No video file provided' })
        return
      }

      if (!req.user?.id) {
        res.status(401).json({ error: 'Authentication required' })
        return
      }

      const video = await VideoModel.create({
        title: req.body.title,
        description: req.body.description,
        userId: req.user.id,
        status: 'processing'
      })

      // Start processing in background
      this.videoProcessingService.processVideo(
        req.file.path,
        `uploads/${video.id}`,
        video.id
      ).catch(console.error)

      // Return the video with _id as id
      res.status(201).json({
        ...video.toJSON(),
        id: video._id
      })
    } catch (error) {
      console.error('Upload error:', error)
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  getVideo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      
      const video = await VideoModel.findById(id)
        .populate<{ userId: UserDocument }>('userId', 'username profilePicture')

      if (!video) {
        res.status(404).json({ error: 'Video not found' })
        return
      }

      // Get follower count for video owner
      const followersCount = await FollowModel.countDocuments({ 
        following: video.userId._id.toString() 
      })

      // Format response with followers count
      const videoJson = video.toJSON()
      const userJson = video.userId.toJSON()

      const response = {
        ...videoJson,
        userId: {
          ...userJson,
          followersCount
        }
      }

      res.json(response)
    } catch (error) {
      console.error('Get video error:', error)
      res.status(500).json({ error: 'Failed to get video' })
    }
  }

  getVideos = async (req: Request, res: Response): Promise<void> => {
    try {
      const videos = await VideoModel.find()
        .populate('userId', 'username profilePicture')
        .sort({ createdAt: -1 })
      
      res.json(videos)
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  getTopVideos = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type } = req.params
      const limit = 20

      let videos

      switch (type) {
        case 'liked':
          // Get videos with most likes
          videos = await VideoModel.aggregate([
            {
              $lookup: {
                from: 'likes',
                localField: '_id',
                foreignField: 'videoId',
                as: 'likes'
              }
            },
            {
              $addFields: {
                likes: { $size: '$likes' }
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'userDetails'
              }
            },
            { $unwind: '$userDetails' },
            { $sort: { likes: -1 } },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                title: 1,
                description: 1,
                thumbnailUrl: 1,
                hlsUrl: 1,
                views: 1,
                likes: 1,
                createdAt: 1,
                userId: {
                  _id: '$userDetails._id',
                  username: '$userDetails.username',
                  profilePicture: '$userDetails.profilePicture'
                }
              }
            }
          ])
          break

        case 'viewed':
          // Get most viewed videos
          videos = await VideoModel.aggregate([
            {
              $lookup: {
                from: 'likes',
                localField: '_id',
                foreignField: 'videoId',
                as: 'likes'
              }
            },
            {
              $addFields: {
                likes: { $size: '$likes' }
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'userDetails'
              }
            },
            { $unwind: '$userDetails' },
            { $sort: { views: -1 } },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                title: 1,
                description: 1,
                thumbnailUrl: 1,
                hlsUrl: 1,
                views: 1,
                likes: 1,
                createdAt: 1,
                userId: {
                  _id: '$userDetails._id',
                  username: '$userDetails.username',
                  profilePicture: '$userDetails.profilePicture'
                }
              }
            }
          ])
          break

        case 'commented':
          // Get videos with most comments
          videos = await VideoModel.aggregate([
            {
              $lookup: {
                from: 'comments',
                localField: '_id',
                foreignField: 'videoId',
                as: 'comments'
              }
            },
            {
              $addFields: {
                commentsCount: { $size: '$comments' }
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'userDetails'
              }
            },
            { $unwind: '$userDetails' },
            { $sort: { commentsCount: -1 } },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                title: 1,
                description: 1,
                thumbnailUrl: 1,
                hlsUrl: 1,
                views: 1,
                createdAt: 1,
                userId: {
                  _id: '$userDetails._id',
                  username: '$userDetails.username',
                  profilePicture: '$userDetails.profilePicture'
                },
                commentsCount: 1
              }
            }
          ])
          break

        default:
          res.status(400).json({ error: 'Invalid type parameter' })
          return
      }

      // Transform _id to id for frontend consistency
      const transformedVideos = videos.map(video => ({
        ...video,
        id: video._id,
        status: 'ready' as const
      }))

      res.json(transformedVideos)
    } catch (error) {
      console.error('Get top videos error:', error)
      res.status(500).json({ error: 'Failed to get top videos' })
    }
  }

  async addComment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { videoId } = req.params
      const { content } = req.body
      const userId = req.user.id

      const video = await VideoModel.findById(videoId)
      if (!video) {
        return res.status(404).json({ error: 'Video not found' })
      }

      const comment = await CommentModel.create({
        content,
        videoId,
        userId
      })

      await comment.populate('userId', 'username profilePicture')

      return res.status(201).json(comment)
    } catch (error) {
      console.error('Error adding comment:', error)
      return res.status(500).json({ error: 'Failed to add comment' })
    }
  }

  async getComments(req: Request, res: Response): Promise<Response> {
    try {
      const { videoId } = req.params
      
      const comments = await CommentModel.find({ videoId })
        .populate('userId', 'username profilePicture')
        .sort({ createdAt: -1 })
        .limit(100)

      return res.json(comments)
    } catch (error) {
      console.error('Error fetching comments:', error)
      return res.status(500).json({ error: 'Failed to fetch comments' })
    }
  }

  async deleteComment(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { videoId, commentId } = req.params
      const userId = req.user.id

      const comment = await CommentModel.findById(commentId)
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' })
      }

      // Check if user owns the comment
      if (comment.userId.toString() !== userId) {
        return res.status(403).json({ error: 'Not authorized to delete this comment' })
      }

      await CommentModel.findByIdAndDelete(commentId)
      return res.status(200).json({ message: 'Comment deleted successfully' })
    } catch (error) {
      console.error('Error deleting comment:', error)
      return res.status(500).json({ error: 'Failed to delete comment' })
    }
  }

  async addView(req: AuthRequest, res: Response) {
    try {
      const { videoId } = req.params
      const userId = req.user?.id // Optional - can be used to prevent duplicate views

      const video = await VideoModel.findById(videoId)
      if (!video) {
        return res.status(404).json({ error: 'Video not found' })
      }

      // Increment views count
      await VideoModel.findByIdAndUpdate(videoId, {
        $inc: { views: 1 }
      })

      res.status(200).json({ message: 'View counted successfully' })
    } catch (error) {
      console.error('Add view error:', error)
      res.status(500).json({ error: 'Failed to add view' })
    }
  }
} 