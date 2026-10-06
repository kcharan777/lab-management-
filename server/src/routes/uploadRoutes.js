const express = require('express');
const router = express.Router();
const { uploadImage } = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');
const { uploadSingleImage } = require('../middleware/uploadMiddleware');

// Upload image endpoint
router.post('/', protect, uploadSingleImage, uploadImage);

module.exports = router;
