const express = require('express');
const router = express.Router();
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { passwordResetLimiter } = require('../middleware/securityMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
