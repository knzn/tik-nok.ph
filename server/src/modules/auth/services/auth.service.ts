import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { UserModel } from '../../user/models/user.model'
import { config } from '../../../config/environment'
import type { LoginInput, RegisterInput } from '@video-app/shared/types/auth.types'

export class AuthService {
  async register(data: RegisterInput) {
    try {
      const existingEmail = await UserModel.findOne({ email: data.email })
      if (existingEmail) {
        throw new Error('Email already registered')
      }

      const existingUsername = await UserModel.findOne({ username: data.username })
      if (existingUsername) {
        throw new Error('Username already taken')
      }

      const hashedPassword = await bcrypt.hash(data.password, 10)
      
      // Set displayName to username if not provided
      const user = await UserModel.create({
        email: data.email,
        username: data.username,
        password: hashedPassword,
        displayName: data.username // Changed from data.username to ensure displayName is set
      })

      const token = jwt.sign(
        { id: user._id, email: user.email },
        config.jwtSecret,
        { expiresIn: '24h' }
      )

      return {
        token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username
        }
      }
    } catch (error) {
      console.error('Auth service error:', error)
      if (error instanceof Error) {
        if ((error as any).code === 11000) {
          if ((error as any).keyPattern?.email) {
            throw new Error('Email already registered')
          }
          if ((error as any).keyPattern?.username) {
            throw new Error('Username already taken')
          }
          if ((error as any).keyPattern?.displayName) {
            throw new Error('Display name already taken')
          }
        }
      }
      throw error
    }
  }

  async login(data: LoginInput) {
    const { email, password } = data
    const user = await UserModel.findOne({ email })
    if (!user) {
      throw new Error('User not found')
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      throw new Error('Invalid password')
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      config.jwtSecret,
      { expiresIn: '24h' }
    )

    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username
      }
    }
  }

  async getUserById(id: string) {
    const user = await UserModel.findById(id)
    if (!user) {
      throw new Error('User not found')
    }

    return {
      id: user._id,
      email: user.email,
      username: user.username
    }
  }
} 