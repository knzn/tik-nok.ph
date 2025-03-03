import express from 'express'
import { AuthController } from '../controllers/auth.controller'
import { AuthService } from '../services/auth.service'

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

export default router 