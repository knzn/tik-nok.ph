import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  profilePicture: { type: String },
  role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' }
}, {
  timestamps: true
})

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10)
  }
  next()
})

userSchema.methods.comparePassword = async function(password: string) {
  return bcrypt.compare(password, this.password)
}

export const User = mongoose.model('User', userSchema)