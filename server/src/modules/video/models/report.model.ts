import mongoose, { Schema, Document } from 'mongoose'

export interface IVideoReport extends Document {
  videoId: mongoose.Types.ObjectId | string
  reporterId: mongoose.Types.ObjectId | string
  reason: string
  details?: string
  status: 'pending' | 'reviewed' | 'dismissed'
  reviewedBy?: mongoose.Types.ObjectId | string
  createdAt: Date
  updatedAt: Date
}

const VideoReportSchema: Schema = new Schema(
  {
    videoId: {
      type: Schema.Types.ObjectId,
      ref: 'Video',
      required: true
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    details: {
      type: String
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'dismissed'],
      default: 'pending'
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
)

export default mongoose.model<IVideoReport>('VideoReport', VideoReportSchema) 