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
	searchableFields: (keyof T)[],
	params: Record<string, any>,
): Record<string, any> {
	const { searchTerm, ...filterData } = params
	const andConditions: any[] = []

	// Search term condition
	if (searchTerm) {
		andConditions.push({
			OR: searchableFields.map((field) => ({
				[field]: {
					contains: searchTerm,
					mode: 'insensitive',
				},
			})),
		})
	}

	// Dynamic filters
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
