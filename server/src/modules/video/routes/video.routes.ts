import { Router, Request, Response, RequestHandler } from 'express'
import multer from 'multer'
import path from 'path'
import { promises as fs } from 'fs'
import { VideoController } from '../controllers/video.controller'
import { VideoProcessingService } from '../services/video-processing.service'
import { authMiddleware } from '../../../middleware/auth'
import { VideoModel } from '../models/video.model'
import { CommentModel } from '../models/comment.model'
import { AuthRequest } from '../../auth/types/auth.types'
import { Types, Document } from 'mongoose'
import { LikeModel } from '../models/like.model'

// Create temp upload directory
const TEMP_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'temp')

// Ensure upload directories exist
async function ensureUploadDirs() {
  try {
    await fs.mkdir(TEMP_UPLOAD_DIR, { recursive: true })
    console.log('Upload directories created')
  } catch (error) {
    console.error('Failed to create upload directories:', error)
  }
}

// Create upload directories when module loads
ensureUploadDirs()

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_UPLOAD_DIR)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
    const ext = path.extname(file.originalname)
    cb(null, `${uniqueSuffix}${ext}`)
  }
})

const upload = multer({
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

const router = Router()
const videoProcessingService = new VideoProcessingService()
const videoController = new VideoController(videoProcessingService)

// Cast auth middleware to RequestHandler
const typedAuthMiddleware = authMiddleware as RequestHandler

// Define the User document structure
interface UserDocument extends Document {
  _id: Types.ObjectId
  username: string
  profilePicture?: string
}

// Define the Comment document structure with populated fields
interface CommentDocument extends Document {
  _id: Types.ObjectId
  content: string
  videoId: Types.ObjectId
  userId: Types.ObjectId | UserDocument // Can be either ID or populated user
  createdAt: Date
  updatedAt: Date
}

// Comment handlers with proper typing
const addCommentHandler: RequestHandler = async (req, res, next) => {
  try {
    const { videoId } = req.params
    const { content } = req.body
    const authReq = req as AuthRequest
    const userId = authReq.user.id

    const video = await VideoModel.findById(videoId)
    if (!video) {
      res.status(404).json({ error: 'Video not found' })
      return
    }

    const comment = await CommentModel.create({
      content,
      videoId,
      userId
    })

    await comment.populate('userId', 'username profilePicture')
    res.status(201).json(comment)
  } catch (error) {
    next(error)
  }
}

const getCommentsHandler: RequestHandler = async (req, res, next) => {
  try {
    const { videoId } = req.params
    
    const comments = await CommentModel.find({ 
      videoId,
      parentId: null // Get only top-level comments
    })
    .populate('userId', 'username profilePicture')
    .populate({
      path: 'replies',
      populate: {
        path: 'userId',
        select: 'username profilePicture'
      }
    })
    .sort({ createdAt: -1 })
    .limit(100)

    res.json(comments)
  } catch (error) {
    next(error)
  }
}

const deleteCommentHandler: RequestHandler = async (req, res, next) => {
  try {
    const { videoId, commentId } = req.params
    const userId = (req as AuthRequest).user.id

    const comment = await CommentModel.findById(commentId)
    if (!comment) {
      res.status(404).json({ error: 'Comment not found' })
      return
    }

    // Check if user owns the comment
    if (comment.userId.toString() !== userId) {
      res.status(403).json({ error: 'Not authorized to delete this comment' })
      return
    }

    await CommentModel.findByIdAndDelete(commentId)
    res.status(200).json({ message: 'Comment deleted successfully' })
  } catch (error) {
    next(error)
  }
}

const updateCommentHandler: RequestHandler = async (req, res, next) => {
  try {
    const { videoId, commentId } = req.params
    const { content } = req.body
    const userId = (req as AuthRequest).user.id

    const comment = await CommentModel.findById(commentId)
    if (!comment) {
      res.status(404).json({ error: 'Comment not found' })
      return
    }

    // Check if user owns the comment
    if (comment.userId.toString() !== userId) {
      res.status(403).json({ error: 'Not authorized to update this comment' })
      return
    }

    const updatedComment = await CommentModel.findByIdAndUpdate(
      commentId,
      { content },
      { new: true }
    ).populate<{ userId: UserDocument }>('userId', 'username profilePicture')

    if (!updatedComment) {
      res.status(404).json({ error: 'Comment not found after update' })
      return
    }

    // Ensure userId is populated
    if (!('username' in updatedComment.userId)) {
      res.status(500).json({ error: 'Failed to populate user data' })
      return
    }

    // Format the response to match the frontend Comment type
    const response = {
      _id: updatedComment._id.toString(),
      content: updatedComment.content,
      userId: {
        _id: updatedComment.userId._id.toString(),
        username: updatedComment.userId.username,
        profilePicture: updatedComment.userId.profilePicture
      },
      createdAt: updatedComment.createdAt.toISOString()
    }

    res.status(200).json(response)
  } catch (error) {
    next(error)
  }
}

// Cast controller methods to RequestHandler
const uploadHandler: RequestHandler = async (req, res, next) => {
  try {
    await videoController.upload(req as AuthRequest, res)
  } catch (error) {
    console.error('Upload error:', error)
    next(error)
  }
}

// Add logging middleware
router.use((req, res, next) => {
  console.log('Video route hit:', req.method, req.url)
  next()
})

// Define all handlers at the top of the file
const getTopVideosHandler: RequestHandler = async (req, res, next) => {
  try {
    const { type } = req.params
    console.log('Getting top videos for type:', type)
    
    if (!['liked', 'viewed', 'commented'].includes(type)) {
      console.log('Invalid type:', type)
      res.status(400).json({ error: 'Invalid type parameter' })
      return
    }
    
    await videoController.getTopVideos(req, res)
  } catch (error) {
    console.error('Error in getTopVideosHandler:', error)
    next(error)
  }
}

// Make sure routes are in the correct order
router.get('/top/:type', getTopVideosHandler)  // This must come before /:id
router.get('/:id', videoController.getVideo as RequestHandler)
router.get('/', videoController.getVideos as RequestHandler)

// Upload route
router.post('/upload', typedAuthMiddleware, upload.single('video'), uploadHandler)

// Comment routes
router.post('/:videoId/comments', typedAuthMiddleware, addCommentHandler)
router.get('/:videoId/comments', getCommentsHandler)
router.delete('/:videoId/comments/:commentId', typedAuthMiddleware, deleteCommentHandler)
router.patch('/:videoId/comments/:commentId', typedAuthMiddleware, updateCommentHandler)

// Create typed handlers for delete and update
const deleteVideoHandler: RequestHandler = async (req, res, next) => {
  try {
    const { videoId } = req.params
    const userId = (req as AuthRequest).user.id

    const video = await VideoModel.findById(videoId)
    if (!video) {
      res.status(404).json({ error: 'Video not found' })
      return
    }

    // Check if user owns the video
    if (video.userId.toString() !== userId) {
      res.status(403).json({ error: 'Not authorized to delete this video' })
      return
    }

    await VideoModel.findByIdAndDelete(videoId)
    res.status(200).json({ message: 'Video deleted successfully' })
  } catch (error) {
    next(error)
  }
}

const updateVideoHandler: RequestHandler = async (req, res, next) => {
  try {
    const { videoId } = req.params
    const { title, description } = req.body
    const userId = (req as AuthRequest).user.id

    const video = await VideoModel.findById(videoId)
    if (!video) {
      res.status(404).json({ error: 'Video not found' })
      return
    }

    // Check if user owns the video
    if (video.userId.toString() !== userId) {
      res.status(403).json({ error: 'Not authorized to update this video' })
      return
    }

    const updatedVideo = await VideoModel.findByIdAndUpdate(
      videoId,
      { 
        ...(title && { title }),
        ...(description !== undefined && { description })
      },
      { new: true }
    ).populate('userId', 'username profilePicture')

    res.status(200).json(updatedVideo)
  } catch (error) {
    next(error)
  }
}

// Routes
router.delete('/:videoId', typedAuthMiddleware, deleteVideoHandler)
router.patch('/:videoId', typedAuthMiddleware, updateVideoHandler)

// Replace the problematic route with this properly typed handler
const addViewHandler: RequestHandler = async (req, res, next) => {
  try {
    const { videoId } = req.params
    const userId = (req as AuthRequest).user?.id

    const video = await VideoModel.findById(videoId)
    if (!video) {
      res.status(404).json({ error: 'Video not found' })
      return
    }

    // Increment views count and get updated document
    const updatedVideo = await VideoModel.findByIdAndUpdate(
      videoId,
      { $inc: { views: 1 } },
      { new: true } // This option returns the updated document
    )

    res.status(200).json({ 
      message: 'View counted successfully',
      views: updatedVideo?.views || 0
    })
  } catch (error) {
    next(error)
  }
}

// Update the route registration
router.post('/:videoId/view', typedAuthMiddleware, addViewHandler)

// Add new route handler for replies
const addReplyHandler: RequestHandler = async (req, res, next) => {
  try {
    const { videoId, commentId } = req.params
    const { content } = req.body
    const authReq = req as AuthRequest
    const userId = authReq.user.id

    const parentComment = await CommentModel.findById(commentId)
    if (!parentComment) {
      res.status(404).json({ error: 'Parent comment not found' })
      return
    }

    const reply = await CommentModel.create({
      content,
      videoId,
      userId,
      parentId: commentId
    })

    await reply.populate('userId', 'username profilePicture')
    
    // Add reply to parent comment's replies array
    await CommentModel.findByIdAndUpdate(
      commentId,
      { $push: { replies: reply._id } }
    )

    res.status(201).json(reply)
  } catch (error) {
    next(error)
  }
}

// Add route for replies
router.post('/:videoId/comments/:commentId/replies', typedAuthMiddleware, addReplyHandler)

// Add these handlers
const toggleLikeHandler: RequestHandler = async (req, res, next) => {
  try {
    const { videoId } = req.params
    const userId = (req as AuthRequest).user.id
    const { type } = req.body // 'like' or 'dislike'

    const video = await VideoModel.findById(videoId)
    if (!video) {
      res.status(404).json({ error: 'Video not found' })
      return
    }

    // Check if user has already liked/disliked
    const existingLike = await LikeModel.findOne({ userId, videoId })

    if (existingLike) {
      if (existingLike.type === type) {
        // If same type, remove the like/dislike
        await LikeModel.deleteOne({ _id: existingLike._id })
        await VideoModel.findByIdAndUpdate(videoId, {
          $inc: { [type === 'like' ? 'likes' : 'dislikes']: -1 }
        })
      } else {
        // If different type, update the type
        existingLike.type = type
        await existingLike.save()
        await VideoModel.findByIdAndUpdate(videoId, {
          $inc: {
            [type === 'like' ? 'likes' : 'dislikes']: 1,
            [type === 'like' ? 'dislikes' : 'likes']: -1
          }
        })
      }
    } else {
      // Create new like/dislike
      await LikeModel.create({ userId, videoId, type })
      await VideoModel.findByIdAndUpdate(videoId, {
        $inc: { [type === 'like' ? 'likes' : 'dislikes']: 1 }
      })
    }

    const updatedVideo = await VideoModel.findById(videoId)
    res.json({
      likes: updatedVideo?.likes || 0,
      dislikes: updatedVideo?.dislikes || 0,
      status: existingLike?.type === type ? null : type
    })
  } catch (error) {
    next(error)
  }
}

// Add the routes
router.post('/:videoId/like', typedAuthMiddleware, toggleLikeHandler)

export default router 