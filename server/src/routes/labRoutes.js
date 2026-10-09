const express = require('express');
const router = express.Router();
const {
  getLabs,
  getLabById,
  createLab,
  updateLab,
  deleteLab,
} = require('../controllers/labController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

// Authenticated users can list and inspect laboratories
router.get('/', protect, getLabs);
router.get('/:id', protect, getLabById);

// Dynamic lab configuration restricted to MAIN_ADMIN
router.post('/', protect, authorize('MAIN_ADMIN'), createLab);
router.put('/:id', protect, authorize('MAIN_ADMIN'), updateLab);
router.delete('/:id', protect, authorize('MAIN_ADMIN'), deleteLab);

module.exports = router;
