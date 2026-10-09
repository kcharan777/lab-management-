const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  getRepairAssistants,
} = require('../controllers/userManagementController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

// Get active repair assistants (accessible by Admin, HOD, Lab In-Charge)
router.get(
  '/repair-assistants',
  protect,
  authorize('MAIN_ADMIN', 'HOD', 'LAB_INCHARGE'),
  getRepairAssistants
);

// Admin-only user management endpoints
router.get('/', protect, authorize('MAIN_ADMIN'), getUsers);
router.post('/', protect, authorize('MAIN_ADMIN'), createUser);
router.put('/:id', protect, authorize('MAIN_ADMIN'), updateUser);
router.patch('/:id/toggle-status', protect, authorize('MAIN_ADMIN'), toggleUserStatus);

module.exports = router;
