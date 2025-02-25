import { Request, Response } from 'express'
import { AuthService } from '../services/auth.service'
import type { RegisterInput, LoginInput } from '@video-app/shared/types/auth.types'

export class AuthController {
  constructor(private authService: AuthService) {}

  public register = async (req: Request<{}, any, RegisterInput>, res: Response) => {
    try {
      console.log('Register payload:', req.body)
      const result = await this.authService.register(req.body)
      res.status(201).json(result)
    } catch (error) {
      console.error('Register error:', error)
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Registration failed',
        code: error instanceof Error && error.message.includes('Email') ? 'EMAIL_EXISTS' : 
              error instanceof Error && error.message.includes('Username') ? 'USERNAME_EXISTS' : 
              'REGISTRATION_FAILED'
      })
    }
  }

  public login = async (req: Request<{}, any, LoginInput>, res: Response) => {
    try {
      const result = await this.authService.login(req.body)
      res.json(result)
    } catch (error) {
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Login failed' 
      })
    }
  }

  public me = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }
      
      const user = await this.authService.getUserById(userId)
      res.json({ data: user })
    } catch (error) {
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Failed to get user' 
      })
    }
  }

  public logout = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.clearCookie('token')
      res.json({ message: 'Logged out successfully' })
    } catch (error) {
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Logout failed' 
      })
    }
  }
}