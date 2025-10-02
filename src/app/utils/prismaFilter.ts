import type { Prisma } from '@prisma/client'

export const pick = <T extends Record<string, unknown>, K extends keyof T>(
	obj: T,
	keys: K[],
): Partial<T> => {
	const finalObj: Partial<T> = {}
	for (const key of keys) {
		if (obj && Object.hasOwnProperty.call(obj, key)) {
			finalObj[key] = obj[key]
		}
	}
	return finalObj
}

export function buildWhereCondition<T extends object>(
	searchAbleFields: (keyof T)[],
	params: Record<string, any>,
): any {
	const { searchTerm, ...filterData } = params
	const andConditions: Prisma.AdminWhereInput[] = []

	// Add search condition
	if (searchTerm) {
		andConditions.push({
			OR: searchAbleFields.map((field) => ({
				[field]: {
					contains: params.searchTerm,
					mode: 'insensitive',
				},
			})),
		})
	}
	// Add filters dynamically
	if (Object.keys(filterData).length > 0) {
		andConditions.push({
			AND: Object.keys(filterData).map((key) => ({
				[key]: {
					equals: filterData[key],
				},
			})),
		})
	}
	return andConditions.length > 0 ? { AND: andConditions } : {}
}

/*
* search term
[
	{
		name: {
			contains: params.searchTerm,
			mode: 'insensitive',
		},
	},
	{
		email: {
			contains: params.searchTerm,
			mode: 'insensitive',
		},
	},
],
*/
