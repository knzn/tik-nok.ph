export interface Video {
  id: string
  _id?: string
  title: string
  description?: string
  hlsUrl: string
  thumbnailUrl?: string
  duration?: number
  userId: {
    _id: string
    username: string
    profilePicture?: string
  }
  views?: number
  likes?: number
  dislikes?: number
  comments?: number
  status: 'processing' | 'ready' | 'failed' | 'public' | 'private'
  category?: string
  tags?: string[]
  quality?: string[]
  createdAt: string
  updatedAt: string
  aspectRatio?: number
}