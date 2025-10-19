import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import { v2 as cloudinary } from 'cloudinary'
import { envVars } from './env'
import AppError from '../helpers/AppError'
import StatusCode from '../utils/statusCode'

// Configure Cloudinary
cloudinary.config({
	cloud_name: envVars.CLOUDINARY.CLOUDINARY_CLOUD_NAME,
	api_key: envVars.CLOUDINARY.CLOUDINARY_API_KEY,
	api_secret: envVars.CLOUDINARY.CLOUDINARY_API_SECRET,
})

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
				.replace(/[^a-z0-9\-]/g, '-')

			return `${Math.random()
				.toString(36)
				.substring(2)}-${Date.now()}-${rawName}`
		},
	},
})

const multerUpload = multer({ storage: storage })

export const deleteFromCloudinary = async (url: string) => {
	try {
		const regex = /\/v\d+\/(.*?)\.(jpg|jpeg|png|gif|webp)$/i
		const match = url.match(regex)
		if (match && match[1]) {
			const publicId = match[1]
			await cloudinary.uploader.destroy(publicId)
			if (envVars.NODE_ENV === 'development') {
				console.log(`✅ File deleted: ${publicId}`)
			}
		}
	} catch (error: any) {
		throw new AppError(
			StatusCode.BAD_REQUEST,
			`Cloudinary Image Deletion Failed: ${error.message}`,
		)
	}
}

export const fileUploader = {
	multerUpload,
}
