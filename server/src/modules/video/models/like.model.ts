import mongoose, { Schema } from 'mongoose'

interface ILike {
  userId: Schema.Types.ObjectId
  videoId: Schema.Types.ObjectId
  type: 'like' | 'dislike'
  createdAt: Date
  updatedAt: Date
}

const likeSchema = new Schema<ILike>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    videoId: {
      type: Schema.Types.ObjectId,
      ref: 'Video',
      required: true
    },
    type: {
      type: String,
      enum: ['like', 'dislike'],
      required: true
    }
  },
  { timestamps: true }
)

// Create a compound unique index to prevent duplicate likes
likeSchema.index({ userId: 1, videoId: 1 }, { unique: true })

export const LikeModel = mongoose.model<ILike>('Like', likeSchema) 