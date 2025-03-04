import express from 'express'
import { AuthController } from '../controllers/auth.controller'
import { AuthService } from '../services/auth.service'
import { authMiddleware } from '../middleware/auth.middleware'

// Create router
const router = express.Router()

// Create controller instance
const authService = new AuthService()
const authController = new AuthController(authService)

// Debug middleware
router.use((req, res, next) => {
  console.log(`Auth Route: ${req.method} ${req.url}`)
  next()
})

// Define routes
router.post('/register', (req, res) => {
  authController.register(req, res)
})

router.post('/login', (req, res) => {
  authController.login(req, res)
})

router.get('/me', (req, res) => {
  authController.me(req, res)
})

router.post('/logout', (req, res) => {
  authController.logout(req, res)
})

// Add change password route - protected with authentication
router.post('/change-password', authMiddleware, (req, res) => {
  authController.changePassword(req, res)
})

// Add change email route - protected with authentication
router.post('/change-email', authMiddleware, (req, res) => {
  authController.changeEmail(req, res)
})

// Add change username route - protected with authentication
router.post('/change-username', authMiddleware, (req, res) => {
  authController.changeUsername(req, res)
})

export default router 