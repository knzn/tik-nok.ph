import { api } from '../lib/api'
import type { Video as VideoType } from '../types/video.types'
import type { Comment, ApiComment } from '../types/comment.types'
import axios from 'axios'

// Move Video interface to a local definition for now to fix the import error
export interface Video {
  id?: string
  _id?: string
  title: string
  description?: string
  url?: string
  hlsUrl: string
  thumbnailUrl?: string
  duration?: number
  userId: {
    _id: string
    username: string
  }
  views?: number
  likes?: number
  comments?: number
  status: 'processing' | 'ready' | 'public' | 'unlisted' | 'private' | 'failed'
  category?: string
  videoType?: string
  tags?: string[]
  quality?: string[]
  visibility?: 'public' | 'unlisted' | 'private'
  createdAt: string
  updatedAt: string
  aspectRatio?: number
}

interface VideoResponse {
  data: Video[]
  nextPage?: number
  total?: number
}

interface VideoUploadResponse {
  _id: string  // MongoDB returns _id
  id?: string
  title: string
  status: 'processing' | 'ready' | 'public' | 'unlisted' | 'private' | 'failed'
  description?: string
  url: string
  hlsUrl: string
  thumbnailUrl?: string
  duration: number
  userId: string
  views: number
  likes: number
  comments: number
  category?: string
  videoType?: string
  tags: string[]
  visibility?: 'public' | 'unlisted' | 'private'
  createdAt: string
  updatedAt: string
  aspectRatio?: number
}

// Helper function to transform API response to frontend model
const transformComment = (comment: ApiComment): Comment => ({
  id: comment._id,
  content: comment.content,
  userId: {
    id: comment.userId._id,
    username: comment.userId.username,
    profilePicture: comment.userId.profilePicture
  },
  createdAt: comment.createdAt,
  replies: comment.replies?.map(transformComment),
  parentId: comment.parentId
})

