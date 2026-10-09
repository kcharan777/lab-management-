const { StudentRegistry, User } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { validateRollNumberFormat } = require('../utils/studentVerifier');

/**
 * @route   GET /api/student-registry
 * @desc    Get authorized student registry list
 * @access  Private (MAIN_ADMIN)
 */
const getRegistryStudents = async (req, res, next) => {
  try {
    const { department, isRegistered, search } = req.query;
    const query = {};

    if (department && department !== 'ALL') {
      query.department = department;
    }

    if (isRegistered !== undefined && isRegistered !== 'ALL') {
      query.isRegistered = isRegistered === 'true';
    }

    if (search && search.trim()) {
      query.$or = [
        { rollNumber: { $regex: search.trim(), $options: 'i' } },
        { name: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const students = await StudentRegistry.find(query)
      .sort({ rollNumber: 1 })
      .populate('registeredUserId', 'email createdAt')
      .lean();

    return ApiResponse.success(res, students, 'Student registry records retrieved.');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/student-registry
 * @desc    Add single student to authorized registry
 * @access  Private (MAIN_ADMIN)
 */
const addStudentToRegistry = async (req, res, next) => {
  try {
    const { rollNumber, name, department, batch = '2024-2028' } = req.body;

    if (!rollNumber || !name || !department) {
      return ApiResponse.error(res, 'Roll number, name, and department are required.', 400);
    }

    const validation = validateRollNumberFormat(rollNumber);
    if (!validation.isValid) {
      return ApiResponse.error(res, validation.error, 400);
    }

    const normalizedRoll = validation.normalized;

    const existing = await StudentRegistry.findOne({ rollNumber: normalizedRoll });
    if (existing) {
      return ApiResponse.error(res, `Roll number '${normalizedRoll}' is already in registry.`, 409);
    }

    // Check if an existing User already holds this roll number
    const existingUser = await User.findOne({ rollNumber: normalizedRoll });

    const entry = new StudentRegistry({
      rollNumber: normalizedRoll,
      name: name.trim(),
      department: department.trim(),
      batch: batch.trim(),
      isRegistered: !!existingUser,
      registeredUserId: existingUser ? existingUser._id : null,
    });

    await entry.save();

    return ApiResponse.success(res, entry, 'Student added to registry successfully.', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/student-registry/bulk
 * @desc    Bulk upload / authorize students into registry
 * @access  Private (MAIN_ADMIN)
 */
const bulkAddStudentsToRegistry = async (req, res, next) => {
  try {
    const { students = [] } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return ApiResponse.error(res, 'Please provide an array of student objects.', 400);
    }

    const inserted = [];
    const skipped = [];

    for (const s of students) {
      if (!s.rollNumber || !s.name || !s.department) {
        skipped.push({ ...s, reason: 'Missing rollNumber, name, or department' });
        continue;
      }

      const val = validateRollNumberFormat(s.rollNumber);
      if (!val.isValid) {
        skipped.push({ ...s, reason: val.error });
        continue;
      }

      const normalized = val.normalized;
      const exists = await StudentRegistry.findOne({ rollNumber: normalized });
      if (exists) {
        skipped.push({ ...s, reason: 'Already in registry' });
        continue;
      }

      const user = await User.findOne({ rollNumber: normalized });
      const entry = await StudentRegistry.create({
        rollNumber: normalized,
        name: s.name.trim(),
        department: s.department.trim(),
        batch: s.batch ? s.batch.trim() : '2024-2028',
        isRegistered: !!user,
        registeredUserId: user ? user._id : null,
      });

      inserted.push(entry);
    }

    return ApiResponse.success(
      res,
      { insertedCount: inserted.length, skippedCount: skipped.length, skipped },
      `Authorized ${inserted.length} students into institutional registry.`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/student-registry/:id
 * @desc    Delete entry from student registry
 * @access  Private (MAIN_ADMIN)
 */
const removeStudentFromRegistry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const entry = await StudentRegistry.findByIdAndDelete(id);

    if (!entry) {
      return ApiResponse.error(res, 'Student registry record not found.', 404);
    }

    return ApiResponse.success(res, null, `Student '${entry.rollNumber}' removed from registry.`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRegistryStudents,
  addStudentToRegistry,
  bulkAddStudentsToRegistry,
  removeStudentFromRegistry,
};
