import rateLimit from 'express-rate-limit'

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute
  message: 'Too many requests from this IP, please try again after a minute',
  standardHeaders: true,
  legacyHeaders: false,
})

// Special limiter for video endpoints that may be polled frequently
export const videoLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 180, // Limit each IP to 180 requests per minute (3 requests per second)
  message: 'Too many video requests from this IP, please try again after a minute',
  standardHeaders: true,
  legacyHeaders: false,
}) 