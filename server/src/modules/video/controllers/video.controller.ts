import { Request, Response } from 'express'
import { VideoProcessingService } from '../services/video-processing.service'
import { VideoModel } from '../models/video.model'
import { AuthRequest } from '../../auth/types/auth.types'
import { Document } from 'mongoose'
import multer from 'multer'
import path from 'path'
import { CommentModel } from '../models/comment.model'
import { FollowModel } from '../../user/models/follow.model'
import jwt from 'jsonwebtoken'
import { config } from '../../../config/environment'

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
        status: 'processing',
        visibility: req.body.visibility || 'public'
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
      const userId = (req as AuthRequest).user?.id
      
      console.log('Get video request:', {
        videoId: id,
        userId: userId,
        authHeader: req.headers.authorization ? 'Present (hidden for security)' : 'None',
        hasAuthHeader: !!req.headers.authorization,
        userObject: (req as AuthRequest).user ? 'Present' : 'undefined'
      })
      
      // Check if auth header exists but user is undefined (token validation issue)
      if (req.headers.authorization && !userId) {
        console.log('WARNING: Authorization header exists but user is undefined. Possible token validation issue.')
        
        // Try to manually decode the token for debugging
        try {
          const token = req.headers.authorization.split(' ')[1]
          console.log('Token:', token ? `${token.substring(0, 10)}... (length: ${token.length})` : 'no token')
          
          // Don't verify signature, just decode for debugging
          const decoded = jwt.decode(token)
          if (decoded && typeof decoded === 'object' && decoded.id) {
            // Temporarily set the user ID for this request
            (req as AuthRequest).user = {
              id: decoded.id,
              email: decoded.email || '',
              username: decoded.username || ''
            }
          }
        } catch (tokenError) {
          console.error('Error decoding token:', tokenError)
        }
      }
      
      // Re-check userId after potential fallback
      const effectiveUserId = (req as AuthRequest).user?.id;
      
      const video = await VideoModel.findById(id)
        .populate<{ userId: UserDocument }>('userId', 'username profilePicture')

      if (!video) {
        console.log('Video not found:', id)
        res.status(404).json({ error: 'Video not found' })
        return
      }

      // Log the IDs being compared for debugging
      console.log('Video details:', {
        videoId: id,
        videoUserId: video.userId._id,
        videoUserIdString: video.userId._id.toString(),
        requestUserId: effectiveUserId,
        requestUserIdType: typeof effectiveUserId,
        visibility: video.visibility
      })

      // Check visibility permissions
      if (video.visibility === 'private') {
        console.log('Private video access check')
        
        // For private videos, check if the user is authenticated and is the owner
        if (!effectiveUserId) {
          // User is not authenticated
          console.log('Access denied - user not authenticated')
          res.status(403).json({ 
            error: 'Access denied', 
            message: 'This video is private. Please log in to view it.',
            redirectIn: 5 // Redirect in 5 seconds
          })
          return
        }
        
        // Check if the user is the owner of the video - compare string representations of IDs
        const videoOwnerId = video.userId._id.toString()
        
        // Try to match the IDs in different formats
        const isOwner = 
          videoOwnerId === effectiveUserId || 
          videoOwnerId === effectiveUserId?.toString();
        
        if (!isOwner) {
          console.log('Access denied - IDs do not match:', {
            videoOwnerId,
            userId: effectiveUserId,
            videoOwnerIdType: typeof videoOwnerId,
            userIdType: typeof effectiveUserId,
            comparison1: videoOwnerId === effectiveUserId,
            comparison2: videoOwnerId === effectiveUserId?.toString()
          });
          
          res.status(403).json({ 
            error: 'Access denied', 
            message: 'This video is private and can only be viewed by the owner.',
            redirectIn: 5 // Redirect in 5 seconds
          })
          return
        }
        
        console.log('Access granted - user is owner')
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
      const { userId: queryUserId, includePrivate } = req.query;
      const currentUserId = (req as AuthRequest).user?.id;
      
      // Debug authentication
      console.log('Get videos request headers:', {
        hasAuthHeader: !!req.headers.authorization,
        authHeaderStart: req.headers.authorization ? req.headers.authorization.substring(0, 15) + '...' : 'none',
        authHeaderLength: req.headers.authorization ? req.headers.authorization.length : 0
      });
      
      // If we have an auth header but no user, try to manually decode the token
      if (req.headers.authorization && !currentUserId) {
        console.log('WARNING: Authorization header exists but user is undefined. Trying to decode token...');
        try {
          const token = req.headers.authorization.split(' ')[1];
          const decoded = jwt.decode(token);
          console.log('Manual token decode result:', decoded);
          
          if (decoded && typeof decoded === 'object' && decoded.id) {
            console.log('Setting user from decoded token:', decoded.id);
            (req as AuthRequest).user = {
              id: decoded.id,
              email: decoded.email || '',
              username: decoded.username || ''
            };
          }
        } catch (tokenError) {
          console.error('Error decoding token:', tokenError);
        }
      }
      
      // Get the user ID after potential token decoding
      const effectiveUserId = (req as AuthRequest).user?.id;
      
      console.log('Get videos request:', {
        queryUserId: queryUserId || 'none',
        currentUserId: effectiveUserId || 'not authenticated',
        includePrivate: includePrivate === 'true',
        isProfileView: !!queryUserId,
        isOwnProfile: queryUserId === effectiveUserId
      });
      
      // Create filter object based on query parameters
      const filter: any = {};
      
      // Filter by userId if provided
      if (queryUserId) {
        filter.userId = queryUserId;
      }
      
      // Handle visibility restrictions
      if ((queryUserId && queryUserId === effectiveUserId) || 
          (includePrivate === 'true' && queryUserId === effectiveUserId)) {
        // User can see all their own videos
        console.log('User viewing their own profile - showing all videos');
      } else if (queryUserId) {
        // Viewing someone else's profile - show only public videos
        console.log('Viewing another user profile - showing only public videos');
        filter.visibility = 'public';
      } else {
        // Home page or general listing - show only public videos
        console.log('Home page view - showing only public videos');
        filter.visibility = 'public';
      }
      
      console.log('Video filter:', filter);
      
      const videos = await VideoModel.find(filter)
        .populate('userId', 'username profilePicture')
        .sort({ createdAt: -1 });
      
      console.log(`Returning ${videos.length} videos with visibilities:`, {
        public: videos.filter(v => v.visibility === 'public' || !v.visibility).length,
        private: videos.filter(v => v.visibility === 'private').length,
        unlisted: videos.filter(v => v.visibility === 'unlisted').length
      });
      
      res.json(videos);
    } catch (error) {
      console.error('Get videos error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  getTopVideos = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type } = req.params
      const limit = 20
      const currentUserId = (req as AuthRequest).user?.id

      console.log('Getting top videos:', {
        type,
        currentUserId: currentUserId || 'not authenticated'
      })

      // Add visibility filter to only show public videos
      const visibilityMatch = { visibility: 'public' }

      let videos

      switch (type) {
        case 'liked':
          // Get videos with most likes
          videos = await VideoModel.aggregate([
            // First match to filter by visibility
            { $match: visibilityMatch },
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
            // First match to filter by visibility
            { $match: visibilityMatch },
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
            // First match to filter by visibility
            { $match: visibilityMatch },
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
                likes: 1,
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

      console.log(`Returning ${transformedVideos.length} top ${type} videos`)
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