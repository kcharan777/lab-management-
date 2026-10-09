const {
  Complaint,
  StatusHistory,
  Notification,
  User,
  Lab,
  ISSUE_CATEGORIES,
  PRIORITY_LEVELS,
} = require('../models');
const { generateComplaintId } = require('../utils/complaintIdGenerator');
const ApiResponse = require('../utils/apiResponse');

/**
 * @route   POST /api/complaints
 * @desc    Step 1: Submit a new laboratory problem/repair request
 * @access  Private (STUDENT, LAB_INCHARGE, MAIN_ADMIN)
 */
const createComplaint = async (req, res, next) => {
  try {
    const {
      title,
      labName,
      labId,
      department,
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

    const targetDept = department ? department.trim() : (req.user.department || 'General');

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

    // Generate unique institutional complaint ID (e.g. LP-2026-0001)
    const complaintId = await generateComplaintId();

    // Verify if labId exists
    let verifiedLabId = null;
    if (labId) {
      const foundLab = await Lab.findById(labId);
      if (foundLab) verifiedLabId = foundLab._id;
    } else {
      const foundLabByName = await Lab.findOne({ name: labName.trim() });
      if (foundLabByName) verifiedLabId = foundLabByName._id;
    }

    // Step 1: Initial Status is SUBMITTED_TO_LAB_INCHARGE
    const initialStatus = 'SUBMITTED_TO_LAB_INCHARGE';

    const complaint = new Complaint({
      complaintId,
      title: title?.trim() || `${categoryUpper} issue at ${labName.trim()} (${systemNumber.trim()})`,
      reporter: req.user._id,
      reporterRole: req.user.role,
      studentId: req.user._id,
      department: targetDept,
      labId: verifiedLabId,
      labName: labName.trim(),
      systemNumber: systemNumber.trim(),
      issueCategory: categoryUpper,
      priority: priorityUpper,
      description: description.trim(),
      imageUrl: imageUrl ? imageUrl.trim() : null,
      status: initialStatus,
    });

    await complaint.save();

    // Record immutable activity timeline in StatusHistory
    await StatusHistory.create({
      complaintId: complaint._id,
      action: 'PROBLEM_REPORTED',
      previousStatus: null,
      newStatus: initialStatus,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      remarks: remarks?.trim() || `Problem reported by ${req.user.name} (${req.user.role}). Initial status: SUBMITTED_TO_LAB_INCHARGE.`,
    });

    // Step 2 Preparation: Notify Lab In-Charge(s) of that department
    const labIncharges = await User.find({
      role: 'LAB_INCHARGE',
      department: targetDept,
      isActive: true,
    });

    for (const incharge of labIncharges) {
      await Notification.create({
        recipient: incharge._id,
        sender: req.user._id,
        complaintId: complaint._id,
        complaintCustomId: complaint.complaintId,
        title: 'New Laboratory Repair Request',
        message: 'New laboratory repair request requires verification.',
        type: 'SUBMITTED_TO_LAB_INCHARGE',
        link: `/lab-incharge-queue?id=${complaint.complaintId}`,
      });
    }

    return ApiResponse.success(
      res,
      complaint,
      `Laboratory issue ${complaintId} reported successfully and queued for Lab In-Charge verification.`,
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/complaints/my
 * @desc    Get all complaints logged by the current authenticated user
 * @access  Private
 */
const getMyComplaints = async (req, res, next) => {
  try {
    const { status, category, priority, page = 1, limit = 20 } = req.query;

    const query = {
      $or: [{ reporter: req.user._id }, { studentId: req.user._id }],
    };

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (category && category !== 'ALL') {
      query.issueCategory = category.toUpperCase();
    }

    if (priority && priority !== 'ALL') {
      query.priority = priority.toUpperCase();
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .populate('labId', 'location status code')
        .populate('labInchargeVerification.verifiedBy', 'name role')
        .populate('hodVerification.verifiedBy', 'name role')
        .populate('adminAction.assignedAssistant', 'name role specialization')
        .populate('resolvedBy', 'name role')
        .lean(),
      Complaint.countDocuments(query),
    ]);

    // Calculate reporter telemetry
    const myAll = await Complaint.find(query).select('status').lean();
    const telemetry = {
      total: myAll.length,
      pending: myAll.filter(c => ['SUBMITTED_TO_LAB_INCHARGE', 'LAB_INCHARGE_APPROVED', 'HOD_APPROVED'].includes(c.status)).length,
      inProgress: myAll.filter(c => ['ADMIN_REVIEW', 'ASSIGNED_TO_REPAIR_ASSISTANT', 'IN_PROGRESS', 'ON_HOLD', 'ACCEPTED'].includes(c.status)).length,
      resolved: myAll.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status)).length,
      rejected: myAll.filter(c => c.status === 'REJECTED').length,
    };

    return ApiResponse.paginated(
      res,
      complaints,
      {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        telemetry,
      },
      'User complaint records retrieved successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/complaints/:id
 * @desc    Get detailed complaint record with complete immutable history
 * @access  Private
 */
const getComplaintById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let complaint;
    if (id.startsWith('CMP-') || id.startsWith('LP-')) {
      complaint = await Complaint.findOne({ complaintId: id });
    } else {
      complaint = await Complaint.findById(id);
    }

    if (!complaint) {
      return ApiResponse.error(res, 'Complaint record not found.', 404);
    }

    // Role-based Access Isolation:
    // Students can only see their own requests
    if (req.user.role === 'STUDENT') {
      const isOwner = (complaint.reporter && complaint.reporter.toString() === req.user._id.toString()) ||
                      (complaint.studentId && complaint.studentId.toString() === req.user._id.toString());
      if (!isOwner) {
        return ApiResponse.error(res, 'Access denied. You can only view your own repair requests.', 403);
      }
    }

    // HOD can only see their department
    if (req.user.role === 'HOD' && complaint.department !== req.user.department) {
      return ApiResponse.error(res, `Access denied. You can only view requests from ${req.user.department} department.`, 403);
    }

    // Lab In-Charge can only see their department
    if (req.user.role === 'LAB_INCHARGE' && complaint.department !== req.user.department) {
      return ApiResponse.error(res, `Access denied. You can only view requests from ${req.user.department} department.`, 403);
    }

    // Repair Assistant can only see tasks assigned to them or their department
    if (req.user.role === 'REPAIR_ASSISTANT') {
      const isAssigned = complaint.adminAction?.assignedAssistant?.toString() === req.user._id.toString();
      if (!isAssigned && complaint.department !== req.user.department) {
        return ApiResponse.error(res, 'Access denied. This repair task is not assigned to you.', 403);
      }
    }

    // Fetch immutable activity timeline
    const timeline = await StatusHistory.find({ complaintId: complaint._id })
      .sort({ createdAt: 1 })
      .populate('user', 'name role department')
      .lean();

    const populated = await Complaint.findById(complaint._id)
      .populate('reporter', 'name email role department rollNumber')
      .populate('studentId', 'name email role department rollNumber')
      .populate('labId', 'name code location status')
      .populate('labInchargeVerification.verifiedBy', 'name role department')
      .populate('hodVerification.verifiedBy', 'name role department')
      .populate('adminAction.reviewedBy', 'name role department')
      .populate('adminAction.assignedAssistant', 'name email phone specialization')
      .populate('adminAction.progressNotes.updatedBy', 'name role')
      .populate('resolvedBy', 'name role department')
      .lean();

    return ApiResponse.success(
      res,
      {
        complaint: populated,
        timeline,
      },
      'Complaint details and complete history retrieved successfully.'
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
