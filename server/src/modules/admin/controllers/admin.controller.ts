import { Request, Response } from 'express'
import { UserModel } from '../../user/models/user.model'
import { VideoModel } from '../../../models/video.model'
import { CommentModel } from '../../video/models/comment.model'
import { AuthRequest } from '../../../middleware/auth'
import mongoose from 'mongoose'

// User Management
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await UserModel.find().select('-password').lean()
    res.status(200).json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
}

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ error: 'Invalid user ID' })
      return
    }
    
    const user = await UserModel.findById(userId).select('-password').lean()
    
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    
    res.status(200).json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
}

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, username, password, displayName, role } = req.body
    
    // Check if user already exists
    const existingUser = await UserModel.findOne({ 
      $or: [{ email }, { username }] 
    })
    
    if (existingUser) {
      res.status(400).json({ 
        error: 'User with this email or username already exists' 
      })
      return
    }
    
    // Create new user
    const newUser = new UserModel({
      email,
      username,
      password, // Note: In a real app, you should hash this password
      displayName,
      role: role || 'USER'
    })
    
    await newUser.save()
    
    // Return user without password
    const userResponse = newUser.toObject() as any
    delete userResponse.password
    
    res.status(201).json(userResponse)
  } catch (error) {
    console.error('Error creating user:', error)
    res.status(500).json({ error: 'Failed to create user' })
  }
}

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const { role } = req.body
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ error: 'Invalid user ID' })
      return
    }
    
    if (!['USER', 'MODERATOR', 'ADMIN'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' })
      return
    }
    
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select('-password')
    
    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    
    res.status(200).json(updatedUser)
  } catch (error) {
    console.error('Error updating user role:', error)
    res.status(500).json({ error: 'Failed to update user role' })
  }
}

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ error: 'Invalid user ID' })
      return
    }
    
    // Find the user first to make sure it exists
    const user = await UserModel.findById(userId)
    
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    
    // Delete the user
    await UserModel.findByIdAndDelete(userId)
    
    // Return success message
    res.status(200).json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ error: 'Failed to delete user' })
  }
}

// Video Moderation
export const getAllVideos = async (req: Request, res: Response) => {
  try {
    const videos = await VideoModel.find()
      .populate('userId', 'username displayName profilePicture')
      .sort({ createdAt: -1 })
      .lean()
    
    res.status(200).json(videos)
  } catch (error) {
    console.error('Error fetching videos:', error)
    res.status(500).json({ error: 'Failed to fetch videos' })
  }
}

export const hideVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params
    const { reason } = req.body
    
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      res.status(400).json({ error: 'Invalid video ID' })
      return
    }
    
    const video = await VideoModel.findByIdAndUpdate(
      videoId,
      { 
        isHidden: true,
        moderationStatus: 'pending',
        moderationReason: reason || 'Content under review',
        moderatedBy: req.user?.id
      },
      { new: true }
    )
    
    if (!video) {
      res.status(404).json({ error: 'Video not found' })
      return
    }
    
    res.status(200).json(video)
  } catch (error) {
    console.error('Error hiding video:', error)
    res.status(500).json({ error: 'Failed to hide video' })
  }
}

export const approveVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params
    
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      res.status(400).json({ error: 'Invalid video ID' })
      return
    }
    
    const video = await VideoModel.findByIdAndUpdate(
      videoId,
      { 
        isHidden: false,
        moderationStatus: 'approved',
        moderatedBy: req.user?.id,
        moderationReason: null
      },
      { new: true }
    )
    
    if (!video) {
      res.status(404).json({ error: 'Video not found' })
      return
    }
    
    res.status(200).json(video)
  } catch (error) {
    console.error('Error approving video:', error)
    res.status(500).json({ error: 'Failed to approve video' })
  }
}

export const rejectVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params
    const { reason } = req.body
    
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      res.status(400).json({ error: 'Invalid video ID' })
      return
    }
    
    if (!reason) {
      res.status(400).json({ error: 'Rejection reason is required' })
      return
    }
    
    const video = await VideoModel.findByIdAndUpdate(
      videoId,
      { 
        isHidden: true,
        moderationStatus: 'rejected',
        moderationReason: reason,
        moderatedBy: req.user?.id
      },
      { new: true }
    )
    
    if (!video) {
      res.status(404).json({ error: 'Video not found' })
      return
    }
    
    res.status(200).json(video)
  } catch (error) {
    console.error('Error rejecting video:', error)
    res.status(500).json({ error: 'Failed to reject video' })
  }
}

