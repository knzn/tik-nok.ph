import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import authRoutes from './modules/auth/routes/auth.routes'
import videoRoutes from './modules/video/routes/video.routes'
import { userRoutes } from './modules/user/routes/user.routes'
import { connectDatabase } from './config/database'
import { config } from './config/environment'
import path from 'path'
import fs from 'fs'
import { VideoProcessingService } from './services/video-processing.service'
import morgan from 'morgan'
import { apiLimiter, authLimiter, uploadLimiter, videoLimiter } from './middleware/rate-limit'
import { corsMiddleware } from './middleware/cors.middleware'
import { QueueService } from './services/queue.service'

const app = express()

// Global error handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error)
})

// Initialize video processing service
VideoProcessingService.init().catch(console.error)

// Initialize queue service
QueueService.init()

// Middleware
app.use(corsMiddleware)
app.use(helmet({
  crossOriginResourcePolicy: false // Allow serving uploaded files
}))
app.use(express.json())
app.use(morgan('dev'))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 300 to 500 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false
})
app.use(limiter)

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/temp', 'uploads/profiles'].map(dir => 
  path.join(__dirname, '..', dir)
)
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
})

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Serve HLS files with correct MIME type and bypass rate limiting
app.use('/hls', (req, res, next) => {
  if (req.path.endsWith('.m3u8')) {
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl')
  } else if (req.path.endsWith('.ts')) {
    res.setHeader('Content-Type', 'video/mp2t')
  }
  // Enable CORS for video files
  res.setHeader('Access-Control-Allow-Origin', '*')
  next()
})

// Serve static files - these routes bypass rate limiting
app.use('/hls', express.static(path.join(__dirname, '../public/hls')))
app.use('/thumbnails', express.static(path.join(__dirname, '../public/thumbnails')))

// Apply rate limiting to API routes
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/videos', videoLimiter, videoRoutes)
app.use('/api/users', apiLimiter, userRoutes)

// Apply general rate limiting to all other API routes
app.use('/api', apiLimiter)

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Database connection
connectDatabase()

export default app
