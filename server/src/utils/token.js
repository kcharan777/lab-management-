const jwt = require('jsonwebtoken');

/**
 * Generates a signed JWT for an authenticated user.
 */
const generateToken = (userId, role) => {
  const secret = process.env.JWT_SECRET || 'labpulse_fallback_secret_key_8923487192';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      id: userId,
      role: role,
    },
    secret,
    {
      expiresIn,
    }
  );
};

/**
 * Verifies a JWT and returns the decoded payload.
 */
const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || 'labpulse_fallback_secret_key_8923487192';
  return jwt.verify(token, secret);
};

module.exports = {
  generateToken,
  verifyToken,
};
