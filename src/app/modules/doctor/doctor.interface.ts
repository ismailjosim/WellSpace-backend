import type { Gender } from '@prisma/client'

export type IDoctorUpdateInput = {
	name: string
	email: string
	contactNumber: string
	gender: Gender
	appointmentFee: number
	address: string
	registrationNumber: string
	experience: number
	qualification: string
	currentWorkingPlace: string
	designation: string
	isDeleted: boolean
	specialties?: {
		specialtyId: string
		isDeleted: boolean
	}[]
}
