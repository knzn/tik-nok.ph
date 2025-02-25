import cors from 'cors'
import { config } from '../config/environment'

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    callback(null, true) // Allow all origins in development
  },
  credentials: true
}) 