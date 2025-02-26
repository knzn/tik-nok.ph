import dotenv from 'dotenv'
dotenv.config()

// Debug environment variables
console.log('Environment variables loaded:')
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set (value hidden for security)' : 'Not set')
console.log('PORT:', process.env.PORT)
console.log('REDIS_HOST:', process.env.REDIS_HOST)
console.log('REDIS_PORT:', process.env.REDIS_PORT)

export const config = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/video-app',
  jwtSecret: process.env.JWT_SECRET || 'default-secret-key',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: process.env.REDIS_PORT || 6379,
  uploadDir: 'uploads',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  // Add other environment configurations as needed
} 