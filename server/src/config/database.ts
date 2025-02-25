import mongoose from 'mongoose'
import { config } from './environment'

const connectWithRetry = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(config.mongoUri, {
        // These options help with connection stability
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      })
      console.log('Connected to MongoDB')
      return
    } catch (error) {
      console.error(`MongoDB connection attempt ${i + 1} failed:`, error)
      if (i === retries - 1) {
        console.error('Max retries reached. Exiting...')
        process.exit(1)
      }
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

export const connectDatabase = () => {
  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected. Attempting to reconnect...')
    connectWithRetry()
  })

  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error)
  })

  return connectWithRetry()
} 