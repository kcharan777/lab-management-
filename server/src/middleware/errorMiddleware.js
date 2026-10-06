const ApiResponse = require('../utils/apiResponse');

// 404 Route Not Found Middleware
const notFoundHandler = (req, res, next) => {
  return ApiResponse.error(res, `Endpoint not found: ${req.method} ${req.originalUrl}`, 404);
};

// Centralized Global Error Handler
const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production' || process.env.NODE_ENV === 'test') {
    console.error(`[Server Error] ${err.stack || err.message}`);
  }

  let statusCode = res.statusCode !== 200 && res.statusCode !== 404 ? res.statusCode : 500;
  let message = err.message || 'An unexpected server error occurred';

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map(el => el.message);
    return ApiResponse.error(res, 'Validation Error', statusCode, errors);
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    return ApiResponse.error(res, `Duplicate field value entered: ${field}`, statusCode);
  }

  // Handle CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    return ApiResponse.error(res, `Resource not found with id of ${err.value}`, statusCode);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
  }

  // Obfuscate 500 error messages in strict production to avoid leakage
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'An internal server error occurred. Please contact system administrator.';
  }

  return ApiResponse.error(res, message, statusCode);
};

module.exports = {
  notFoundHandler,
  errorHandler
};
