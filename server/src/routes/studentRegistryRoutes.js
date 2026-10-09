const express = require('express');
const router = express.Router();
const {
  getRegistryStudents,
  addStudentToRegistry,
  bulkAddStudentsToRegistry,
  removeStudentFromRegistry,
} = require('../controllers/studentRegistryController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

router.get('/', protect, authorize('MAIN_ADMIN'), getRegistryStudents);
router.post('/', protect, authorize('MAIN_ADMIN'), addStudentToRegistry);
router.post('/bulk', protect, authorize('MAIN_ADMIN'), bulkAddStudentsToRegistry);
router.delete('/:id', protect, authorize('MAIN_ADMIN'), removeStudentFromRegistry);

module.exports = router;
