import { Response } from 'express'
import { UserModel } from '../models/user.model'
import { AuthRequest } from '../../auth/middleware/auth.middleware'
import { Request } from 'express'
import { FollowModel } from '../models/follow.model'
import { VideoModel } from '../../video/models/video.model'

export class UserController {
  static async getProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id
      
      const user = await UserModel.findById(userId)
        .select('-password')

      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      const followersCount = await FollowModel.countDocuments({ following: userId })
      const followingCount = await FollowModel.countDocuments({ follower: userId })

      res.json({
        ...user.toJSON(),
        followersCount,
        followingCount
      })
    } catch (error) {
      console.error('Get profile error:', error)
      res.status(500).json({ error: 'Failed to get profile' })
    }
  }

  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id
      const updateData = req.body

      const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        {
          $set: {
            gamefarmName: updateData.gamefarmName,
            address: updateData.address,
            contactNumber: updateData.contactNumber,
            facebookProfile: updateData.facebookProfile
          }
        },
        { new: true }
      ).select('-password')

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' })
      }

      res.json(updatedUser)
    } catch (error) {
      console.error('Update profile error:', error)
      res.status(500).json({ error: 'Failed to update profile' })
    }
  }

  static async updateProfilePicture(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }

      const userId = req.user.id
      const profilePicture = `${process.env.SERVER_URL || 'http://localhost:3000'}/uploads/profiles/${req.file.filename}`

      const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        { $set: { profilePicture } },
        { new: true }
      ).select('-password')

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' })
      }

      res.json(updatedUser)
    } catch (error) {
      console.error('Update profile picture error:', error)
      res.status(500).json({ error: 'Failed to update profile picture' })
    }
  }

  static async updateCoverPhoto(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }

      const userId = req.user.id
      const coverPhoto = `/uploads/profiles/${req.file.filename}`

      const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        { $set: { coverPhoto } },
        { new: true }
      ).select('-password')

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' })
      }

      res.json(updatedUser)
    } catch (error) {
      console.error('Update cover photo error:', error)
      res.status(500).json({ error: 'Failed to update cover photo' })
    }
  }

  static async getPublicProfile(req: Request, res: Response) {
    try {
      const { username } = req.params
      
      const user = await UserModel.findOne({ username })
        .select('-password')

      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      // Check if the profile is private
      if (user.isPrivate) {
        // If the profile is private, only return limited information
        return res.json({
          _id: user._id,
          username: user.username,
          displayName: user.displayName,
          profilePicture: user.profilePicture,
          isPrivate: true
        })
      }

      // For public profiles, return full information
      const followersCount = await FollowModel.countDocuments({ following: user._id })
      const followingCount = await FollowModel.countDocuments({ follower: user._id })

      res.json({
        ...user.toJSON(),
        followersCount,
        followingCount
      })
    } catch (error) {
      console.error('Get public profile error:', error)
      res.status(500).json({ error: 'Failed to get profile' })
    }
  }

  static async followUser(req: AuthRequest, res: Response) {
    try {
      const followerId = req.user.id
      const followingId = req.params.userId

      if (followerId === followingId) {
        return res.status(400).json({ error: 'Cannot follow yourself' })
      }

      const follow = await FollowModel.create({
        follower: followerId,
        following: followingId
      })

      res.status(201).json(follow)
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(400).json({ error: 'Already following this user' })
      } else {
        res.status(500).json({ error: 'Failed to follow user' })
      }
    }
  }

  static async unfollowUser(req: AuthRequest, res: Response) {
    try {
      const followerId = req.user.id
      const followingId = req.params.userId

      await FollowModel.findOneAndDelete({
        follower: followerId,
        following: followingId
      })

      res.status(200).json({ message: 'Unfollowed successfully' })
    } catch (error) {
      res.status(500).json({ error: 'Failed to unfollow user' })
    }
  }

  static async checkFollowStatus(req: AuthRequest, res: Response) {
    try {
      const followerId = req.user.id
      const followingId = req.params.userId

      const follow = await FollowModel.findOne({
        follower: followerId,
        following: followingId
      })

      res.json({ isFollowing: !!follow })
    } catch (error) {
      res.status(500).json({ error: 'Failed to check follow status' })
    }
  }

  static async getFollowingVideos(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 12
      const skip = (page - 1) * limit

      // Get the list of users that the current user follows
      const following = await FollowModel.find({ follower: userId })
        .select('following')
        .lean()

      const followingIds = following.map(follow => follow.following)

      if (followingIds.length === 0) {
        return res.json({
          data: [],
          nextPage: null,
          total: 0
        })
      }

      // Get videos from followed users, grouped by user
      const videos = await VideoModel.find({
        userId: { $in: followingIds },
        visibility: 'public'
      })
      .populate('userId', 'username profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

      // Count total videos for pagination
      const total = await VideoModel.countDocuments({
        userId: { $in: followingIds },
        visibility: 'public'
      })

      // Define interface for user videos
      interface UserVideos {
        user: {
          _id: string;
          username: string;
          profilePicture?: string;
        };
        videos: any[];
      }

      // Group videos by user with proper type annotations
      const videosByUser = videos.reduce<Record<string, UserVideos>>((acc: Record<string, UserVideos>, video: any) => {
        const userId = video.userId._id.toString()
        if (!acc[userId]) {
          acc[userId] = {
            user: video.userId,
            videos: []
          }
        }
        acc[userId].videos.push(video)
        return acc
      }, {})

      // Convert to array format
      const result = Object.values(videosByUser)

      res.json({
        data: result,
        nextPage: page * limit < total ? page + 1 : null,
        total
      })
    } catch (error) {
      console.error('Get following videos error:', error)
      res.status(500).json({ error: 'Failed to get videos from followed users' })
    }
  }
}