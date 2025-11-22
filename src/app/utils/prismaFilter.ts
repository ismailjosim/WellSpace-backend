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
	searchableFields?: (keyof T)[],
	params?: Record<string, any>,
): Record<string, any> {
	if (!params || Object.keys(params).length === 0) {
		return {}
	}

	const { searchTerm, startDateTime, endDateTime, ...filterData } = params
	const andConditions: any[] = []

	// Search term condition
	if (searchTerm && searchableFields && searchableFields.length > 0) {
		andConditions.push({
			OR: searchableFields.map((field) => ({
				[field]: {
					contains: searchTerm,
					mode: 'insensitive',
				},
			})),
		})
	}

	// Date range filter for startDateTime
	if (startDateTime) {
		andConditions.push({
			startDateTime: {
				gte: new Date(startDateTime),
			},
		})
	}

	// Date range filter for endDateTime
	if (endDateTime) {
		andConditions.push({
			endDateTime: {
				lte: new Date(endDateTime),
			},
		})
	}

	// Dynamic filters - simplified approach
	if (Object.keys(filterData).length > 0) {
		Object.keys(filterData).forEach((key) => {
			const value = filterData[key]

			// Skip empty values
			if (value === null || value === undefined || value === '') {
				return
			}

			// For string values, use contains with insensitive mode
			// For other values (numbers, booleans, enums), use equals directly
			if (typeof value === 'string') {
				andConditions.push({
					[key]: {
						contains: value,
						mode: 'insensitive',
					},
				})
			} else {
				andConditions.push({
					[key]: value,
				})
			}
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
]

*/
