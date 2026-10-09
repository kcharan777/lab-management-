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
 * @route   GET /api/lab-incharge/complaints/pending
 * @desc    Step 2: Get all requests awaiting Lab In-Charge review
 * @access  Private (LAB_INCHARGE, MAIN_ADMIN)
 */
const getPendingComplaints = async (req, res, next) => {
  try {
    const query = {
      status: { $in: ['SUBMITTED_TO_LAB_INCHARGE', 'LAB_INCHARGE_VERIFICATION', 'SUBMITTED'] },
    };

    // Scoped strictly to the Lab In-Charge's department
    if (req.user.role === 'LAB_INCHARGE' && req.user.department) {
      query.department = req.user.department;
    }

    const complaints = await Complaint.find(query)
      .sort({ createdAt: -1 })
      .populate('reporter', 'name email department rollNumber phone')
      .populate('studentId', 'name email department rollNumber phone')
      .populate('labId', 'name code location status')
      .lean();

    return ApiResponse.success(
      res,
      {
        complaints,
        total: complaints.length,
      },
      'Pending Lab In-Charge verification requests retrieved successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/lab-incharge/complaints/all
 * @desc    Get all requests belonging to Lab In-Charge's department for tracking progress & timeline
 * @access  Private (LAB_INCHARGE, MAIN_ADMIN)
 */
const getAllDepartmentComplaints = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (req.user.role === 'LAB_INCHARGE' && req.user.department) {
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
      .populate('adminAction.assignedAssistant', 'name role')
      .lean();

    // Summary counts for Lab In-Charge dashboard
    const all = await Complaint.find(
      req.user.role === 'LAB_INCHARGE' ? { department: req.user.department } : {}
    ).select('status').lean();

    const stats = {
      pendingReview: all.filter(c => ['SUBMITTED_TO_LAB_INCHARGE', 'LAB_INCHARGE_VERIFICATION'].includes(c.status)).length,
      approvedToHod: all.filter(c => c.status === 'LAB_INCHARGE_APPROVED').length,
      hodApproved: all.filter(c => c.status === 'HOD_APPROVED').length,
      inRepair: all.filter(c => ['ADMIN_REVIEW', 'ASSIGNED_TO_REPAIR_ASSISTANT', 'IN_PROGRESS', 'ON_HOLD', 'ACCEPTED'].includes(c.status)).length,
      resolved: all.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status)).length,
      rejected: all.filter(c => c.status === 'REJECTED').length,
    };

    return ApiResponse.success(res, { complaints, stats }, 'Department requests retrieved.');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/lab-incharge/complaints/:id/verify
 * @desc    Step 2: Lab In-Charge reviews and approves request -> status LAB_INCHARGE_APPROVED -> forwarded to HOD
 * @access  Private (LAB_INCHARGE, MAIN_ADMIN)
 */
const verifyComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks = 'Laboratory technical inspection completed. Hardware issue confirmed and escalated to HOD.' } = req.body;

    const complaint = await findComplaint(id);
    if (!complaint) {
      return ApiResponse.error(res, 'Complaint record not found.', 404);
    }

    // Department isolation check
    if (req.user.role === 'LAB_INCHARGE' && complaint.department !== req.user.department) {
      return ApiResponse.error(res, `Forbidden: You can only verify complaints in your department (${req.user.department}).`, 403);
    }

    // Allowed source states
    const validStates = ['SUBMITTED_TO_LAB_INCHARGE', 'LAB_INCHARGE_VERIFICATION', 'SUBMITTED'];
    if (!validStates.includes(complaint.status)) {
      return ApiResponse.error(
        res,
        `Invalid transition. Cannot verify request in status '${complaint.status}'. Expected SUBMITTED_TO_LAB_INCHARGE.`,
        400
      );
    }

    const previousStatus = complaint.status;
    const newStatus = 'LAB_INCHARGE_APPROVED';

    complaint.status = newStatus;
    complaint.labInchargeVerification = {
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
      action: 'APPROVED',
      remarks: remarks.trim(),
    };

    await complaint.save();

    // Record immutable activity history
    await StatusHistory.create({
      complaintId: complaint._id,
      action: 'LAB_INCHARGE_VERIFIED',
      previousStatus,
      newStatus,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      remarks: remarks.trim(),
    });

    // Step 3 Notification: HOD of that department receives notification
    const hodUsers = await User.find({
      role: 'HOD',
      department: complaint.department,
      isActive: true,
    });

    for (const hod of hodUsers) {
      await Notification.create({
        recipient: hod._id,
        sender: req.user._id,
        complaintId: complaint._id,
        complaintCustomId: complaint.complaintId,
        title: 'Laboratory Request Awaiting HOD Review',
        message: 'A laboratory repair request has been verified and requires your review.',
        type: 'LAB_INCHARGE_APPROVED',
        link: `/hod-queue?id=${complaint.complaintId}`,
      });
    }

    // Also notify reporter
    if (complaint.reporter) {
      await Notification.create({
        recipient: complaint.reporter,
        sender: req.user._id,
        complaintId: complaint._id,
        complaintCustomId: complaint.complaintId,
        title: 'Issue Verified by Lab In-Charge',
        message: `Your request ${complaint.complaintId} was verified by Lab In-Charge and forwarded to HOD for departmental approval.`,
        type: 'STATUS_UPDATE',
        link: `/student-hub?id=${complaint.complaintId}`,
      });
    }

    return ApiResponse.success(
      res,
      complaint,
      `Request ${complaint.complaintId} verified and forwarded to HOD for departmental approval.`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/lab-incharge/complaints/:id/reject
 * @desc    Step 2: Lab In-Charge rejects request with mandatory reason
 * @access  Private (LAB_INCHARGE, MAIN_ADMIN)
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

    if (req.user.role === 'LAB_INCHARGE' && complaint.department !== req.user.department) {
      return ApiResponse.error(res, `Forbidden: You can only reject complaints in your department (${req.user.department}).`, 403);
    }

    const previousStatus = complaint.status;
    const newStatus = 'REJECTED';

    complaint.status = newStatus;
    complaint.rejectionReason = remarks.trim();
    complaint.labInchargeVerification = {
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
      action: 'REJECTED',
      remarks: remarks.trim(),
    };

    await complaint.save();

    await StatusHistory.create({
      complaintId: complaint._id,
      action: 'LAB_INCHARGE_REJECTED',
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
        title: 'Laboratory Request Rejected',
        message: `Your request ${complaint.complaintId} was rejected by Lab In-Charge: "${remarks.trim()}".`,
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
