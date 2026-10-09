const express = require('express');
const router = express.Router();
const {
  getPendingComplaints,
  getAllDepartmentComplaints,
  verifyComplaint,
  rejectComplaint,
} = require('../controllers/hodController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

router.get(
  '/complaints/pending',
  protect,
  authorize('HOD', 'MAIN_ADMIN'),
  getPendingComplaints
);

router.get(
  '/complaints/all',
  protect,
  authorize('HOD', 'MAIN_ADMIN'),
  getAllDepartmentComplaints
);

router.patch(
  '/complaints/:id/verify',
  protect,
  authorize('HOD', 'MAIN_ADMIN'),
  verifyComplaint
);

router.patch(
  '/complaints/:id/reject',
  protect,
  authorize('HOD', 'MAIN_ADMIN'),
  rejectComplaint
);

module.exports = router;
