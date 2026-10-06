const { verifyToken } = require('../utils/token');
const { User } = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

/**
 * Authentication Middleware: Validates Bearer JWT in Authorization header.
 */
const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return ApiResponse.error(
      res,
      'Authentication required. Please provide a valid Bearer token.',
      401
    );
  }

  try {
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return ApiResponse.error(
        res,
        'The user associated with this token no longer exists.',
        401
      );
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.error(
        res,
        'Authentication token has expired. Please log in again.',
        401
      );
    }
    if (error.name === 'JsonWebTokenError') {
      return ApiResponse.error(
        res,
        'Invalid authentication token.',
        401
      );
    }
    return ApiResponse.error(
      res,
      'Authentication failed.',
      401
    );
  }
};

module.exports = {
  protect,
};
