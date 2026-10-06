const { uploadToCloudinary } = require('../config/cloudinary');
const ApiResponse = require('../utils/apiResponse');

/**
 * @route   POST /api/upload
 * @desc    Upload an equipment defect image to Cloudinary
 * @access  Private (Authenticated Users)
 */
const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return ApiResponse.error(
        res,
        'No image file provided. Please attach an image under field name "image".',
        400
      );
    }

    const uploadResult = await uploadToCloudinary(
      req.file.buffer,
      req.file.originalname,
      'labpulse/equipment_defects'
    );

    return ApiResponse.success(
      res,
      {
        imageUrl: uploadResult.url,
        publicId: uploadResult.publicId,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
      },
      'Image uploaded successfully.',
      200
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadImage,
};
