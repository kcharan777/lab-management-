const express = require('express');
const router = express.Router();
const {
  createComplaint,
  getMyComplaints,
  getComplaintById,
} = require('../controllers/complaintController');
const { protect } = require('../middleware/authMiddleware');
const { authorize, checkComplaintAccess } = require('../middleware/rbacMiddleware');

// Student Complaint Endpoints
router.post('/', protect, authorize('STUDENT'), createComplaint);
router.get('/my', protect, authorize('STUDENT'), getMyComplaints);
router.get('/:id', protect, checkComplaintAccess, getComplaintById);

module.exports = router;
