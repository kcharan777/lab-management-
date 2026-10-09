const {
  Complaint,
  StatusHistory,
  Notification,
  User,
} = require('../models');
const ApiResponse = require('../utils/apiResponse');

const findComplaint = async (id) => {
  if (id.startsWith('CMP-') || id.startsWith('LP-')) {
    return await Complaint.findOne({ complaintId: id });
  }
  return await Complaint.findById(id);
};

/**
 * @route   GET /api/hod/complaints/pending
 * @desc    Step 3: Get all requests verified by Lab In-Charge awaiting HOD review
 * @access  Private (HOD, MAIN_ADMIN)
 */
const getPendingComplaints = async (req, res, next) => {
  try {
    const query = {
      status: { $in: ['LAB_INCHARGE_APPROVED', 'HOD_VERIFICATION'] },
    };

    // Scoped strictly to the HOD's department
    if (req.user.role === 'HOD' && req.user.department) {
      query.department = req.user.department;
    }

    const complaints = await Complaint.find(query)
      .sort({ createdAt: -1 })
      .populate('reporter', 'name email department rollNumber phone')
      .populate('labInchargeVerification.verifiedBy', 'name role email department')
      .populate('labId', 'name code location status')
      .lean();

    return ApiResponse.success(
      res,
      {
        complaints,
        total: complaints.length,
      },
      'Pending HOD review requests retrieved successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/hod/complaints/all
 * @desc    Get all department requests for HOD dashboard (awaiting review, approved, active repairs, resolved)
 * @access  Private (HOD, MAIN_ADMIN)
 */
const getAllDepartmentComplaints = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (req.user.role === 'HOD' && req.user.department) {
      query.department = req.user.department;
    }

    if (status && status !== 'ALL') {
      query.status = status;
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
      .populate('reporter', 'name email rollNumber')
      .populate('labInchargeVerification.verifiedBy', 'name role')
      .populate('hodVerification.verifiedBy', 'name role')
      .populate('adminAction.assignedAssistant', 'name role phone')
      .lean();

    // Summary counts for HOD dashboard
    const all = await Complaint.find(
      req.user.role === 'HOD' ? { department: req.user.department } : {}
    ).select('status').lean();

    const stats = {
      awaitingReview: all.filter(c => ['LAB_INCHARGE_APPROVED', 'HOD_VERIFICATION'].includes(c.status)).length,
      approvedToAdmin: all.filter(c => c.status === 'HOD_APPROVED').length,
      activeRepairs: all.filter(c => ['ADMIN_REVIEW', 'ASSIGNED_TO_REPAIR_ASSISTANT', 'IN_PROGRESS', 'ON_HOLD', 'ACCEPTED'].includes(c.status)).length,
      resolved: all.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status)).length,
      rejected: all.filter(c => c.status === 'REJECTED').length,
    };

    return ApiResponse.success(res, { complaints, stats }, 'Department requests retrieved.');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/hod/complaints/:id/verify
 * @desc    Step 3: HOD approves request -> status HOD_APPROVED -> forwarded to Admin
 * @access  Private (HOD, MAIN_ADMIN)
 */
const verifyComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks = 'Departmental approval granted. Forwarded to Admin for work order generation and repair dispatch.' } = req.body;

    const complaint = await findComplaint(id);
    if (!complaint) {
      return ApiResponse.error(res, 'Complaint record not found.', 404);
    }

    // Department isolation
    if (req.user.role === 'HOD' && complaint.department !== req.user.department) {
      return ApiResponse.error(res, `Forbidden: You can only approve requests in your department (${req.user.department}).`, 403);
    }

    // Must be verified by Lab In-Charge first
    const validStates = ['LAB_INCHARGE_APPROVED', 'HOD_VERIFICATION'];
    if (!validStates.includes(complaint.status)) {
      return ApiResponse.error(
        res,
        `Invalid transition. Cannot approve request in status '${complaint.status}'. Expected LAB_INCHARGE_APPROVED.`,
        400
      );
    }

    const previousStatus = complaint.status;
    const newStatus = 'HOD_APPROVED';

    complaint.status = newStatus;
    complaint.hodVerification = {
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
      action: 'APPROVED',
      remarks: remarks.trim(),
    };

    await complaint.save();

    // Immutable timeline record
    await StatusHistory.create({
      complaintId: complaint._id,
      action: 'HOD_APPROVED',
      previousStatus,
      newStatus,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      remarks: remarks.trim(),
    });

    // Step 4 Notification: Admin receives notification
    const admins = await User.find({ role: 'MAIN_ADMIN', isActive: true });
    for (const admin of admins) {
      await Notification.create({
        recipient: admin._id,
        sender: req.user._id,
        complaintId: complaint._id,
        complaintCustomId: complaint.complaintId,
        title: 'Repair Request Approved by HOD',
        message: 'A laboratory repair request has been approved by the HOD and requires action.',
        type: 'HOD_APPROVED',
        link: `/admin-console?id=${complaint.complaintId}`,
      });
    }

    // Notify reporter
    if (complaint.reporter) {
      await Notification.create({
        recipient: complaint.reporter,
        sender: req.user._id,
        complaintId: complaint._id,
        complaintCustomId: complaint.complaintId,
        title: 'Departmental Approval Granted',
        message: `Your request ${complaint.complaintId} was approved by HOD (${complaint.department}) and forwarded to Admin for repair dispatch.`,
        type: 'STATUS_UPDATE',
        link: `/student-hub?id=${complaint.complaintId}`,
      });
    }

    return ApiResponse.success(
      res,
      complaint,
      `Request ${complaint.complaintId} approved by HOD and forwarded to Admin.`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/hod/complaints/:id/reject
 * @desc    Step 3: HOD rejects request with mandatory reason
 * @access  Private (HOD, MAIN_ADMIN)
 */
const rejectComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    if (!remarks || !remarks.trim() || remarks.trim().length < 5) {
      return ApiResponse.error(res, 'Rejection reason is mandatory (minimum 5 characters).', 400);
    }

    const complaint = await findComplaint(id);
    if (!complaint) {
      return ApiResponse.error(res, 'Complaint record not found.', 404);
    }

    if (req.user.role === 'HOD' && complaint.department !== req.user.department) {
      return ApiResponse.error(res, `Forbidden: You can only reject requests in your department (${req.user.department}).`, 403);
    }

    const previousStatus = complaint.status;
    const newStatus = 'REJECTED';

    complaint.status = newStatus;
    complaint.rejectionReason = remarks.trim();
    complaint.hodVerification = {
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
      action: 'REJECTED',
      remarks: remarks.trim(),
    };

    await complaint.save();

    await StatusHistory.create({
      complaintId: complaint._id,
      action: 'HOD_REJECTED',
      previousStatus,
      newStatus,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      remarks: remarks.trim(),
      rejectionReason: remarks.trim(),
    });

    if (complaint.reporter) {
      await Notification.create({
        recipient: complaint.reporter,
        sender: req.user._id,
        complaintId: complaint._id,
        complaintCustomId: complaint.complaintId,
        title: 'Request Rejected by HOD',
        message: `Your request ${complaint.complaintId} was rejected by HOD: "${remarks.trim()}".`,
        type: 'REJECTED',
        link: `/student-hub?id=${complaint.complaintId}`,
      });
    }

    return ApiResponse.success(res, complaint, `Request ${complaint.complaintId} rejected.`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPendingComplaints,
  getAllDepartmentComplaints,
  verifyComplaint,
  rejectComplaint,
};
