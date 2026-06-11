import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import { envVars } from './env';
import AppError from '../helpers/AppError';
import StatusCode from '../utils/statusCode';

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

// Configure Cloudinary
cloudinary.config({
  cloud_name: envVars.CLOUDINARY.CLOUDINARY_CLOUD_NAME,
  api_key: envVars.CLOUDINARY.CLOUDINARY_API_KEY,
  api_secret: envVars.CLOUDINARY.CLOUDINARY_API_SECRET,
});

// Use CloudinaryStorage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    public_id: (req, file) => {
      const rawName = file.originalname
        .split('.')
        .slice(0, -1)
        .join('.')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '-');

      return `${Math.random().toString(36).substring(2)}-${Date.now()}-${rawName}`;
    },
  },
});

const multerUpload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_UPLOAD_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(
        new AppError(StatusCode.BAD_REQUEST, 'Only JPG, PNG, WEBP, GIF, and PDF files are allowed')
      );
      return;
    }

    cb(null, true);
  },
});

export const deleteFromCloudinary = async (url: string) => {
  try {
    const regex = /\/v\d+\/(.*?)\.(jpg|jpeg|png|gif|webp)$/i;
    const match = url.match(regex);
    if (match && match[1]) {
      const publicId = match[1];
      await cloudinary.uploader.destroy(publicId);
      if (envVars.NODE_ENV === 'development') {
        console.log(`✅ File deleted: ${publicId}`);
      }
    }
  } catch (error: any) {
    throw new AppError(
      StatusCode.BAD_REQUEST,
      `Cloudinary Image Deletion Failed: ${error.message}`
    );
  }
};

export const fileUploader = {
  multerUpload,
};