export const VideoService = {
  async getVideos(params?: { page?: number, limit?: number }): Promise<VideoResponse> {
    const { data } = await api.get<VideoResponse>('/videos', { params })
    return data
  },

  async getVideo(videoId: string): Promise<Video> {
    if (!videoId) {
      throw new Error('Video ID is required')
    }

    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token')
      const userJson = localStorage.getItem('user')
      const user = userJson ? JSON.parse(userJson) : null
      
      console.log('Fetching video:', {
        videoId,
        hasToken: !!token,
        userId: user?.id || 'not logged in',
        tokenFirstChars: token ? token.substring(0, 10) + '...' : 'no token',
        tokenLength: token ? token.length : 0
      })

      // Make request with auth token if available - ensure proper format
      const headers: Record<string, string> = {}
      if (token) {
        // Make sure token is properly formatted with 'Bearer ' prefix
        headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`
        console.log('Using authorization header:', {
          headerType: typeof headers.Authorization,
          headerLength: headers.Authorization.length,
          headerStart: headers.Authorization.substring(0, 15) + '...',
          hasBearer: headers.Authorization.startsWith('Bearer ')
        })
      }

      // Use the api instance which already has the interceptor for auth
      // No need to pass headers manually as the interceptor will handle it
      const response = await api.get<Video>(`/videos/${videoId}`)
      
      console.log('Video fetch response:', {
        videoId: response.data._id || response.data.id,
        userId: response.data.userId?._id || response.data.userId,
        visibility: response.data.visibility,
        status: response.data.status
      })
      
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error('Video fetch error:', {
          status: error.response.status,
          message: error.response.data?.message || error.message,
          videoId
        })
        
        // If it's a 403 Forbidden error for private video, pass through the error
        if (error.response.status === 403) {
          throw error
        }
        
        // Handle 404 Not Found
        if (error.response.status === 404) {
          // Remove from processing videos if it was there
          const processingVideos = JSON.parse(localStorage.getItem('processingVideos') || '[]')
          const updatedProcessingVideos = processingVideos.filter((id: string) => id !== videoId)
          localStorage.setItem('processingVideos', JSON.stringify(updatedProcessingVideos))
          
          // Cache not found status to prevent further requests
          const notFoundVideos = JSON.parse(localStorage.getItem('notFoundVideos') || '[]')
          if (!notFoundVideos.includes(videoId)) {
            notFoundVideos.push(videoId)
            localStorage.setItem('notFoundVideos', JSON.stringify(notFoundVideos))
          }
        }
      }
      throw error
    }
  },

  async uploadVideo(formData: FormData): Promise<Video> {
    try {
      // Server returns the video data directly
      const { data } = await api.post<Video>('/videos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      // Store processing video info
      const processingVideo = {
        id: data._id,
        title: data.title,
        timestamp: new Date().toISOString()
      }

      // Update localStorage with processing video
      const storedVideos = JSON.parse(localStorage.getItem('processingVideos') || '[]')
      localStorage.setItem('processingVideos', JSON.stringify([
        ...storedVideos,
        processingVideo
      ]))

      return data
    } catch (error) {
      console.error('Upload service error:', error)
      throw error
    }
  },

  async pollVideoStatus(videoId: string) {
    if (!videoId) return

    const maxAttempts = 60 // 5 minutes
    let attempts = 0

    const poll = async () => {
      // Check if already known to not exist
      const notFoundCache = localStorage.getItem(`video_not_found_${videoId}`)
      if (notFoundCache) {
        const { timestamp } = JSON.parse(notFoundCache)
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          // Remove from processing videos if it's cached as not found
          const storedVideos = JSON.parse(localStorage.getItem('processingVideos') || '[]')
          const updatedVideos = storedVideos.filter((v: any) => v.id !== videoId)
          localStorage.setItem('processingVideos', JSON.stringify(updatedVideos))
          return
        }
        // Clear old cache
        localStorage.removeItem(`video_not_found_${videoId}`)
      }

      if (attempts >= maxAttempts) {
        // Remove from processing videos after max attempts
        const storedVideos = JSON.parse(localStorage.getItem('processingVideos') || '[]')
        const updatedVideos = storedVideos.filter((v: any) => v.id !== videoId)
        localStorage.setItem('processingVideos', JSON.stringify(updatedVideos))
        return
      }

      try {
        const video = await this.getVideo(videoId)
        
        if (video.status === 'ready' || video.status === 'failed') {
          // Video is complete or failed, remove from processing
          const storedVideos = JSON.parse(localStorage.getItem('processingVideos') || '[]')
          const updatedVideos = storedVideos.filter((v: any) => v.id !== videoId)
          localStorage.setItem('processingVideos', JSON.stringify(updatedVideos))
          
          if (video.status === 'ready') {
            window.dispatchEvent(new CustomEvent('videoProcessingComplete', {
              detail: { video }
            }))
          }
          return
        }

        attempts++
        setTimeout(poll, 5000) // Poll every 5 seconds
      } catch (error) {
        if (axios.isAxiosError(error)) {
          // Handle 403 Forbidden (private video) - consider it as ready
          if (error.response?.status === 403) {
            // Remove from processing videos - it's ready but private
            const storedVideos = JSON.parse(localStorage.getItem('processingVideos') || '[]')
            const updatedVideos = storedVideos.filter((v: any) => v.id !== videoId)
            localStorage.setItem('processingVideos', JSON.stringify(updatedVideos))
            
            // Dispatch a custom event for private video completion
            const privateVideo = {
              id: videoId,
              status: 'ready',
              visibility: 'private'
            }
            window.dispatchEvent(new CustomEvent('videoProcessingComplete', {
              detail: { video: privateVideo }
            }))
            return;
          }
          
          // Handle 404 Not Found
          if (error.response?.status === 404) {
            // Cache the 404 response
            const notFoundCache = {
              id: videoId,
              timestamp: Date.now()
            }
            localStorage.setItem(`video_not_found_${videoId}`, JSON.stringify(notFoundCache))
            
            // Remove from processing videos
            const storedVideos = JSON.parse(localStorage.getItem('processingVideos') || '[]')
            const updatedVideos = storedVideos.filter((v: any) => v.id !== videoId)
            localStorage.setItem('processingVideos', JSON.stringify(updatedVideos))
            return
          }
        }
        
        attempts++
        setTimeout(poll, 5000)
      }
    }

    poll()
  },

  async likeVideo(id: string): Promise<void> {
    await api.post(`/videos/${id}/like`)
  },

  async unlikeVideo(id: string): Promise<void> {
    await api.delete(`/videos/${id}/like`)
  },

  async getVideoComments(videoId: string): Promise<Comment[]> {
    try {
      const { data } = await api.get<ApiComment[]>(`/videos/${videoId}/comments`)
      return data.map(transformComment)
    } catch (error) {
      console.error('Error fetching comments:', error)
      return []
    }
  },

  async addComment(videoId: string, content: string): Promise<Comment> {
    const { data } = await api.post<ApiComment>(`/videos/${videoId}/comments`, { content })
    return transformComment(data)
  },

  async updateComment(videoId: string, commentId: string, content: string): Promise<Comment> {
    const { data } = await api.patch<ApiComment>(`/videos/${videoId}/comments/${commentId}`, { 
      content: content.trim() 
    })
    return transformComment(data)
  },

  async deleteComment(videoId: string, commentId: string): Promise<void> {
    try {
      await api.delete(`/videos/${videoId}/comments/${commentId}`)
      console.log('Comment deleted successfully')
    } catch (error) {
      console.error('Error deleting comment:', error)
      throw error
    }
  },

  async deleteVideo(videoId: string): Promise<void> {
    try {
      await api.delete(`/videos/${videoId}`)
    } catch (error) {
      console.error('Error deleting video:', error)
      throw error
    }
  },

  async updateVideo(videoId: string, data: { 
    title?: string; 
    description?: string;
    visibility?: 'public' | 'unlisted' | 'private';
    videoType?: string;
  }): Promise<Video> {
    const { data: updatedVideo } = await api.patch<Video>(`/videos/${videoId}`, data)
    return updatedVideo
  },

  async addView(videoId: string): Promise<number> {
    try {
      const { data } = await api.post<{ message: string; views: number }>(`/videos/${videoId}/view`)
      return data.views
    } catch (error) {
      console.error('Failed to record view:', error)
      throw error
    }
  },

  async addReply(videoId: string, commentId: string, content: string): Promise<Comment> {
    const { data } = await api.post<ApiComment>(
      `/videos/${videoId}/comments/${commentId}/replies`,
      { content }
    )
    return transformComment(data)
  },

  async getTopVideos(type: 'liked' | 'viewed' | 'commented'): Promise<Video[]> {
    try {
      const { data } = await api.get(`/videos/top/${type}`)
      return data.map((video: any) => ({
        ...video,
        id: video._id || video.id,
        likes: video.likes || 0,
        userId: {
          ...video.userId,
          _id: video.userId._id || video.userId.id
        }
      }))
    } catch (error) {
      console.error(`Error fetching ${type} videos:`, error)
      throw error
    }
  },

  async toggleLike(videoId: string, type: 'like' | 'dislike'): Promise<{
    likes: number
    dislikes: number
    status: 'like' | 'dislike' | null
  }> {
    const { data } = await api.post(`/videos/${videoId}/like`, { type })
    return data
  },

  async getLikeStatus(videoId: string): Promise<{ status: 'like' | 'dislike' | null }> {
    const { data } = await api.get(`/videos/${videoId}/like-status`)
    return data
  },

  async getUserVideos(userId: string): Promise<Video[]> {
    try {
      if (!userId) {
        return [];
      }
      
      // Use server-side filtering by passing userId as a query parameter
      const { data } = await api.get<VideoResponse>('/videos', {
        params: { userId }
      });
      
      // Return the videos array
      return Array.isArray(data) ? data : data.data || [];
    } catch (error) {
      console.error('Error fetching user videos:', error);
      throw error;
    }
  },
}