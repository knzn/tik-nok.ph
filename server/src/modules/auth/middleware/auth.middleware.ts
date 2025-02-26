import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../../../config/environment'

export interface AuthRequest extends Request {
  user: {
    id: string
    email: string
    username?: string
    profilePicture?: string
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization
    
    // Debug auth header
    console.log('Auth middleware processing:', {
      hasAuthHeader: !!authHeader,
      headerStart: authHeader ? authHeader.substring(0, 15) + '...' : 'none',
      path: req.path
    })
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No valid token format in auth header')
      res.status(401).json({ error: 'No token provided' })
      return
    }

    const token = authHeader.split(' ')[1]
    
    // Debug token before verification
    console.log('Token before verification:', {
      tokenLength: token.length,
      tokenStart: token.substring(0, 10) + '...'
    })
    
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as {
        id: string
        email: string
        username?: string
        profilePicture?: string
      }
      
      // Debug decoded token
      console.log('Token verified successfully:', {
        userId: decoded.id,
        userEmail: decoded.email
      })

      // Add user info to request
      ;(req as AuthRequest).user = decoded
      
      next()
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError)
      
      // Try to decode without verification for debugging
      try {
        const decodedWithoutVerify = jwt.decode(token)
        console.log('Token decoded without verification:', decodedWithoutVerify)
      } catch (decodeError) {
        console.error('Token decode error:', decodeError)
      }
      
      res.status(401).json({ error: 'Invalid token' })
      return
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(401).json({ error: 'Authentication error' })
    return
  }
} 