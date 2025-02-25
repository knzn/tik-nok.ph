import { createServer } from 'http'
import app from './app'
import { WebSocketService } from './services/websocket.service'
import { VideoProcessingService } from './services/video-processing.service'
import mongoose from 'mongoose'
import { config } from './config/environment'

const server = createServer(app)

// Initialize WebSocket service
WebSocketService.init(server)

// Graceful shutdown handler
async function shutdown(signal: string) {
  console.log(`\n${signal} received. Starting graceful shutdown...`)
  
  try {
    // Cleanup video processing
    await VideoProcessingService.cleanup()
    
    // Close server
    server.close(() => {
      console.log('HTTP server closed')
      
      // Close database connection
      mongoose.connection.close().then(() => {
        console.log('MongoDB connection closed')
        process.exit(0)
      }).catch((err) => {
        console.error('Error closing MongoDB connection:', err)
        process.exit(1)
      })
    })

    // Force exit after timeout
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down')
      process.exit(1)
    }, 10000)

  } catch (error) {
    console.error('Error during shutdown:', error)
    process.exit(1)
  }
}

// Handle different signals
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGHUP', () => shutdown('SIGHUP'))

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  shutdown('uncaughtException')
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  shutdown('unhandledRejection')
})

// Initialize services
const init = async () => {
  try {
    await VideoProcessingService.init()
    // ... other initialization code
  } catch (error) {
    console.error('Initialization failed:', error)
    process.exit(1)
  }
}

init()

// Start server
const PORT = config.port || 3000
mongoose.connect(config.mongoUri)
  .then(() => {
    console.log('Connected to MongoDB')
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error)
  })
