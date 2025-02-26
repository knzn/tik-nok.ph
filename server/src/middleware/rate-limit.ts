import rateLimit from 'express-rate-limit'

// General API rate limiter - increased to accommodate normal API usage
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 180, // Increased from 120 to 180 requests per minute
  message: 'Too many requests from this IP, please try again after a minute',
  standardHeaders: true,
  legacyHeaders: false,
})

// Special limiter for video endpoints that may be polled frequently
// This is less restrictive now that we're using Socket.IO for real-time updates
export const videoLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 360, // Increased from 240 to 360 requests per minute (6 requests per second)
  message: 'Too many video requests from this IP, please try again after a minute',
  standardHeaders: true,
  legacyHeaders: false,
})

// Authentication endpoints limiter - more restrictive to prevent brute force
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per 15 minutes
  message: 'Too many authentication attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
})

// Upload endpoints limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: 'Too many upload attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
}) 