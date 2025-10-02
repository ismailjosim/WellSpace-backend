type IOptions = {
	page?: number
	limit?: number
	sortBy?: string
	orderBy?: string
}
type IOptionsResult = {
	page: number
	limit: number
	skip: number
	sortBy: string
	orderBy: string
}
const calcPagination = (options: IOptions): IOptionsResult => {
	const page: number = Number(options?.page) || 1
	const limit: number = Number(options.limit) || 10
	const skip: number = (page - 1) * limit

	const sortBy: string = options.sortBy || 'createdAt'
	const orderBy: string = options.orderBy || 'desc'

	return { page, limit, skip, sortBy, orderBy }
}

export const paginationHelper = { calcPagination }
