const express = require('express');
const router = express.Router();
const {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require('../controllers/departmentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

// Public/authenticated list of departments
router.get('/', getDepartments);

// Admin-only management routes
router.post('/', protect, authorize('MAIN_ADMIN'), createDepartment);
router.put('/:id', protect, authorize('MAIN_ADMIN'), updateDepartment);
router.delete('/:id', protect, authorize('MAIN_ADMIN'), deleteDepartment);

module.exports = router;
