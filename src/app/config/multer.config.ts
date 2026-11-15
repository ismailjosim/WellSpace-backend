import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import { envVars } from './env';
import AppError from '../helpers/AppError';
import StatusCode from '../utils/statusCode';

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/jpg',
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
      const parts = (file.originalname || 'upload').split('.');
      const baseName = parts.length > 1 ? parts.slice(0, -1).join('.') : parts[0];
      const rawName =
        baseName
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9\-]/g, '-') || 'file';

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

const prescriptionUpload = multer({
  storage: multer.memoryStorage(),
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

export const getSecurePrescriptionUrl = (publicId: string, format: string) => {
  return cloudinary.utils.private_download_url(publicId, format, {
    resource_type: 'image',
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + 300,
  });
};

export const uploadPrivatePrescription = async (file: Express.Multer.File) => {
  const safeName = file.originalname
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');
  const publicId = `wellspace/prescriptions/${Math.random().toString(36).substring(2)}-${Date.now()}-${safeName || 'upload'}`;
  const format =
    file.mimetype === 'application/pdf'
      ? 'pdf'
      : file.mimetype.split('/')[1] === 'jpeg'
        ? 'jpg'
        : file.mimetype.split('/')[1];

  const uploadedPublicId = await new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: 'image',
        type: 'authenticated',
      },
      (error, result) => {
        if (error) {
          reject(
            new AppError(StatusCode.BAD_REQUEST, `Prescription upload failed: ${error.message}`)
          );
          return;
        }
        if (!result?.public_id) {
          reject(
            new AppError(StatusCode.BAD_REQUEST, 'Prescription upload did not return a file ID.')
          );
          return;
        }
        resolve(result.public_id);
      }
    );
    stream.end(file.buffer);
  });

  return { publicId: uploadedPublicId, format };
};

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
  prescriptionUpload,
  multiDocUpload: multer({
    storage: storage,
    limits: {
      fileSize: MAX_UPLOAD_SIZE_BYTES,
      files: 5,
    },
    fileFilter: (_req, file, cb) => {
      if (!allowedMimeTypes.has(file.mimetype)) {
        cb(
          new AppError(
            StatusCode.BAD_REQUEST,
            'Only JPG, PNG, WEBP, GIF, and PDF files are allowed'
          )
        );
        return;
      }
      cb(null, true);
    },
  }),
};
