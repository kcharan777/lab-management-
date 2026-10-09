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
 * @route   GET /api/repair-assistant/tasks
 * @desc    Get all repair requests assigned to the logged-in repair assistant
 * @access  Private (REPAIR_ASSISTANT)
 */
const getMyAssignedTasks = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {
      'adminAction.assignedAssistant': req.user._id,
    };

    if (status && status !== 'ALL') {
      query.status = status;
    }

    const tasks = await Complaint.find(query)
      .sort({ createdAt: -1 })
      .populate('reporter', 'name email department rollNumber phone')
      .populate('labId', 'name code location status')
      .lean();

    const allMyTasks = await Complaint.find({ 'adminAction.assignedAssistant': req.user._id }).select('status').lean();

    const stats = {
      totalAssigned: allMyTasks.length,
      pending: allMyTasks.filter(t => t.status === 'ASSIGNED_TO_REPAIR_ASSISTANT').length,
      inProgress: allMyTasks.filter(t => ['IN_PROGRESS', 'ON_HOLD'].includes(t.status)).length,
      completed: allMyTasks.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status)).length,
    };

    return ApiResponse.success(res, { tasks, stats }, 'Assigned repair tasks retrieved.');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/repair-assistant/tasks/:id/start
 * @desc    Technician acknowledges and starts repair work
 * @access  Private (REPAIR_ASSISTANT)
 */
const startRepair = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks = 'Repair assistant arrived on site. Diagnostic inspection initiated.' } = req.body;

    const complaint = await findComplaint(id);
    if (!complaint) {
      return ApiResponse.error(res, 'Repair task not found.', 404);
    }

    // Verify assignment to caller
    if (complaint.adminAction?.assignedAssistant?.toString() !== req.user._id.toString()) {
      return ApiResponse.error(res, 'Access forbidden. This repair task is not assigned to your account.', 403);
    }

    const previousStatus = complaint.status;
    complaint.status = 'IN_PROGRESS';
    complaint.adminAction.progressNotes.push({
      note: remarks.trim(),
      updatedBy: req.user._id,
      updatedAt: new Date(),
    });

    await complaint.save();

    await StatusHistory.create({
      complaintId: complaint._id,
      action: 'REPAIR_STARTED',
      previousStatus,
      newStatus: 'IN_PROGRESS',
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      remarks: remarks.trim(),
    });

    return ApiResponse.success(res, complaint, `Repair work initiated on ${complaint.complaintId}.`);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/repair-assistant/tasks/:id/complete
 * @desc    Technician marks repair task as resolved
 * @access  Private (REPAIR_ASSISTANT)
 */
const completeRepair = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolutionRemarks } = req.body;

    if (!resolutionRemarks || resolutionRemarks.trim().length < 5) {
      return ApiResponse.error(res, 'Resolution remarks are required (minimum 5 characters).', 400);
    }

    const complaint = await findComplaint(id);
    if (!complaint) {
      return ApiResponse.error(res, 'Repair task not found.', 404);
    }

    if (complaint.adminAction?.assignedAssistant?.toString() !== req.user._id.toString()) {
      return ApiResponse.error(res, 'Access forbidden. This repair task is not assigned to your account.', 403);
    }

    const previousStatus = complaint.status;
    complaint.status = 'RESOLVED';
    complaint.resolutionRemarks = resolutionRemarks.trim();
    complaint.resolvedBy = req.user._id;
    complaint.resolvedAt = new Date();

    await complaint.save();

    await StatusHistory.create({
      complaintId: complaint._id,
      action: 'REPAIR_COMPLETED_BY_ASSISTANT',
      previousStatus,
      newStatus: 'RESOLVED',
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      remarks: resolutionRemarks.trim(),
      resolutionDetails: resolutionRemarks.trim(),
    });

    // Notify HOD and Lab In-Charge
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
        title: 'Laboratory Repair Completed',
        message: 'The laboratory repair request has been marked as resolved.',
        type: 'RESOLVED',
        link: staff.role === 'HOD' ? `/hod-queue?id=${complaint.complaintId}` : `/lab-incharge-queue?id=${complaint.complaintId}`,
      });
    }

    // Notify reporter
    if (complaint.reporter) {
      await Notification.create({
        recipient: complaint.reporter,
        sender: req.user._id,
        complaintId: complaint._id,
        complaintCustomId: complaint.complaintId,
        title: 'Repair Completed',
        message: `Your reported issue ${complaint.complaintId} has been repaired: "${resolutionRemarks.trim()}".`,
        type: 'RESOLVED',
        link: `/student-hub?id=${complaint.complaintId}`,
      });
    }

    return ApiResponse.success(res, complaint, `Repair task ${complaint.complaintId} completed.`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyAssignedTasks,
  startRepair,
  completeRepair,
};
