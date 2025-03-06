import express, { RequestHandler, Request, Response } from 'express'
import * as adminController from '../controllers/admin.controller'
import VideoReport from '../../video/models/report.model'
import { VideoModel } from '../../video/models/video.model'
import { authMiddleware, adminMiddleware, moderatorMiddleware, AuthRequest } from '../../../middleware/auth'
import { VideoProcessingService } from '../../video/services/video-processing.service'

const router = express.Router()

// Add a helper function to ensure user is authenticated
function ensureAuthenticated(req: Request, res: Response): string | false {
  const authReq = req as AuthRequest;
  if (!authReq.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return authReq.user.id;
}

// Dashboard Statistics - Admin only
router.get('/stats', authMiddleware, adminMiddleware, adminController.getDashboardStats)

// User Management - Admin only
router.get('/users', authMiddleware, adminMiddleware, adminController.getAllUsers)
router.get('/users/:userId', authMiddleware, adminMiddleware, adminController.getUserById)
router.post('/users', authMiddleware, adminMiddleware, adminController.createUser)
router.patch('/users/:userId/role', authMiddleware, adminMiddleware, adminController.updateUserRole)
router.delete('/users/:userId', authMiddleware, adminMiddleware, adminController.deleteUser)

// Video Moderation - Admin and Moderator
router.get('/videos', authMiddleware, moderatorMiddleware, adminController.getAllVideos)
router.patch('/videos/:videoId/hide', authMiddleware, moderatorMiddleware, adminController.hideVideo)
router.patch('/videos/:videoId/approve', authMiddleware, moderatorMiddleware, adminController.approveVideo)
router.patch('/videos/:videoId/reject', authMiddleware, moderatorMiddleware, adminController.rejectVideo)
router.delete('/videos/:videoId', authMiddleware, adminMiddleware, adminController.deleteVideo) // Admin only

// Comment Moderation - Admin and Moderator
router.get('/comments', authMiddleware, moderatorMiddleware, adminController.getAllComments)
router.patch('/comments/:commentId/hide', authMiddleware, moderatorMiddleware, adminController.hideComment)
router.patch('/comments/:commentId/approve', authMiddleware, moderatorMiddleware, adminController.approveComment)
router.patch('/comments/:commentId/reject', authMiddleware, moderatorMiddleware, adminController.rejectComment)
router.delete('/comments/:commentId', authMiddleware, adminMiddleware, adminController.deleteComment) // Admin only

// Video Report Management - Admin and Moderator only
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

      // Log the action instead of notification
      console.log(`Video ${report.videoId} has been hidden by moderator ${userId}. Admin review required.`)
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
      const videoProcessingService = new VideoProcessingService();
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

// Add route handlers
router.get('/reports/videos', authMiddleware, moderatorMiddleware, getAllReportsHandler)
router.patch('/reports/videos/:reportId/review', authMiddleware, moderatorMiddleware, reviewReportHandler)
router.delete('/videos/:videoId/permanent', authMiddleware, adminMiddleware, permanentlyDeleteVideoHandler)

export default router 