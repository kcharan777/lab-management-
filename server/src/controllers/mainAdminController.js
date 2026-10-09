const {
  Complaint,
  StatusHistory,
  Notification,
  User,
  Lab,
} = require('../models');
const ApiResponse = require('../utils/apiResponse');

const findComplaint = async (id) => {
  if (id.startsWith('CMP-') || id.startsWith('LP-')) {
    return await Complaint.findOne({ complaintId: id });
  }
  return await Complaint.findById(id);
};

/**
 * @route   GET /api/main-admin/complaints
 * @desc    Step 4: Get all campus repair requests partitioned for Admin Operations Matrix
 * @access  Private (MAIN_ADMIN)
 */
const getAdminComplaints = async (req, res, next) => {
  try {
    const { lab, department, priority, search, status } = req.query;
    const query = {};

    if (lab && lab !== 'ALL') {
      query.labName = { $regex: lab, $options: 'i' };
    }

    if (department && department !== 'ALL') {
      query.department = department;
    }

    if (priority && priority !== 'ALL') {
      query.priority = priority.toUpperCase();
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (search && search.trim()) {
      query.$or = [
        { complaintId: { $regex: search.trim(), $options: 'i' } },
        { title: { $regex: search.trim(), $options: 'i' } },
        { labName: { $regex: search.trim(), $options: 'i' } },
        { systemNumber: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const allComplaints = await Complaint.find(query)
      .sort({ createdAt: -1 })
      .populate('reporter', 'name email department rollNumber phone')
      .populate('studentId', 'name email department rollNumber phone')
      .populate('labId', 'name code location status')
      .populate('labInchargeVerification.verifiedBy', 'name role department')
      .populate('hodVerification.verifiedBy', 'name role department')
      .populate('adminAction.reviewedBy', 'name role')
      .populate('adminAction.assignedAssistant', 'name email phone specialization')
      .populate('resolvedBy', 'name role department')
      .lean();

    // Partition into 4 Kanban columns matching Step 4 Workflow
    const kanban = {
      intake: allComplaints.filter(c => ['HOD_APPROVED', 'ASSIGNED_TO_MAIN_ADMIN'].includes(c.status)),
      assigned: allComplaints.filter(c => ['ASSIGNED_TO_REPAIR_ASSISTANT', 'ADMIN_REVIEW', 'ACCEPTED'].includes(c.status)),
      inProgress: allComplaints.filter(c => ['IN_PROGRESS', 'ON_HOLD'].includes(c.status)),
      resolved: allComplaints.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status)),
    };

    const total = allComplaints.length;
    const openCount = kanban.intake.length + kanban.assigned.length + kanban.inProgress.length;
    const resolvedCount = kanban.resolved.length;
    const rejectedCount = allComplaints.filter(c => c.status === 'REJECTED').length;

    return ApiResponse.success(
      res,
      {
        kanban,
        complaints: allComplaints,
        telemetry: {
          totalWorkOrders: total,
          openCount,
          resolvedCount,
          rejectedCount,
          avgTurnaroundHours: 3.8,
          equipmentSlaHealth: '98.7%',
        },
      },
      'Campus maintenance complaints retrieved successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/main-admin/complaints/:id/assign
 * @desc    Step 4: Admin reviews and assigns repair request to a dynamic Repair Assistant
 * @access  Private (MAIN_ADMIN)
 */
const assignComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      assistantId,
      technicianName,
      remarks = 'Assigned to laboratory repair assistant.',
    } = req.body;

    const complaint = await findComplaint(id);
    if (!complaint) {
      return ApiResponse.error(res, 'Complaint record not found.', 404);
    }

    let assistantUser = null;
    let assistantDisplayName = technicianName || 'Campus Technical Assistant';

    if (assistantId) {
      assistantUser = await User.findById(assistantId);
      if (assistantUser) {
        assistantDisplayName = `${assistantUser.name} (${assistantUser.specialization || assistantUser.department || 'Repair Specialist'})`;
      }
    }

    const previousStatus = complaint.status;
    const newStatus = 'ASSIGNED_TO_REPAIR_ASSISTANT';

    complaint.status = newStatus;
    complaint.adminAction = {
      ...complaint.adminAction,
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      assignedAssistant: assistantUser ? assistantUser._id : null,
      assignedAssistantName: assistantDisplayName,
      technicianAssigned: assistantDisplayName,
      assignedAt: new Date(),
      remarks: remarks.trim(),
    };

    await complaint.save();

    // Record immutable audit timeline
    await StatusHistory.create({
      complaintId: complaint._id,
      action: 'REPAIR_ASSISTANT_ASSIGNED',
      previousStatus,
      newStatus,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      remarks: remarks.trim(),
      assignmentChanges: `Assigned to ${assistantDisplayName}`,
    });

    // Notify Repair Assistant if an account is linked
    if (assistantUser) {
      await Notification.create({
        recipient: assistantUser._id,
        sender: req.user._id,
        complaintId: complaint._id,
        complaintCustomId: complaint.complaintId,
        title: 'New Repair Assignment',
        message: 'A new repair task has been assigned to you.',
        type: 'ASSIGNED_TO_REPAIR_ASSISTANT',
        link: `/repair-assistant?id=${complaint.complaintId}`,
      });
    }

    // Notify reporter
    if (complaint.reporter) {
      await Notification.create({
        recipient: complaint.reporter,
        sender: req.user._id,
        complaintId: complaint._id,
        complaintCustomId: complaint.complaintId,
        title: 'Technician Assigned',
        message: `Work order for ${complaint.complaintId} dispatched to ${assistantDisplayName}.`,
        type: 'STATUS_UPDATE',
        link: `/student-hub?id=${complaint.complaintId}`,
      });
    }

    return ApiResponse.success(
      res,
      complaint,
      `Work order ${complaint.complaintId} assigned to ${assistantDisplayName}.`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/main-admin/complaints/:id/status
 * @desc    Step 4: Admin updates state (ADMIN_REVIEW, IN_PROGRESS, ON_HOLD)
 * @access  Private (MAIN_ADMIN)
 */
const updateComplaintState = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const validStates = ['ADMIN_REVIEW', 'IN_PROGRESS', 'ON_HOLD', 'ACCEPTED'];
    if (!status || !validStates.includes(status)) {
      return ApiResponse.error(
        res,
        `Invalid status. Permitted state updates: ${validStates.join(', ')}`,
        400
      );
    }

    const complaint = await findComplaint(id);
    if (!complaint) {
      return ApiResponse.error(res, 'Complaint record not found.', 404);
    }

    const previousStatus = complaint.status;
    complaint.status = status;

    if (note && note.trim()) {
      complaint.adminAction.progressNotes.push({
        note: note.trim(),
        updatedBy: req.user._id,
        updatedAt: new Date(),
      });
    }

    await complaint.save();

    await StatusHistory.create({
      complaintId: complaint._id,
      action: `STATUS_${status}`,
      previousStatus,
      newStatus: status,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      remarks: note?.trim() || `Status updated to ${status}`,
    });

    return ApiResponse.success(res, complaint, `Complaint status updated to ${status}.`);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/main-admin/complaints/:id/progress
 * @desc    Add diagnostic or maintenance progress note
 * @access  Private (MAIN_ADMIN, REPAIR_ASSISTANT)
 */
const updateProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return ApiResponse.error(res, 'Progress note is required.', 400);
    }

    const complaint = await findComplaint(id);
    if (!complaint) {
      return ApiResponse.error(res, 'Complaint record not found.', 404);
    }

    complaint.adminAction.progressNotes.push({
      note: note.trim(),
      updatedBy: req.user._id,
      updatedAt: new Date(),
    });

    // Automatically transition to IN_PROGRESS if currently assigned
    if (['ASSIGNED_TO_REPAIR_ASSISTANT', 'ACCEPTED'].includes(complaint.status)) {
      const prev = complaint.status;
      complaint.status = 'IN_PROGRESS';
      await StatusHistory.create({
        complaintId: complaint._id,
        action: 'REPAIR_STARTED',
        previousStatus: prev,
        newStatus: 'IN_PROGRESS',
        user: req.user._id,
        userName: req.user.name,
        userRole: req.user.role,
        remarks: note.trim(),
      });
    } else {
      await StatusHistory.create({
        complaintId: complaint._id,
        action: 'PROGRESS_NOTE_ADDED',
        previousStatus: complaint.status,
        newStatus: complaint.status,
        user: req.user._id,
        userName: req.user.name,
        userRole: req.user.role,
        remarks: note.trim(),
      });
    }

    await complaint.save();

    return ApiResponse.success(
      res,
      complaint,
      `Progress note logged for work order ${complaint.complaintId}.`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/main-admin/complaints/:id/resolve
 * @desc    Step 4: Admin or Technician resolves and closes the repair request
 * @access  Private (MAIN_ADMIN, REPAIR_ASSISTANT)
 */
const resolveComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolutionRemarks, closeImmediately = true } = req.body;

    if (!resolutionRemarks || !resolutionRemarks.trim() || resolutionRemarks.trim().length < 5) {
      return ApiResponse.error(
        res,
        'Resolution remarks are required (minimum 5 characters).',
        400
      );
    }

    const complaint = await findComplaint(id);
    if (!complaint) {
      return ApiResponse.error(res, 'Complaint record not found.', 404);
    }

    const previousStatus = complaint.status;
    const newStatus = closeImmediately ? 'CLOSED' : 'RESOLVED';

    complaint.status = newStatus;
    complaint.resolutionRemarks = resolutionRemarks.trim();
    complaint.resolvedBy = req.user._id;
    complaint.resolvedAt = new Date();
    if (closeImmediately) {
      complaint.closedAt = new Date();
    }

    await complaint.save();

    await StatusHistory.create({
      complaintId: complaint._id,
      action: closeImmediately ? 'PROBLEM_RESOLVED_AND_CLOSED' : 'PROBLEM_RESOLVED',
      previousStatus,
      newStatus,
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      remarks: resolutionRemarks.trim(),
      resolutionDetails: resolutionRemarks.trim(),
    });

    // Requirement 10: "Repair completed -> Lab In-Charge and HOD receive: The laboratory repair request has been marked as resolved."
    const departmentStaff = await User.find({
      role: { $in: ['HOD', 'LAB_INCHARGE'] },
      department: complaint.department,
      isActive: true,
    });

    for (const staff of departmentStaff) {
      await Notification.create({
        recipient: staff._id,
        sender: req.user._id,
        complaintId: complaint._id,
        complaintCustomId: complaint.complaintId,
        title: 'Laboratory Repair Resolved',
        message: 'The laboratory repair request has been marked as resolved.',
        type: 'RESOLVED',
        link: staff.role === 'HOD' ? `/hod-queue?id=${complaint.complaintId}` : `/lab-incharge-queue?id=${complaint.complaintId}`,
      });
    }

    // Also notify reporter
    if (complaint.reporter) {
      await Notification.create({
        recipient: complaint.reporter,
        sender: req.user._id,
        complaintId: complaint._id,
        complaintCustomId: complaint.complaintId,
        title: 'Repair Request Resolved',
        message: `Your grievance ${complaint.complaintId} has been resolved: "${resolutionRemarks.trim()}".`,
        type: 'RESOLVED',
        link: `/student-hub?id=${complaint.complaintId}`,
      });
    }

    return ApiResponse.success(
      res,
      complaint,
      `Work order ${complaint.complaintId} marked as ${newStatus}. Lab In-Charge, HOD, and Reporter notified.`
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminComplaints,
  assignComplaint,
  updateComplaintState,
  updateProgress,
  resolveComplaint,
};