export const deleteVideo = async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params
    
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      res.status(400).json({ error: 'Invalid video ID' })
      return
    }
    
    const video = await VideoModel.findByIdAndDelete(videoId)
    
    if (!video) {
      res.status(404).json({ error: 'Video not found' })
      return
    }
    
    // Delete all comments associated with this video
    await CommentModel.deleteMany({ videoId })
    
    res.status(200).json({ message: 'Video deleted successfully' })
  } catch (error) {
    console.error('Error deleting video:', error)
    res.status(500).json({ error: 'Failed to delete video' })
  }
}

// Comment Moderation
export const getAllComments = async (req: Request, res: Response) => {
  try {
    const comments = await CommentModel.find()
      .populate('userId', 'username displayName profilePicture')
      .populate('videoId', 'title thumbnailUrl')
      .sort({ createdAt: -1 })
      .lean()
    
    res.status(200).json(comments)
  } catch (error) {
    console.error('Error fetching comments:', error)
    res.status(500).json({ error: 'Failed to fetch comments' })
  }
}

export const hideComment = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params
    const { reason } = req.body
    
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      res.status(400).json({ error: 'Invalid comment ID' })
      return
    }
    
    const comment = await CommentModel.findByIdAndUpdate(
      commentId,
      { 
        isHidden: true,
        moderationStatus: 'pending',
        moderationReason: reason || 'Content under review',
        moderatedBy: req.user?.id
      },
      { new: true }
    )
    
    if (!comment) {
      res.status(404).json({ error: 'Comment not found' })
      return
    }
    
    res.status(200).json(comment)
  } catch (error) {
    console.error('Error hiding comment:', error)
    res.status(500).json({ error: 'Failed to hide comment' })
  }
}

export const approveComment = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params
    
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      res.status(400).json({ error: 'Invalid comment ID' })
      return
    }
    
    const comment = await CommentModel.findByIdAndUpdate(
      commentId,
      { 
        isHidden: false,
        moderationStatus: 'approved',
        moderatedBy: req.user?.id,
        moderationReason: null
      },
      { new: true }
    )
    
    if (!comment) {
      res.status(404).json({ error: 'Comment not found' })
      return
    }
    
    res.status(200).json(comment)
  } catch (error) {
    console.error('Error approving comment:', error)
    res.status(500).json({ error: 'Failed to approve comment' })
  }
}

export const rejectComment = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params
    const { reason } = req.body
    
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      res.status(400).json({ error: 'Invalid comment ID' })
      return
    }
    
    if (!reason) {
      res.status(400).json({ error: 'Rejection reason is required' })
      return
    }
    
    const comment = await CommentModel.findByIdAndUpdate(
      commentId,
      { 
        isHidden: true,
        moderationStatus: 'rejected',
        moderationReason: reason,
        moderatedBy: req.user?.id
      },
      { new: true }
    )
    
    if (!comment) {
      res.status(404).json({ error: 'Comment not found' })
      return
    }
    
    res.status(200).json(comment)
  } catch (error) {
    console.error('Error rejecting comment:', error)
    res.status(500).json({ error: 'Failed to reject comment' })
  }
}

export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params
    
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      res.status(400).json({ error: 'Invalid comment ID' })
      return
    }
    
    const comment = await CommentModel.findByIdAndDelete(commentId)
    
    if (!comment) {
      res.status(404).json({ error: 'Comment not found' })
      return
    }
    
    // If this is a parent comment, delete all replies
    if (!comment.parentId) {
      await CommentModel.deleteMany({ parentId: commentId })
    }
    
    res.status(200).json({ message: 'Comment deleted successfully' })
  } catch (error) {
    console.error('Error deleting comment:', error)
    res.status(500).json({ error: 'Failed to delete comment' })
  }
}

// Dashboard Statistics
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await UserModel.countDocuments()
    const totalVideos = await VideoModel.countDocuments()
    const totalComments = await CommentModel.countDocuments()
    
    const pendingVideos = await VideoModel.countDocuments({ 
      moderationStatus: 'pending' 
    })
    
    const pendingComments = await CommentModel.countDocuments({ 
      moderationStatus: 'pending' 
    })
    
    // Get user roles distribution
    const userRoles = await UserModel.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ])
    
    // Format user roles for easier consumption
    const roleDistribution = userRoles.reduce((acc, curr) => {
      acc[curr._id] = curr.count
      return acc
    }, {})
    
    res.status(200).json({
      totalUsers,
      totalVideos,
      totalComments,
      pendingVideos,
      pendingComments,
      roleDistribution
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' })
  }
} 