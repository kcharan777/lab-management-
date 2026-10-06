const {
  Complaint,
  StatusHistory,
  Notification,
  User,
  ISSUE_CATEGORIES,
  PRIORITY_LEVELS,
} = require('../models');
const { generateComplaintId } = require('../utils/complaintIdGenerator');
const ApiResponse = require('../utils/apiResponse');

/**
 * @route   POST /api/complaints
 * @desc    Submit a new laboratory complaint
 * @access  Private (STUDENT)
 */
const createComplaint = async (req, res, next) => {
  try {
    const {
      labName,
      systemNumber,
      issueCategory = 'HARDWARE',
      priority = 'MEDIUM',
      description,
      imageUrl = null,
      remarks = null,
    } = req.body;

    // Validate required fields
    if (!labName || !labName.trim()) {
      return ApiResponse.error(res, 'Allocated laboratory name is required.', 400);
    }

    if (!systemNumber || !systemNumber.trim()) {
      return ApiResponse.error(res, 'Equipment ID or system number is required.', 400);
    }

    if (!description || description.trim().length < 5) {
      return ApiResponse.error(
        res,
        'Issue description must be at least 5 characters in length.',
        400
      );
    }

    // Validate enum fields
    const categoryUpper = issueCategory.toUpperCase();
    if (!ISSUE_CATEGORIES.includes(categoryUpper)) {
      return ApiResponse.error(
        res,
        `Invalid category. Valid options: ${ISSUE_CATEGORIES.join(', ')}`,
        400
      );
    }

    const priorityUpper = priority.toUpperCase();
    if (!PRIORITY_LEVELS.includes(priorityUpper)) {
      return ApiResponse.error(
        res,
        `Invalid priority. Valid options: ${PRIORITY_LEVELS.join(', ')}`,
        400
      );
    }

    // Generate unique institutional complaint ID (e.g. CMP-2026-0001)
    const complaintId = await generateComplaintId();

    // Create complaint
    const complaint = new Complaint({
      complaintId,
      studentId: req.user._id,
      labName: labName.trim(),
      systemNumber: systemNumber.trim(),
      issueCategory: categoryUpper,
      priority: priorityUpper,
      description: description.trim(),
      imageUrl: imageUrl ? imageUrl.trim() : null,
      status: 'HOD_VERIFICATION', // Initial state ready for HOD verification
    });

    await complaint.save();

    // Record initial Submission in StatusHistory
    await StatusHistory.create([
      {
        complaintId: complaint._id,
        status: 'SUBMITTED',
        updatedBy: req.user._id,
        remarks: remarks?.trim() || 'Complaint logged by student via Student Portal.',
      },
      {
        complaintId: complaint._id,
        status: 'HOD_VERIFICATION',
        updatedBy: req.user._id,
        remarks: 'Directly routed for HOD verification.',
      },
    ]);

    // Create In-App Notification for HOD
    const hodUsers = await User.find({
      role: 'HOD',
      department: req.user.department,
    }).select('_id');

    if (hodUsers.length > 0) {
      const notifications = hodUsers.map((h) => ({
        recipient: h._id,
        complaintId: complaint._id,
        title: 'New Complaint Pending Verification',
        message: `Complaint ${complaint.complaintId} in ${complaint.labName} requires your verification.`,
        type: 'VERIFICATION_REQUIRED',
      }));
      await Notification.insertMany(notifications);
    }

    // Create confirmation notification for the Student
    await Notification.create({
      recipient: req.user._id,
      complaintId: complaint._id,
      title: 'Complaint Registered Successfully',
      message: `Your grievance ${complaint.complaintId} has been logged and routed to the HOD for verification.`,
      type: 'STATUS_UPDATE',
    });

    return ApiResponse.success(
      res,
      complaint,
      'Complaint created and routed for HOD verification successfully.',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/complaints/my
 * @desc    Get all complaints created by the authenticated student
 * @access  Private (STUDENT)
 */
const getMyComplaints = async (req, res, next) => {
  try {
    const { status, category, search } = req.query;

    const query = { studentId: req.user._id };

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (category && category !== 'ALL') {
      query.issueCategory = category.toUpperCase();
    }

    if (search && search.trim()) {
      query.$or = [
        { complaintId: { $regex: search.trim(), $options: 'i' } },
        { labName: { $regex: search.trim(), $options: 'i' } },
        { systemNumber: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const complaints = await Complaint.find(query)
      .sort({ createdAt: -1 })
      .populate('studentId', 'name email department')
      .lean();

    // Calculate quick telemetry / KPI metrics for the student hub
    const allUserComplaints = await Complaint.find({ studentId: req.user._id }).select('status').lean();
    
    const kpis = {
      total: allUserComplaints.length,
      awaitingVerification: allUserComplaints.filter(c =>
        ['SUBMITTED', 'HOD_VERIFICATION', 'LAB_INCHARGE_VERIFICATION'].includes(c.status)
      ).length,
      inProgress: allUserComplaints.filter(c =>
        ['ASSIGNED_TO_MAIN_ADMIN', 'ACCEPTED', 'IN_PROGRESS'].includes(c.status)
      ).length,
      resolved: allUserComplaints.filter(c =>
        ['RESOLVED', 'CLOSED'].includes(c.status)
      ).length,
      rejected: allUserComplaints.filter(c => c.status === 'REJECTED').length,
    };

    return ApiResponse.success(
      res,
      {
        complaints,
        kpis,
      },
      'Student complaints retrieved successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/complaints/:id
 * @desc    Get detailed complaint data with lifecycle audit history
 * @access  Private (Owner Student or Staff Roles)
 */
const getComplaintById = async (req, res, next) => {
  try {
    // req.complaint is already fetched & ownership-verified by checkComplaintAccess
    const complaintId = req.complaint._id;

    const detailedComplaint = await Complaint.findById(complaintId)
      .populate('studentId', 'name email department')
      .populate('hodVerification.verifiedBy', 'name role department')
      .populate('labInchargeVerification.verifiedBy', 'name role department')
      .populate('mainAdminAction.acceptedBy', 'name role department')
      .populate('mainAdminAction.progressNotes.updatedBy', 'name role')
      .populate('resolvedBy', 'name role department')
      .lean();

    // Fetch chronological status history audit trail
    const history = await StatusHistory.find({ complaintId })
      .sort({ createdAt: 1 })
      .populate('updatedBy', 'name role department')
      .lean();

    return ApiResponse.success(
      res,
      {
        complaint: detailedComplaint,
        history,
      },
      'Complaint details and lifecycle history retrieved successfully.'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComplaint,
  getMyComplaints,
  getComplaintById,
};
