const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Uploads a file buffer to Cloudinary with safe fallback for local/offline testing
 */
const uploadToCloudinary = (fileBuffer, originalname, folder = 'labpulse/evidence') => {
  return new Promise((resolve, reject) => {
    const isRealCloudinary =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_CLOUD_NAME !== 'demo_cloud' &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_KEY !== '123456789012345';

    if (isRealCloudinary) {
      // Use live Cloudinary upload stream
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          public_id: `${Date.now()}-${path.parse(originalname).name}`,
        },
        (error, result) => {
          if (error) {
            console.error('[Cloudinary Upload Error]:', error.message);
            return reject(new Error(`Cloudinary upload failed: ${error.message}`));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            bytes: result.bytes,
          });
        }
      );
      uploadStream.end(fileBuffer);
    } else {
      // Resilient local storage fallback when demo/test credentials are used
      try {
        const uploadDir = path.join(__dirname, '../../public/uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const ext = path.extname(originalname) || '.png';
        const filename = `evidence-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
        const filePath = path.join(uploadDir, filename);

        fs.writeFileSync(filePath, fileBuffer);

        const baseUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
        const fileUrl = `${baseUrl}/uploads/${filename}`;

        console.log(`[Storage Fallback] Image stored at ${fileUrl}`);
        resolve({
          url: fileUrl,
          publicId: filename,
          format: ext.replace('.', ''),
          bytes: fileBuffer.length,
        });
      } catch (err) {
        reject(new Error(`Local storage fallback failed: ${err.message}`));
      }
    }
  });
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
};
