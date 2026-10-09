const { Lab, Department, User } = require('../models');
const ApiResponse = require('../utils/apiResponse');

/**
 * @route   GET /api/labs
 * @desc    Get all campus laboratories with optional department & status filtering
 * @access  Private
 */
const getLabs = async (req, res, next) => {
  try {
    const { department, status, search } = req.query;
    const query = {};

    if (department && department !== 'ALL') {
      query.department = department;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { code: { $regex: search.trim(), $options: 'i' } },
        { location: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const labs = await Lab.find(query)
      .sort({ department: 1, name: 1 })
      .populate('incharge', 'name email department')
      .lean();

    return ApiResponse.success(res, labs, 'Laboratories retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/labs/:id
 * @desc    Get single laboratory details with historical audit log
 * @access  Private
 */
const getLabById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lab = await Lab.findById(id).populate('incharge', 'name email phone department');

    if (!lab) {
      return ApiResponse.error(res, 'Laboratory record not found.', 404);
    }

    return ApiResponse.success(res, lab, 'Laboratory details retrieved.');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/labs
 * @desc    Create a new campus laboratory dynamically
 * @access  Private (MAIN_ADMIN)
 */
const createLab = async (req, res, next) => {
  try {
    const {
      name,
      code,
      department,
      location,
      description = '',
      status = 'OPERATIONAL',
      capacity = 30,
      systemsCount = 30,
      inchargeId = null,
    } = req.body;

    if (!name || !code || !department || !location) {
      return ApiResponse.error(
        res,
        'Please provide all required fields: name, code, department, and location.',
        400
      );
    }

    // Verify uniqueness of name and code
    const existing = await Lab.findOne({
      $or: [{ name: name.trim() }, { code: code.trim().toUpperCase() }],
    });

    if (existing) {
      return ApiResponse.error(
        res,
        `A laboratory with name '${name}' or code '${code}' already exists.`,
        409
      );
    }

    const lab = new Lab({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      department: department.trim(),
      location: location.trim(),
      description: description.trim(),
      status,
      capacity: Number(capacity) || 30,
      systemsCount: Number(systemsCount) || 30,
      incharge: inchargeId || null,
      history: [
        {
          action: 'CREATED',
          performedBy: req.user._id,
          performedByName: req.user.name,
          details: `Laboratory created and provisioned under ${department} department.`,
          timestamp: new Date(),
        },
      ],
    });

    await lab.save();

    return ApiResponse.success(res, lab, 'Laboratory created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/labs/:id
 * @desc    Update an existing laboratory
 * @access  Private (MAIN_ADMIN)
 */
const updateLab = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      department,
      location,
      description,
      status,
      capacity,
      systemsCount,
      inchargeId,
    } = req.body;

    const lab = await Lab.findById(id);
    if (!lab) {
      return ApiResponse.error(res, 'Laboratory record not found.', 404);
    }

    const historyChanges = [];

    if (name && name.trim() !== lab.name) {
      historyChanges.push(`Name changed from '${lab.name}' to '${name.trim()}'`);
      lab.name = name.trim();
    }
    if (code && code.trim().toUpperCase() !== lab.code) {
      historyChanges.push(`Code changed from '${lab.code}' to '${code.trim().toUpperCase()}'`);
      lab.code = code.trim().toUpperCase();
    }
    if (department && department.trim() !== lab.department) {
      historyChanges.push(`Department reassigned from '${lab.department}' to '${department.trim()}'`);
      lab.department = department.trim();
    }
    if (location && location.trim() !== lab.location) {
      historyChanges.push(`Location updated to '${location.trim()}'`);
      lab.location = location.trim();
    }
    if (status && status !== lab.status) {
      historyChanges.push(`Status changed from '${lab.status}' to '${status}'`);
      lab.status = status;
    }
    if (description !== undefined) {
      lab.description = description.trim();
    }
    if (capacity !== undefined) {
      lab.capacity = Number(capacity);
    }
    if (systemsCount !== undefined) {
      lab.systemsCount = Number(systemsCount);
    }
    if (inchargeId !== undefined) {
      lab.incharge = inchargeId || null;
      historyChanges.push('Lab In-Charge assignment updated');
    }

    if (historyChanges.length > 0) {
      lab.history.push({
        action: 'UPDATED',
        performedBy: req.user._id,
        performedByName: req.user.name,
        details: historyChanges.join('; '),
        timestamp: new Date(),
      });
    }

    await lab.save();

    return ApiResponse.success(res, lab, 'Laboratory updated successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/labs/:id
 * @desc    Delete or decommission a laboratory
 * @access  Private (MAIN_ADMIN)
 */
const deleteLab = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lab = await Lab.findById(id);

    if (!lab) {
      return ApiResponse.error(res, 'Laboratory record not found.', 404);
    }

    await Lab.findByIdAndDelete(id);

    return ApiResponse.success(res, null, `Laboratory '${lab.name}' decommissioned successfully.`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLabs,
  getLabById,
  createLab,
  updateLab,
  deleteLab,
};
