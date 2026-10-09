const express = require('express');
const router = express.Router();
const {
  getMyAssignedTasks,
  startRepair,
  completeRepair,
} = require('../controllers/repairAssistantController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

router.get('/tasks', protect, authorize('REPAIR_ASSISTANT', 'MAIN_ADMIN'), getMyAssignedTasks);
router.patch('/tasks/:id/start', protect, authorize('REPAIR_ASSISTANT', 'MAIN_ADMIN'), startRepair);
router.patch('/tasks/:id/complete', protect, authorize('REPAIR_ASSISTANT', 'MAIN_ADMIN'), completeRepair);

module.exports = router;
