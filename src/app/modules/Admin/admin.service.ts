import prisma from '../../config'

const getAllAdminFromDB = async () => {
	const result = await prisma.user.findMany()
	return result
}

export const AdminService = {
	getAllAdminFromDB,
}
