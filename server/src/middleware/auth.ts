import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config/environment'
import { UserModel } from '../modules/user/models/user.model'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email?: string
    username?: string
    role?: string
  }
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' })
      return
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id?: string
      userId?: string
      email?: string
      username?: string
      role?: string
    }

    // Handle both token formats
    req.user = {
      id: decoded.id || decoded.userId || '',
      email: decoded.email || '',
      username: decoded.username || '',
      role: decoded.role || 'USER'
    }

    if (!req.user.id) {
      res.status(401).json({ error: 'Invalid token format' })
      return
    }

    // If role is not in the token, fetch it from the database
    if (!req.user.role) {
      const user = await UserModel.findById(req.user.id).select('role').lean()
      if (user) {
        req.user.role = user.role
      }
    }

    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export const adminMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // First ensure the user is authenticated
    if (!req.user?.id) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    // If role is not in the request, fetch it from the database
    if (!req.user.role) {
      const user = await UserModel.findById(req.user.id).select('role').lean()
      if (user) {
        req.user.role = user.role
      }
    }

    // Check if the user is an admin
    if (req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Admin access required' })
      return
    }

    next()
  } catch (error) {
    res.status(500).json({ error: 'Server error' })
  }
}

export const moderatorMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // First ensure the user is authenticated
    if (!req.user?.id) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    // If role is not in the request, fetch it from the database
    if (!req.user.role) {
      const user = await UserModel.findById(req.user.id).select('role').lean()
      if (user) {
        req.user.role = user.role
      }
    }

    // Check if the user is an admin or moderator
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MODERATOR') {
      res.status(403).json({ error: 'Moderator access required' })
      return
    }

    next()
  } catch (error) {
    res.status(500).json({ error: 'Server error' })
  }
} 