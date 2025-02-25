import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../../../config/environment'

export interface AuthRequest extends Request {
  user: {
    id: string
    email: string
    username: string
    profilePicture?: string
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' })
      return
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string
      email: string
      username: string
      profilePicture?: string
    }

    // Add user info to request
    ;(req as AuthRequest).user = decoded

    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
    return
  }
} 