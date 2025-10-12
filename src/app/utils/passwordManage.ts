import bcrypt from 'bcryptjs'
import { envVars } from '@/config/env'
const hashingPassword = async (password: string) => {
	const hashedPassword: string = await bcrypt.hash(
		password,
		Number(envVars.BCRYPT_SALT_ROUND),
	)
	return hashedPassword
}
const checkingPassword = async (password: string, storedPassword: string) => {
	const isCorrectPass = await bcrypt.compare(password, storedPassword)
	return isCorrectPass
}
export const passwordManage = {
	hashingPassword,
	checkingPassword,
}
