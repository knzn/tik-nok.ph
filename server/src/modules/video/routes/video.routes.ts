import { Router, Request, Response, RequestHandler, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import { promises as fs } from 'fs'
import { VideoController } from '../controllers/video.controller'
import { VideoProcessingService } from '../services/video-processing.service'
import { authMiddleware, adminMiddleware, moderatorMiddleware, AuthRequest } from '../../../middleware/auth'
import { VideoModel } from '../models/video.model'
import { CommentModel } from '../models/comment.model'
import { Types, Document } from 'mongoose'
import { LikeModel } from '../models/like.model'
import { SocketService } from '../../../services/socket.service'
import VideoReport from '../models/report.model'

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

// Update the typedAuthMiddleware to use the correct AuthRequest type
const typedAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  authMiddleware(req as AuthRequest, res, next)
}

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

// Add this function to verify user is authenticated before executing handlers
function ensureAuthenticated(req: Request, res: Response): string | false {
  const authReq = req as AuthRequest;
  if (!authReq.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return authReq.user.id;
}

// Comment handlers with proper typing
const addCommentHandler: RequestHandler = async (req, res, next) => {
  try {
    const { videoId } = req.params
    const { content } = req.body
    
    const userId = ensureAuthenticated(req, res);
    if (!userId) return;

    const comment = await CommentModel.create({
      content,
      videoId,
      userId,
      parentId: null
    })

    await comment.populate('userId', 'username profilePicture')
    
    // Emit real-time update
    SocketService.notifyNewComment(videoId, comment)
    
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
    
    const userId = ensureAuthenticated(req, res);
    if (!userId) return;

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
    
    // Emit real-time update
    SocketService.broadcastGlobal('comment:delete', commentId)
    
    res.status(200).json({ message: 'Comment deleted successfully' })
  } catch (error) {
    next(error)
  }
}

const updateCommentHandler: RequestHandler = async (req, res, next) => {
  try {
    const { videoId, commentId } = req.params
    const { content } = req.body
    
    const userId = ensureAuthenticated(req, res);
    if (!userId) return;

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

    // Type guard to check if userId is populated
    if (!('username' in updatedComment.userId)) {
      throw new Error('Failed to populate user data')
    }

    // Format the response to match the frontend Comment type
    const formattedComment = {
      _id: updatedComment._id.toString(),
      content: updatedComment.content,
      user: {
        _id: updatedComment.userId._id.toString(),
        username: updatedComment.userId.username,
        profilePicture: updatedComment.userId.profilePicture
      },
      videoId: updatedComment.videoId.toString(),
      createdAt: updatedComment.createdAt.toISOString()
    }
    
    // Emit real-time update
    SocketService.broadcastGlobal('comment:update', formattedComment)
    
    res.status(200).json(formattedComment)
  } catch (error) {
    next(error)
  }
}

// Create a wrapper for the video controller to handle type differences
const wrapControllerMethod = (handler: (req: any, res: Response) => Promise<void>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get the authenticated user ID
      const userId = ensureAuthenticated(req, res);
      if (!userId) return;
      
      // Create a compatible request object with the structure expected by the controller
      const compatibleReq = {
        ...req,
        user: {
          id: userId,
          email: (req as AuthRequest).user?.email || '',
          username: (req as AuthRequest).user?.username || '',
          // Don't include profilePicture as it's not in the middleware AuthRequest
          profilePicture: undefined
        }
      };
      
      await handler(compatibleReq, res);
    } catch (error) {
      next(error);
    }
  };
};

