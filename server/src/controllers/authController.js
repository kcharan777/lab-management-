const { User, USER_ROLES } = require('../models');
const { generateToken } = require('../utils/token');
const ApiResponse = require('../utils/apiResponse');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (Student, HOD, Lab Incharge, Main Admin)
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'STUDENT', department } = req.body;

    // Validate presence and types of required fields
    if (
      !name || !email || !password || !department ||
      typeof name !== 'string' || typeof email !== 'string' ||
      typeof password !== 'string' || typeof department !== 'string'
    ) {
      return ApiResponse.error(
        res,
        'Please provide all required fields: name, email, password, department as valid strings.',
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

    // Validate role
    if (!USER_ROLES.includes(role)) {
      return ApiResponse.error(
        res,
        `Invalid role: ${role}. Supported roles are: ${USER_ROLES.join(', ')}`,
        400
      );
    }

    // Check if user already exists
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return ApiResponse.error(
        res,
        `An account with email ${normalizedEmail} is already registered.`,
        409
      );
    }

    // Create and persist user (pre-save hook hashes password)
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role,
      department: department.trim(),
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    return ApiResponse.success(
      res,
      {
        user: user.toJSON(),
        token,
      },
      'User registered successfully.',
      201
    );
  } catch (error) {
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
  getMe,
};
