const express = require('express');
const router = express.Router();
const {
  getPendingComplaints,
  verifyComplaint,
  rejectComplaint,
} = require('../controllers/labInchargeController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

// Lab Incharge Routes (Authorized for LAB_INCHARGE and MAIN_ADMIN)
router.get(
  '/complaints/pending',
  protect,
  authorize('LAB_INCHARGE', 'MAIN_ADMIN'),
  getPendingComplaints
);
router.patch(
  '/complaints/:id/verify',
  protect,
  authorize('LAB_INCHARGE', 'MAIN_ADMIN'),
  verifyComplaint
);
router.patch(
  '/complaints/:id/reject',
  protect,
  authorize('LAB_INCHARGE', 'MAIN_ADMIN'),
  rejectComplaint
);

module.exports = router;
