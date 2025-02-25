import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  displayName: { type: String, required: true },
  profilePicture: { type: String },
  coverPhoto: { type: String },
  gamefarmName: { type: String },
  address: { type: String },
  contactNumber: { type: String },
  facebookProfile: { type: String },
  role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' }
}, {
  timestamps: true
})

export const UserModel = mongoose.model('User', userSchema)