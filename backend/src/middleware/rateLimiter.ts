import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Prevents ERR_ERL_UNEXPECTED_X_FORWARDED_FOR on Vercel reverse proxy
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.'
  }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 login attempts per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Prevents ERR_ERL_UNEXPECTED_X_FORWARDED_FOR on Vercel reverse proxy
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.'
  }
});
