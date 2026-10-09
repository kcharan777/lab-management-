const { User, USER_ROLES, Department, Complaint } = require('../models');
const ApiResponse = require('../utils/apiResponse');

/**
 * @route   GET /api/users
 * @desc    Get system users filtered by role & department
 * @access  Private (MAIN_ADMIN)
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, department, search, isActive } = req.query;
    const query = {};

    if (role && role !== 'ALL') {
      query.role = role.toUpperCase();
    }

    if (department && department !== 'ALL') {
      query.department = department;
    }

    if (isActive !== undefined && isActive !== 'ALL') {
      query.isActive = isActive === 'true';
    }

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { rollNumber: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const users = await User.find(query).sort({ role: 1, name: 1 }).lean();

    return ApiResponse.success(res, users, 'Users retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/users
 * @desc    Admin provisions authorized faculty/staff account (HOD, LAB_INCHARGE, REPAIR_ASSISTANT)
 * @access  Private (MAIN_ADMIN)
 */
const createUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role,
      department,
      phone = '',
      specialization = '',
    } = req.body;

    // Validate inputs
    if (!name || !email || !password || !role || !department) {
      return ApiResponse.error(
        res,
        'Please provide all required fields: name, email, password, role, and department.',
        400
      );
    }

    const requestedRole = role.toUpperCase().trim();

    // STRICT SINGLE ADMIN RULE ENFORCEMENT:
    if (requestedRole === 'MAIN_ADMIN') {
      return ApiResponse.error(
        res,
        'Security policy violation: Creation of additional Admin accounts is forbidden. Exactly ONE Admin is permitted in the system.',
        403
      );
    }

    // STRICT SINGLE HOD PER DEPARTMENT ENFORCEMENT:
    if (requestedRole === 'HOD') {
      const existingHOD = await User.findOne({
        role: 'HOD',
        department: department.trim(),
      });
      if (existingHOD) {
        return ApiResponse.error(
          res,
          `Department '${department}' already has an authorized HOD (${existingHOD.name} - ${existingHOD.email}). Only ONE HOD account is allowed per department.`,
          409
        );
      }
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return ApiResponse.error(
        res,
        `An account with email '${normalizedEmail}' already exists.`,
        409
      );
    }

    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: requestedRole,
      department: department.trim(),
      phone: phone.trim() || null,
      specialization: specialization.trim() || null,
      isActive: true,
    });

    await newUser.save();

    // If HOD, update the department model's HOD reference
    if (requestedRole === 'HOD') {
      await Department.findOneAndUpdate(
        { $or: [{ name: department.trim() }, { code: department.trim().toUpperCase() }] },
        { hod: newUser._id }
      );
    }

    return ApiResponse.success(res, newUser.toJSON(), `${requestedRole} account created successfully.`, 201);
  } catch (error) {
    if (error.code === 11000) {
      return ApiResponse.error(
        res,
        'Unique constraint violation: Single admin or single HOD per department conflict.',
        409
      );
    }
    next(error);
  }
};

/**
 * @route   PUT /api/users/:id
 * @desc    Update staff or faculty account details
 * @access  Private (MAIN_ADMIN)
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, department, role, phone, specialization, isActive, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return ApiResponse.error(res, 'User record not found.', 404);
    }

    // Never allow promoting another user to MAIN_ADMIN
    if (role && role.toUpperCase() === 'MAIN_ADMIN' && user.role !== 'MAIN_ADMIN') {
      return ApiResponse.error(
        res,
        'Security policy violation: Cannot promote user to Admin. Exactly ONE Admin is permitted.',
        403
      );
    }

    // Check Single HOD per department constraint if role or department is being modified to HOD
    if ((role === 'HOD' || user.role === 'HOD') && department && department !== user.department) {
      const existingHOD = await User.findOne({
        role: 'HOD',
        department: department.trim(),
        _id: { $ne: user._id },
      });
      if (existingHOD) {
        return ApiResponse.error(
          res,
          `Department '${department}' already has a designated HOD (${existingHOD.name}).`,
          409
        );
      }
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (department) user.department = department.trim();
    if (phone !== undefined) user.phone = phone ? phone.trim() : null;
    if (specialization !== undefined) user.specialization = specialization ? specialization.trim() : null;
    if (isActive !== undefined) user.isActive = isActive;
    if (password && password.length >= 6) {
      user.password = password; // pre-save hook will hash
    }

    await user.save();

    return ApiResponse.success(res, user.toJSON(), 'User account updated successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/users/:id/toggle-status
 * @desc    Activate or deactivate user account
 * @access  Private (MAIN_ADMIN)
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return ApiResponse.error(res, 'User not found.', 404);
    }

    // Protect single Admin from accidental deactivation
    if (user.role === 'MAIN_ADMIN') {
      return ApiResponse.error(res, 'The primary system administrator account cannot be deactivated.', 400);
    }

    user.isActive = !user.isActive;
    await user.save();

    return ApiResponse.success(
      res,
      user.toJSON(),
      `User account ${user.isActive ? 'activated' : 'deactivated'} successfully.`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/users/repair-assistants
 * @desc    Get dynamic list of active Repair Assistants for assigning tasks
 * @access  Private (MAIN_ADMIN, HOD, LAB_INCHARGE)
 */
const getRepairAssistants = async (req, res, next) => {
  try {
    const assistants = await User.find({
      role: 'REPAIR_ASSISTANT',
      isActive: true,
    })
      .select('name email phone department specialization')
      .sort({ name: 1 })
      .lean();

    // Also calculate task loads for each assistant
    const enriched = await Promise.all(
      assistants.map(async (ast) => {
        const activeCount = await Complaint.countDocuments({
          'adminAction.assignedAssistant': ast._id,
          status: { $in: ['ASSIGNED_TO_REPAIR_ASSISTANT', 'IN_PROGRESS', 'ACCEPTED'] },
        });
        const completedCount = await Complaint.countDocuments({
          'adminAction.assignedAssistant': ast._id,
          status: { $in: ['RESOLVED', 'CLOSED'] },
        });
        return {
          ...ast,
          activeTasks: activeCount,
          completedTasks: completedCount,
        };
      })
    );

    return ApiResponse.success(res, enriched, 'Repair assistants retrieved.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  getRepairAssistants,
};
