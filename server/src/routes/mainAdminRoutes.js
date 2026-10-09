const express = require('express');
const router = express.Router();
const {
  getAdminComplaints,
  assignComplaint,
  updateComplaintState,
  updateProgress,
  resolveComplaint,
} = require('../controllers/mainAdminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

// Main Admin Routes (Authorized strictly for MAIN_ADMIN)
router.get('/complaints', protect, authorize('MAIN_ADMIN'), getAdminComplaints);
router.patch('/complaints/:id/assign', protect, authorize('MAIN_ADMIN'), assignComplaint);
router.patch('/complaints/:id/accept', protect, authorize('MAIN_ADMIN'), assignComplaint); // alias for backward compatibility
router.patch('/complaints/:id/status', protect, authorize('MAIN_ADMIN'), updateComplaintState);
router.patch('/complaints/:id/progress', protect, authorize('MAIN_ADMIN', 'REPAIR_ASSISTANT'), updateProgress);
router.patch('/complaints/:id/resolve', protect, authorize('MAIN_ADMIN', 'REPAIR_ASSISTANT'), resolveComplaint);

module.exports = router;
