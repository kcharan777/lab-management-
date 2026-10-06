const multer = require('multer');
const ApiResponse = require('../utils/apiResponse');

// Use memory storage for direct streaming to Cloudinary
const storage = multer.memoryStorage();

// File filter: accept only image formats
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only JPEG, PNG, and WebP images are permitted.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Megabytes
  },
});

/**
 * Express middleware wrapper to catch Multer errors cleanly
 */
const uploadSingleImage = (req, res, next) => {
  const multerUpload = upload.single('image');

  multerUpload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return ApiResponse.error(
          res,
          'File size exceeds the 5MB maximum limit. Please upload a smaller image.',
          400
        );
      }
      if (err.code === 'INVALID_FILE_TYPE') {
        return ApiResponse.error(res, err.message, 400);
      }
      return ApiResponse.error(res, `Upload processing error: ${err.message}`, 400);
    }
    next();
  });
};

module.exports = {
  uploadSingleImage,
};
