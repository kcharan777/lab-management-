const ApiResponse = require('../utils/apiResponse');
const { Complaint } = require('../models/Complaint');

/**
 * Authorizes access based on user role.
 * Must be used AFTER the `protect` middleware.
 * @param  {...string} allowedRoles - Allowed roles, e.g. 'HOD', 'MAIN_ADMIN'
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(
        res,
        'Authentication required prior to role verification.',
        401
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return ApiResponse.error(
        res,
        `Access denied. Role '${req.user.role}' is not authorized to access this resource.`,
        403
      );
    }

    next();
  };
};

/**
 * Ensures that if the caller is a STUDENT, they can only access their own complaint.
 * Staff roles (HOD, LAB_INCHARGE, MAIN_ADMIN) are permitted to inspect any complaint.
 */
const checkComplaintAccess = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Support both MongoDB _id and human-readable complaintId (e.g. CMP-2026-0001)
    let complaint;
    if (id.startsWith('CMP-') || id.startsWith('LP-')) {
      complaint = await Complaint.findOne({ complaintId: id });
    } else {
      complaint = await Complaint.findById(id);
    }

    if (!complaint) {
      return ApiResponse.error(res, 'Complaint record not found.', 404);
    }

    // If caller is a STUDENT, strictly verify ownership (IDOR Prevention)
    if (req.user.role === 'STUDENT') {
      if (complaint.studentId.toString() !== req.user._id.toString()) {
        return ApiResponse.error(
          res,
          'Access forbidden. You are only authorized to view your own complaints.',
          403
        );
      }
    }

    // Attach verified complaint to request
    req.complaint = complaint;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authorize,
  checkComplaintAccess,
};
