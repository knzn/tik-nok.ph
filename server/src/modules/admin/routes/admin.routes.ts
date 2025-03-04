import express from 'express'
import * as adminController from '../controllers/admin.controller'
import { authMiddleware, adminMiddleware, moderatorMiddleware } from '../../../middleware/auth'

const router = express.Router()

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

export default router 