import { z } from 'zod'
import { UserSchema } from './auth.types'

export const VideoSchema = z.object({
  _id: z.string(),
  id: z.string(),
  title: z.string().min(3).max(100),
  description: z.string().max(1000).optional(),
  userId: z.object({
    _id: z.string(),
    username: z.string(),
    profilePicture: z.string().optional(),
    followersCount: z.number().optional()
  }),
  url: z.string(),
  thumbnailUrl: z.string().optional(),
  hlsUrl: z.string().optional(),
  aspectRatio: z.number().optional(),
  duration: z.number().optional(),
  views: z.number().default(0),
  likes: z.number().optional(),
  status: z.enum(['processing', 'public', 'private']).default('processing'),
  quality: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type VideoSchemaType = z.infer<typeof VideoSchema>

export const VideoUploadSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(1000).optional()
})

export type VideoUpload = z.infer<typeof VideoUploadSchema>

interface VideoUser {
  _id: string
  username: string
  profilePicture?: string
  followersCount?: number
}

export interface Video {
  _id: string
  id: string
  title: string
  description?: string
  thumbnailUrl?: string
  url: string
  hlsUrl?: string
  aspectRatio?: number
  userId: VideoUser
  views: number
  likes?: number
  status: 'processing' | 'public' | 'private'
  quality: string[]
  createdAt: Date
  updatedAt: Date
} 