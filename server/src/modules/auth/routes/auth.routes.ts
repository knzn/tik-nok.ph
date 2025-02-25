import { Router } from 'express'
import { AuthController } from '../controllers/auth.controller'
import { AuthService } from '../services/auth.service'

const router = Router()
const authService = new AuthService()
const authController = new AuthController(authService)

// Debug log
router.use((req, res, next) => {
  console.log(`Auth Route: ${req.method} ${req.url}`)
  next()
})

router.post('/register', authController.register)
router.post('/login', authController.login)

export default router 