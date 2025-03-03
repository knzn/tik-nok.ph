import { Request, Response } from 'express'
import { AuthService } from '../services/auth.service'

export class AuthController {
  constructor(private authService: AuthService) {}

  public register = async (req: Request, res: Response) => {
    try {
      console.log('Register payload:', JSON.stringify(req.body, null, 2))
      
      // Validate required fields
      if (!req.body.email || !req.body.username || !req.body.password) {
        console.error('Missing required fields:', {
          hasEmail: !!req.body.email,
          hasUsername: !!req.body.username,
          hasPassword: !!req.body.password
        })
        return res.status(400).json({
          error: 'Missing required fields',
          code: 'VALIDATION_ERROR'
        })
      }
      
      // Ensure password is a valid string
      if (typeof req.body.password !== 'string' || req.body.password.length < 6) {
        console.error('Invalid password format:', {
          type: typeof req.body.password,
          length: req.body.password ? req.body.password.length : 0
        })
        return res.status(400).json({
          error: 'Password must be a string with at least 6 characters',
          code: 'VALIDATION_ERROR'
        })
      }
      
      // Log types of fields for debugging
      console.log('Field types:', {
        email: typeof req.body.email,
        username: typeof req.body.username,
        password: typeof req.body.password,
        passwordLength: req.body.password ? req.body.password.length : 0
      })
      
      // Extract only needed fields from request body (excluding confirmPassword)
      const { email, username, password } = req.body;
      const registerData = { email, username, password };
      
      const result = await this.authService.register(registerData)
      return res.status(201).json(result)
    } catch (error) {
      console.error('Register error:', error)
      return res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Registration failed',
        code: error instanceof Error && error.message.includes('Email') ? 'EMAIL_EXISTS' : 
              error instanceof Error && error.message.includes('Username') ? 'USERNAME_EXISTS' : 
              'REGISTRATION_FAILED'
      })
    }
  }

  public login = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.login(req.body)
      return res.json(result)
    } catch (error) {
      return res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Login failed' 
      })
    }
  }

  public me = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      
      const user = await this.authService.getUserById(userId)
      return res.json({ data: user })
    } catch (error) {
      return res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Failed to get user' 
      })
    }
  }

  public logout = async (req: Request, res: Response) => {
    try {
      res.clearCookie('token')
      return res.json({ message: 'Logged out successfully' })
    } catch (error) {
      return res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Logout failed' 
      })
    }
  }
}