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
 * @route   GET /api/lab-incharge/complaints/pending
 * @desc    Get all complaints verified by HOD awaiting Lab Incharge verification
 * @access  Private (LAB_INCHARGE, MAIN_ADMIN)
 */
const getPendingComplaints = async (req, res, next) => {
  try {
    const query = {
      status: 'LAB_INCHARGE_VERIFICATION',
    };

    // If caller is LAB_INCHARGE, scope by department
    if (req.user.role === 'LAB_INCHARGE' && req.user.department) {
      const deptStudents = await User.find({ department: req.user.department }).select('_id');
      query.studentId = { $in: deptStudents.map((s) => s._id) };
    }

    const complaints = await Complaint.find(query)
      .sort({ createdAt: -1 })
      .populate('studentId', 'name email department')
      .populate('hodVerification.verifiedBy', 'name role department')
      .lean();

    return ApiResponse.success(
      res,
      {
        complaints,
        total: complaints.length,
      },
      'Pending Lab Incharge verification complaints retrieved successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/lab-incharge/complaints/:id/verify
 * @desc    Verify equipment inspection and escalate to Main Admin
 * @access  Private (LAB_INCHARGE, MAIN_ADMIN)
 */
const verifyComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      remarks = 'Hardware fault confirmed upon diagnostic inspection. Escalated to Main Admin for work order generation.',
    } = req.body;

    const complaint = await findComplaint(id);
    if (!complaint) {
      return ApiResponse.error(res, 'Complaint not found.', 404);
    }

    // Only complaints verified by HOD can reach this stage
    if (complaint.status !== 'LAB_INCHARGE_VERIFICATION') {
      return ApiResponse.error(
        res,
        `Invalid transition. Cannot verify complaint in status: ${complaint.status}. Expected LAB_INCHARGE_VERIFICATION.`,
        400
      );
    }

    // Update Complaint state to ASSIGNED_TO_MAIN_ADMIN
    complaint.status = 'ASSIGNED_TO_MAIN_ADMIN';
    complaint.labInchargeVerification = {
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
      action: 'VERIFIED',
      remarks: remarks.trim(),
    };

    await complaint.save();

    // Record immutable audit history
    await StatusHistory.create({
      complaintId: complaint._id,
      status: 'ASSIGNED_TO_MAIN_ADMIN',
      updatedBy: req.user._id,
      remarks: remarks.trim(),
    });

    // Notify Student
    await Notification.create({
      recipient: complaint.studentId,
      complaintId: complaint._id,
      title: 'Lab Incharge Verified & Assigned to Main Admin',
      message: `Your grievance ${complaint.complaintId} has been verified by the Lab Incharge and assigned to Campus Main Admin for work order execution.`,
      type: 'STATUS_UPDATE',
    });

    // Notify Main Admin(s)
    const adminUsers = await User.find({ role: 'MAIN_ADMIN' }).select('_id');
    if (adminUsers.length > 0) {
      const adminNotifications = adminUsers.map((adm) => ({
        recipient: adm._id,
        complaintId: complaint._id,
        title: 'New Verified Work Order in Intake',
        message: `Complaint ${complaint.complaintId} (${complaint.labName}) is verified and awaiting work order acceptance.`,
        type: 'ASSIGNMENT',
      }));
      await Notification.insertMany(adminNotifications);
    }

    return ApiResponse.success(
      res,
      complaint,
      'Complaint successfully verified by Lab Incharge and assigned to Main Admin.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/lab-incharge/complaints/:id/reject
 * @desc    Reject a complaint during equipment inspection with required remarks
 * @access  Private (LAB_INCHARGE, MAIN_ADMIN)
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

    // Must be in LAB_INCHARGE_VERIFICATION
    if (complaint.status !== 'LAB_INCHARGE_VERIFICATION') {
      return ApiResponse.error(
        res,
        `Invalid transition. Cannot reject complaint in status: ${complaint.status}. Expected LAB_INCHARGE_VERIFICATION.`,
        400
      );
    }

    // Update Complaint state to terminal REJECTED
    complaint.status = 'REJECTED';
    complaint.labInchargeVerification = {
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
      remarks: `Rejected by Lab Incharge: ${remarks.trim()}`,
    });

    // Notify Student of rejection with reason
    await Notification.create({
      recipient: complaint.studentId,
      complaintId: complaint._id,
      title: 'Complaint Rejected by Lab Incharge',
      message: `Your grievance ${complaint.complaintId} was rejected during Lab Incharge inspection. Remarks: ${remarks.trim()}`,
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