// Update the uploadHandler to use the wrapper
const uploadHandler: RequestHandler = wrapControllerMethod(videoController.upload);

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
router.get('/:id/status', videoController.checkVideoStatus as RequestHandler)
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
    
    const userId = ensureAuthenticated(req, res);
    if (!userId) return;

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
    const { title, description, visibility } = req.body
    
    const userId = ensureAuthenticated(req, res);
    if (!userId) return;

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

    // Validate visibility value if provided
    if (visibility && !['public', 'unlisted', 'private'].includes(visibility)) {
      res.status(400).json({ error: 'Invalid visibility value' })
      return
    }

    const updatedVideo = await VideoModel.findByIdAndUpdate(
      videoId,
      { 
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(visibility && { visibility })
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
    
    const userId = ensureAuthenticated(req, res);
    if (!userId) return;

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

    // Add reply to parent comment's replies array
    await CommentModel.findByIdAndUpdate(
      commentId,
      { $push: { replies: reply._id } }
    )

    await reply.populate('userId', 'username profilePicture')
    
    // Emit real-time update
    SocketService.notifyNewComment(videoId, reply)
    
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
    
    const userId = ensureAuthenticated(req, res);
    if (!userId) return;
    
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

// Define report handlers
const reportVideoHandler: RequestHandler = async (req, res, next) => {
  try {
    const { videoId } = req.params
    const { reason, details } = req.body
    
    const userId = ensureAuthenticated(req, res);
    if (!userId) return;

    // Check if the video exists
    const video = await VideoModel.findById(videoId)
    if (!video) {
      res.status(404).json({ message: 'Video not found' })
      return
    }

    // Create a new report
    const report = await VideoReport.create({
      videoId,
      reporterId: userId,
      reason,
      details
    })

    // Since we don't have the notification service, we'll just log this
    console.log(`Video ${videoId} reported by user ${userId} for reason: ${reason}`)
    
    res.status(201).json({
      message: 'Video reported successfully',
      reportId: report._id
    })
  } catch (error) {
    next(error)
  }
}

const getAllReportsHandler: RequestHandler = async (req, res, next) => {
  try {
    const reports = await VideoReport.find()
      .populate('videoId', 'title thumbnailUrl userId')
      .populate('reporterId', 'username displayName profilePicture')
      .populate('videoId.userId', 'username displayName profilePicture')
      .populate('reviewedBy', 'username displayName profilePicture')
      .sort({ createdAt: -1 })

    res.status(200).json(reports)
  } catch (error) {
    next(error)
  }
}

const reviewReportHandler: RequestHandler = async (req, res, next) => {
  try {
    const { reportId } = req.params
    const { action, reason } = req.body
    
    const userId = ensureAuthenticated(req, res);
    if (!userId) return;

    const report = await VideoReport.findById(reportId)
    if (!report) {
      res.status(404).json({ message: 'Report not found' })
      return
    }

    // Update report status
    report.status = 'reviewed'
    report.reviewedBy = userId

    // Process based on action
    if (action === 'hide') {
      // Hide the video
      await VideoModel.findByIdAndUpdate(report.videoId, { 
        isHidden: true,
        moderationStatus: 'rejected',
        moderationReason: reason || 'Reported content violation'
      })

      // We're relying on the middleware to check roles now
      // Just log the action
      console.log(`Video ${report.videoId} has been hidden due to a report. Reporter: ${report.reporterId}, Reviewer: ${userId}`)
    } else if (action === 'dismiss') {
      report.status = 'dismissed'
    }

    await report.save()

    res.status(200).json({
      message: 'Report reviewed successfully',
      status: report.status,
      action
    })
  } catch (error) {
    next(error)
  }
}

const permanentlyDeleteVideoHandler: RequestHandler = async (req, res, next) => {
  try {
    const { videoId } = req.params
    
    const userId = ensureAuthenticated(req, res);
    if (!userId) return;
    
    // Check if video exists
    const video = await VideoModel.findById(videoId)
    if (!video) {
      res.status(404).json({ message: 'Video not found' })
      return
    }

    // First, delete all files from storage
    try {
      await videoProcessingService.deleteVideoFiles(videoId);
      console.log(`Successfully deleted files for video ${videoId} from storage`);
    } catch (error) {
      console.error(`Error deleting files for video ${videoId}:`, error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete the video permanently from the database
    await VideoModel.findByIdAndDelete(videoId)

    // Update related reports
    await VideoReport.updateMany(
      { videoId, status: 'pending' },
      { status: 'reviewed', reviewedBy: userId }
    )

    res.status(200).json({ message: 'Video permanently deleted' })
  } catch (error) {
    next(error)
  }
}

// Report routes - replace the old ones with these
router.post('/:videoId/report', typedAuthMiddleware, reportVideoHandler)
router.get('/reports', authMiddleware, moderatorMiddleware, getAllReportsHandler)
router.patch('/reports/:reportId/review', authMiddleware, moderatorMiddleware, reviewReportHandler)
router.delete('/:videoId/permanent', authMiddleware, adminMiddleware, permanentlyDeleteVideoHandler)

export default router 