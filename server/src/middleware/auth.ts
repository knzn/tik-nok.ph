import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config/environment'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
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
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id?: string
      userId?: string
      email?: string
      username?: string
    }

    // Handle both token formats
    req.user = {
      id: decoded.id || decoded.userId || '',
      email: decoded.email || '',
      username: decoded.username || ''
    }

    if (!req.user.id) {
      return res.status(401).json({ error: 'Invalid token format' })
    }

    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
} 