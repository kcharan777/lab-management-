const express = require('express');
const router = express.Router();
const {
  getAdminComplaints,
  acceptComplaint,
  updateProgress,
  resolveComplaint,
} = require('../controllers/mainAdminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

// Main Admin Routes (Authorized strictly for MAIN_ADMIN)
router.get('/complaints', protect, authorize('MAIN_ADMIN'), getAdminComplaints);
router.patch('/complaints/:id/accept', protect, authorize('MAIN_ADMIN'), acceptComplaint);
router.patch('/complaints/:id/progress', protect, authorize('MAIN_ADMIN'), updateProgress);
router.patch('/complaints/:id/resolve', protect, authorize('MAIN_ADMIN'), resolveComplaint);

module.exports = router;
