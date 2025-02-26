import { z } from 'zod'

export const VideoUploadSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  videoType: z.string().optional()
})

export type VideoUpload = z.infer<typeof VideoUploadSchema>

export interface Video {
  id: string
  title: string
  description?: string
  hlsUrl: string
  thumbnailUrl: string
  quality: string[]
  status: 'processing' | 'ready' | 'failed'
  userId: string
  createdAt: string
  updatedAt: string
  tags?: string[]
  videoType?: string
} 