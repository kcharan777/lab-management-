const crypto = require('crypto');
const { User, USER_ROLES } = require('../models');
const { generateToken } = require('../utils/token');
const ApiResponse = require('../utils/apiResponse');
const {
  validateRollNumberFormat,
  verifyStudentRegistryEligibility,
} = require('../utils/studentVerifier');
const { sendPasswordResetEmail } = require('../utils/mailer');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new student account with MLRIT roll number verification
 * @access  Public (Restricted to verified Students)
 */
const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role = 'STUDENT',
      department,
      rollNumber,
      specialization,
      phone,
    } = req.body;

    // SECURITY ENFORCEMENT: Public registration is strictly restricted to STUDENT role
    const requestedRole = (role || 'STUDENT').toUpperCase().trim();
    if (requestedRole !== 'STUDENT') {
      return ApiResponse.error(
        res,
        `Security restriction: Public registration is strictly for students. Faculty and staff accounts (${requestedRole}) are managed by the System Administrator.`,
        403
      );
    }

    // Validate presence and types of required fields
    if (
      !name || !email || !password || !department ||
      typeof name !== 'string' || typeof email !== 'string' ||
      typeof password !== 'string' || typeof department !== 'string'
    ) {
      return ApiResponse.error(
        res,
        'Please provide all required fields: name, email, password, and department as valid strings.',
        400
      );
    }

    // Validate password length
    if (password.length < 6) {
      return ApiResponse.error(
        res,
        'Password must be at least 6 characters in length.',
        400
      );
    }

    // MLRIT ROLL NUMBER VALIDATION
    if (!rollNumber) {
      return ApiResponse.error(
        res,
        'Institutional roll number is mandatory for campus student account registration.',
        400
      );
    }

    const rollValidation = validateRollNumberFormat(rollNumber);
    if (!rollValidation.isValid) {
      return ApiResponse.error(res, rollValidation.error, 400);
    }

    const normalizedRoll = rollValidation.normalized;

    // Check if roll number is already registered in User database
    const existingRoll = await User.findOne({ rollNumber: normalizedRoll });
    if (existingRoll) {
      return ApiResponse.error(
        res,
        `Roll number '${normalizedRoll}' is already registered with an existing student account.`,
        409
      );
    }

    // Check if email already exists
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return ApiResponse.error(
        res,
        `An account with email '${normalizedEmail}' is already registered.`,
        409
      );
    }

    // Verify against authorized student registry if populated
    const registryCheck = await verifyStudentRegistryEligibility(normalizedRoll);
    if (!registryCheck.isEligible) {
      return ApiResponse.error(res, registryCheck.error, 403);
    }

    // Create and persist user
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'STUDENT',
      department: department.trim(),
      rollNumber: normalizedRoll,
      specialization: specialization ? specialization.trim() : null,
      phone: phone ? phone.trim() : null,
    });

    await user.save();

    // Link registry entry if present
    if (registryCheck.registryEntry) {
      registryCheck.registryEntry.isRegistered = true;
      registryCheck.registryEntry.registeredUserId = user._id;
      await registryCheck.registryEntry.save();
    }

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    return ApiResponse.success(
      res,
      {
        user: user.toJSON(),
        token,
      },
      'Student account verified and registered successfully.',
      201
    );
  } catch (error) {
    if (error.code === 11000) {
      const key = Object.keys(error.keyPattern || {})[0] || 'field';
      return ApiResponse.error(
        res,
        `Duplicate account violation: An account with this ${key} already exists.`,
        409
      );
    }
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & return JWT token
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return ApiResponse.error(
        res,
        'Please provide both a valid email address and password string.',
        400
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return ApiResponse.error(res, 'Invalid email or password.', 401);
    }

    if (user.isActive === false) {
      return ApiResponse.error(
        res,
        'This institutional account has been deactivated by administration. Please contact support.',
        403
      );
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return ApiResponse.error(res, 'Invalid email or password.', 401);
    }

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    return ApiResponse.success(
      res,
      {
        user: user.toJSON(),
        token,
      },
      'User authenticated successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Initiate password reset via Gmail / SMTP token
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return ApiResponse.error(res, 'Please provide a valid institutional email address.', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Prevent account enumeration: Always respond with success message
    if (!user) {
      return ApiResponse.success(
        res,
        null,
        'If an account is associated with that email address, password reset instructions have been dispatched.'
      );
    }

    // Generate cryptographically secure random token (32 bytes = 64 hex chars)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token with SHA256 before storing in database
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // 15 minutes expiration
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    // Client reset link
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

    // Send email via Gmail / SMTP
    await sendPasswordResetEmail(user.email, resetUrl, user.name);

    return ApiResponse.success(
      res,
      null,
      'If an account is associated with that email address, password reset instructions have been dispatched.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/reset-password
 * @desc    Complete password reset with single-use token
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || typeof token !== 'string') {
      return ApiResponse.error(res, 'Reset token is required.', 400);
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return ApiResponse.error(res, 'New password must be at least 6 characters in length.', 400);
    }

    // Hash the token provided in the URL to compare against the database hash
    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return ApiResponse.error(
        res,
        'Password reset token is invalid, single-use consumed, or has expired. Please request a new one.',
        400
      );
    }

    // Update password and invalidate token immediately
    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    return ApiResponse.success(
      res,
      null,
      'Your password has been successfully reset. You may now sign in with your new credentials.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user profile
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    return ApiResponse.success(
      res,
      req.user.toJSON(),
      'User profile retrieved successfully.'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe,
};
