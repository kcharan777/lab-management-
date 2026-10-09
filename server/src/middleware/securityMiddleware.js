const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const ApiResponse = require('../utils/apiResponse');

/**
 * Recursive sanitizer to eliminate NoSQL injection keys ($gt, $ne, etc.)
 * and strip executable XSS script patterns.
 */
function sanitizeValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  // Handle objects: strip any keys that start with '$' or contain '.'
  if (typeof value === 'object') {
    const cleanObj = {};
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) {
        // Strip NoSQL injection operators
        continue;
      }
      cleanObj[key] = sanitizeValue(value[key]);
    }
    return cleanObj;
  }

  // Handle strings: strip dangerous script patterns
  if (typeof value === 'string') {
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:[^\s"'>]*/gi, '');
  }

  return value;
}

/**
 * Express middleware to sanitize req.body, req.query, and req.params
 */
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }
  next();
};

/**
 * Strict rate limiter for Authentication endpoints (login, register)
 * to prevent brute-force attacks and credential stuffing.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(
      res,
      'Too many authentication attempts from this IP. Please try again after 15 minutes.',
      429
    );
  },
});

/**
 * Rate limiter specifically for password reset requests
 */
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(
      res,
      'Too many password reset requests from this IP. Please try again after 15 minutes.',
      429
    );
  },
});

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 5000 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(
      res,
      'Too many API requests from this IP. Please slow down.',
      429
    );
  },
});

/**
 * Configured Helmet security headers middleware
 */
const helmetConfig = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

module.exports = {
  sanitizeInput,
  authLimiter,
  passwordResetLimiter,
  apiLimiter,
  helmetConfig,
};
