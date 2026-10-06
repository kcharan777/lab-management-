const express = require('express');
const router = express.Router();
const {
  getPendingComplaints,
  verifyComplaint,
  rejectComplaint,
} = require('../controllers/hodController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

// HOD Routes (Authorized for HOD and MAIN_ADMIN)
router.get('/complaints/pending', protect, authorize('HOD', 'MAIN_ADMIN'), getPendingComplaints);
router.patch('/complaints/:id/verify', protect, authorize('HOD', 'MAIN_ADMIN'), verifyComplaint);
router.patch('/complaints/:id/reject', protect, authorize('HOD', 'MAIN_ADMIN'), rejectComplaint);

module.exports = router;
