import mongoose from 'mongoose'

const followSchema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  following: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true
})

// Compound index to ensure unique follows
followSchema.index({ follower: 1, following: 1 }, { unique: true })

export const FollowModel = mongoose.model('Follow', followSchema) 