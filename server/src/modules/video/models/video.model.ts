import mongoose, { Schema } from 'mongoose'

interface IVideo {
  title: string
  description?: string
  userId: Schema.Types.ObjectId
  hlsUrl?: string
  thumbnailUrl?: string
  quality: string[]
  status: 'processing' | 'ready' | 'failed'
  visibility: 'public' | 'unlisted' | 'private'
  createdAt: Date
  updatedAt: Date
  duration: number
  resolution: {
    width: number
    height: number
  }
  views: number
  likes: number
  dislikes: number
}

const videoSchema = new Schema<IVideo>(
  {
    title: { type: String, required: true },
    description: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hlsUrl: { type: String },
    thumbnailUrl: { type: String },
    quality: [{ type: String }],
    duration: { type: Number },
    resolution: {
      width: { type: Number },
      height: { type: Number }
    },
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed'],
      default: 'processing'
    },
    visibility: {
      type: String,
      enum: ['public', 'unlisted', 'private'],
      default: 'public'
    },
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    dislikes: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
)

// Add a transform to convert _id to id
videoSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  }
})

export const VideoModel = mongoose.model<IVideo>('Video', videoSchema) 