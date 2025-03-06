import { api } from '../lib/api'

// Types
export interface User {
  _id: string
  email: string
  username: string
  displayName: string
  profilePicture?: string
  role: 'USER' | 'MODERATOR' | 'ADMIN'
  createdAt: string
  updatedAt: string
}

export interface Video {
  _id: string
  title: string
  description?: string
  userId: string | {
    _id: string
    username: string
    displayName: string
    profilePicture?: string
  }
  hlsUrl?: string
  thumbnailUrl?: string
  status: 'processing' | 'ready' | 'failed'
  isHidden: boolean
  moderationStatus: 'approved' | 'pending' | 'rejected'
  moderationReason?: string
  moderatedBy?: string
  createdAt: string
  updatedAt: string
}

export interface VideoReport {
  _id: string
  videoId: string | {
    _id?: string
    id?: string
    title: string
    thumbnailUrl?: string
    userId: string | {
      _id: string
      username: string
      displayName: string
      profilePicture?: string
    }
  }
  reporterId: string | {
    _id: string
    username: string
    displayName: string
    profilePicture?: string
  }
  reason: string
  details?: string
  status: 'pending' | 'reviewed' | 'dismissed'
  reviewedBy?: string | {
    _id: string
    username: string
    displayName: string
    profilePicture?: string
  }
  createdAt: string
  updatedAt: string
}

export interface Comment {
  _id: string
  content: string
  videoId: string | {
    _id: string
    title: string
    thumbnailUrl?: string
  }
  userId: string | {
    _id: string
    username: string
    displayName: string
    profilePicture?: string
  }
  parentId?: string
  isHidden: boolean
  moderationStatus: 'approved' | 'pending' | 'rejected'
  moderationReason?: string
  moderatedBy?: string
  createdAt: string
  updatedAt: string
}

export interface DashboardStats {
  totalUsers: number
  totalVideos: number
  totalComments: number
  pendingVideos: number
  pendingComments: number
  roleDistribution: {
    USER?: number
    MODERATOR?: number
    ADMIN?: number
  }
}

// User Management
export const getAllUsers = async (): Promise<User[]> => {
  const response = await api.get('/admin/users')
  return response.data
}

export const getUserById = async (userId: string): Promise<User> => {
  const response = await api.get(`/admin/users/${userId}`)
  return response.data
}

export const createUser = async (userData: {
  email: string
  username: string
  password: string
  displayName: string
  role?: 'USER' | 'MODERATOR' | 'ADMIN'
}): Promise<User> => {
  const response = await api.post('/admin/users', userData)
  return response.data
}

export const updateUserRole = async (
  userId: string,
  role: 'USER' | 'MODERATOR' | 'ADMIN'
): Promise<User> => {
  const response = await api.patch(`/admin/users/${userId}/role`, { role })
  return response.data
}

export const deleteUser = async (userId: string): Promise<{ message: string }> => {
  const response = await api.delete(`/admin/users/${userId}`)
  return response.data
}

// Video Moderation
export const getAllVideos = async (): Promise<Video[]> => {
  const response = await api.get('/admin/videos')
  return response.data
}

export const hideVideo = async (
  videoId: string,
  reason?: string
): Promise<Video> => {
  const response = await api.patch(`/admin/videos/${videoId}/hide`, { reason })
  return response.data
}

export const approveVideo = async (videoId: string): Promise<Video> => {
  const response = await api.patch(`/admin/videos/${videoId}/approve`)
  return response.data
}

export const rejectVideo = async (
  videoId: string,
  reason: string
): Promise<Video> => {
  const response = await api.patch(`/admin/videos/${videoId}/reject`, { reason })
  return response.data
}

export const deleteVideo = async (videoId: string): Promise<{ message: string }> => {
  const response = await api.delete(`/admin/videos/${videoId}`)
  return response.data
}

// Comment Moderation
export const getAllComments = async (): Promise<Comment[]> => {
  const response = await api.get('/admin/comments')
  return response.data
}

export const hideComment = async (
  commentId: string,
  reason?: string
): Promise<Comment> => {
  const response = await api.patch(`/admin/comments/${commentId}/hide`, { reason })
  return response.data
}

export const approveComment = async (commentId: string): Promise<Comment> => {
  const response = await api.patch(`/admin/comments/${commentId}/approve`)
  return response.data
}

export const rejectComment = async (
  commentId: string,
  reason: string
): Promise<Comment> => {
  const response = await api.patch(`/admin/comments/${commentId}/reject`, { reason })
  return response.data
}

export const deleteComment = async (commentId: string): Promise<{ message: string }> => {
  const response = await api.delete(`/admin/comments/${commentId}`)
  return response.data
}

// Dashboard Statistics
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await api.get('/admin/stats')
  return response.data
}

// Video Reports Management
export const getVideoReports = async (): Promise<VideoReport[]> => {
  const response = await api.get('/admin/reports/videos')
  return response.data
}

export const reviewVideoReport = async (
  reportId: string,
  action: 'hide' | 'delete' | 'dismiss',
  reason?: string
): Promise<{ message: string }> => {
  const response = await api.patch(`/admin/reports/videos/${reportId}/review`, { 
    action,
    reason 
  })
  return response.data
}

export const permanentlyDeleteVideo = async (
  videoId: string
): Promise<{ message: string }> => {
  const response = await api.delete(`/admin/videos/${videoId}/permanent`)
  return response.data
} 