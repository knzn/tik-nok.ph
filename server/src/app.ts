import express, { Request, Response, NextFunction } from 'express'
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
import { errorHandler, notFoundHandler } from './middleware/error.middleware'

const app = express()

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error)
  // Give time for logs to be written before exiting
  setTimeout(() => {
    process.exit(1)
  }, 1000)
})

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Promise Rejection:', reason)
})

// Initialize video processing service
VideoProcessingService.init().catch(console.error)

// Initialize queue service
QueueService.init()

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(corsMiddleware)
app.use(helmet())
app.use(morgan('dev'))

// Rate limiting
app.use('/api/', apiLimiter)
app.use('/api/auth', authLimiter)
app.use('/api/videos', videoLimiter)
app.use('/api/videos/upload', uploadLimiter)

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const tempUploadsDir = path.join(__dirname, '../uploads/temp')
if (!fs.existsSync(tempUploadsDir)) {
  fs.mkdirSync(tempUploadsDir, { recursive: true })
}

const profilesDir = path.join(__dirname, '../uploads/profiles')
if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true })
}

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))
app.use('/public', express.static(path.join(__dirname, '../public')))

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

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/videos', videoRoutes)
app.use('/api/users', userRoutes)

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

// API documentation
app.get('/api/docs', (req, res) => {
  res.status(200).json({
    message: 'API documentation coming soon',
    version: '1.0.0'
  })
})

// 404 handler
app.use(notFoundHandler)

// Error handling middleware
app.use(errorHandler)

// Database connection
connectDatabase()

export default app
