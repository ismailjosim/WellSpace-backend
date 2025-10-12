import dotenv from 'dotenv'
dotenv.config()
interface EnvConfig {
	PORT: string
	DATABASE_URL: string
	NODE_ENV: string
	BCRYPT_SALT_ROUND: string
	FRONTEND_URL: string
	CLOUDINARY: {
		CLOUDINARY_CLOUD_NAME: string
		CLOUDINARY_API_KEY: string
		CLOUDINARY_API_SECRET: string
	}
}

const loadEnvVars = (): EnvConfig => {
	const requiredEnvVars: string[] = [
		'PORT',
		'DATABASE_URL',
		'NODE_ENV',
		'BCRYPT_SALT_ROUND',
		'FRONTEND_URL',
		'CLOUDINARY_CLOUD_NAME',
		'CLOUDINARY_API_KEY',
		'CLOUDINARY_API_SECRET',
	]
	requiredEnvVars.forEach((key) => {
		if (!process.env[key]) {
			throw new Error(`Missing required environment variable ${key}`)
		}
	})

	return {
		NODE_ENV: process.env.NODE_ENV as string,
		PORT: process.env.PORT as string,
		DATABASE_URL: process.env.DATABASE_URL as string,
		BCRYPT_SALT_ROUND: process.env.BCRYPT_SALT_ROUND as string,
		FRONTEND_URL: process.env.FRONTEND_URL as string,
		CLOUDINARY: {
			CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME as string,
			CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY as string,
			CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET as string,
		},
	}
}

export const envVars = loadEnvVars()
