import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import { v2 as cloudinary } from 'cloudinary'
import { envVars } from './env'

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

export const fileUploader = {
	multerUpload,
}
