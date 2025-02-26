import mongoose, { Schema, Document } from 'mongoose'

export interface IVideo extends Document {
  title: string
  description?: string
  userId: Schema.Types.ObjectId
  hlsUrl?: string
  thumbnailUrl?: string
  duration?: number
  resolution?: {
    width: number
    height: number
  }
  status: 'processing' | 'ready' | 'failed'
  processingProgress: number
  processingStage: 'initializing' | 'metadata' | 'transcoding' | 'cleanup' | 'ready' | 'failed'
  error?: string
  quality?: string[]
  videoType?: string
  visibility?: 'public' | 'unlisted' | 'private'
  tags?: string[]
  createdAt: Date
  updatedAt: Date
}

// Use a constant for the model name to avoid typos
const MODEL_NAME = 'Video'

// Check if the model exists before creating it
export const VideoModel = mongoose.models[MODEL_NAME] || 
  mongoose.model<IVideo>(MODEL_NAME, new Schema<IVideo>({
    title: { type: String, required: true },
    description: String,
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    hlsUrl: String,
    thumbnailUrl: String,
    duration: Number,
    resolution: {
      width: Number,
      height: Number
    },
    status: { 
      type: String, 
      enum: ['processing', 'ready', 'failed'],
      default: 'processing'
    },
    processingProgress: { 
      type: Number, 
      default: 0 
    },
    processingStage: {
      type: String,
      enum: ['initializing', 'metadata', 'transcoding', 'cleanup', 'ready', 'failed'],
      default: 'initializing'
    },
    error: String,
    quality: [String],
    videoType: { type: String, default: '' },
    visibility: { 
      type: String, 
      enum: ['public', 'unlisted', 'private'],
      default: 'public'
    },
    tags: [String],
  }, {
    timestamps: true
  })) 