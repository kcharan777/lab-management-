const {
  Complaint,
  StatusHistory,
  Notification,
  User,
} = require('../models');
const ApiResponse = require('../utils/apiResponse');

/**
 * Helper to find complaint by MongoDB _id or sequential complaintId
 */
const findComplaint = async (id) => {
  if (id.startsWith('CMP-') || id.startsWith('LP-')) {
    return await Complaint.findOne({ complaintId: id });
  }
  return await Complaint.findById(id);
};

/**
 * @route   GET /api/hod/complaints/pending
 * @desc    Get all complaints awaiting HOD verification
 * @access  Private (HOD, MAIN_ADMIN)
 */
const getPendingComplaints = async (req, res, next) => {
  try {
    const query = {
      status: { $in: ['HOD_VERIFICATION', 'SUBMITTED'] },
    };

    // If caller is HOD, filter by department
    if (req.user.role === 'HOD' && req.user.department) {
      const deptStudents = await User.find({ department: req.user.department }).select('_id');
      query.studentId = { $in: deptStudents.map((s) => s._id) };
    }

    const complaints = await Complaint.find(query)
      .sort({ createdAt: -1 })
      .populate('studentId', 'name email department')
      .lean();

    return ApiResponse.success(
      res,
      {
        complaints,
        total: complaints.length,
      },
      'Pending HOD complaints retrieved successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/hod/complaints/:id/verify
 * @desc    Verify a student complaint and escalate to Lab Incharge
 * @access  Private (HOD, MAIN_ADMIN)
 */
const verifyComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks = 'Verified by HOD. Forwarded to Lab Incharge for hardware inspection.' } = req.body;

    const complaint = await findComplaint(id);
    if (!complaint) {
      return ApiResponse.error(res, 'Complaint not found.', 404);
    }

    // Validate state transition: Must be awaiting HOD verification
    if (!['HOD_VERIFICATION', 'SUBMITTED'].includes(complaint.status)) {
      return ApiResponse.error(
        res,
        `Invalid transition. Cannot verify complaint in status: ${complaint.status}. Expected HOD_VERIFICATION.`,
        400
      );
    }

    // Update Complaint state
    complaint.status = 'LAB_INCHARGE_VERIFICATION';
    complaint.hodVerification = {
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
      action: 'VERIFIED',
      remarks: remarks.trim(),
    };

    await complaint.save();

    // Record immutable audit history
    await StatusHistory.create({
      complaintId: complaint._id,
      status: 'LAB_INCHARGE_VERIFICATION',
      updatedBy: req.user._id,
      remarks: remarks.trim(),
    });

    // Notify Student
    await Notification.create({
      recipient: complaint.studentId,
      complaintId: complaint._id,
      title: 'Complaint Verified by HOD',
      message: `Your grievance ${complaint.complaintId} has been verified by the HOD and forwarded to Lab Incharge for equipment inspection.`,
      type: 'STATUS_UPDATE',
    });

    // Notify Lab Incharge(s)
    const inchargeUsers = await User.find({
      role: 'LAB_INCHARGE',
      department: req.user.department,
    }).select('_id');

    if (inchargeUsers.length > 0) {
      const inchargeNotifications = inchargeUsers.map((inc) => ({
        recipient: inc._id,
        complaintId: complaint._id,
        title: 'New Complaint for Lab Incharge Verification',
        message: `Complaint ${complaint.complaintId} in ${complaint.labName} verified by HOD and awaiting your inspection.`,
        type: 'VERIFICATION_REQUIRED',
      }));
      await Notification.insertMany(inchargeNotifications);
    }

    return ApiResponse.success(
      res,
      complaint,
      'Complaint successfully verified by HOD and routed to Lab Incharge.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/hod/complaints/:id/reject
 * @desc    Reject a student complaint with required remarks
 * @access  Private (HOD, MAIN_ADMIN)
 */
const rejectComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    if (!remarks || remarks.trim().length < 5) {
      return ApiResponse.error(
        res,
        'Rejection remarks are mandatory and must be at least 5 characters.',
        400
      );
    }

    const complaint = await findComplaint(id);
    if (!complaint) {
      return ApiResponse.error(res, 'Complaint not found.', 404);
    }

    // Validate state transition
    if (!['HOD_VERIFICATION', 'SUBMITTED'].includes(complaint.status)) {
      return ApiResponse.error(
        res,
        `Invalid transition. Cannot reject complaint in status: ${complaint.status}. Expected HOD_VERIFICATION.`,
        400
      );
    }

    // Update Complaint state to terminal REJECTED
    complaint.status = 'REJECTED';
    complaint.hodVerification = {
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
      action: 'REJECTED',
      remarks: remarks.trim(),
    };

    await complaint.save();

    // Record immutable audit history
    await StatusHistory.create({
      complaintId: complaint._id,
      status: 'REJECTED',
      updatedBy: req.user._id,
      remarks: `Rejected by HOD: ${remarks.trim()}`,
    });

    // Notify Student of rejection with reason
    await Notification.create({
      recipient: complaint.studentId,
      complaintId: complaint._id,
      title: 'Complaint Rejected by HOD',
      message: `Your grievance ${complaint.complaintId} was rejected by HOD. Remarks: ${remarks.trim()}`,
      type: 'REJECTION',
    });

    return ApiResponse.success(
      res,
      complaint,
      'Complaint has been rejected and student notified.'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPendingComplaints,
  verifyComplaint,
  rejectComplaint,
};
