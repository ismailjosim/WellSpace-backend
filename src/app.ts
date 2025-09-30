import express, { type Application, type Request, type Response } from 'express'
import cors from 'cors'
import { UserRoutes } from './app/modules/User/user.routes'
import { AdminRoutes } from './app/modules/Admin/admin.routes'
// App
const app: Application = express()

// middleware
app.use(cors())

// * Parser
app.use(express.json())
app.use(
	express.urlencoded({
		extended: true,
	}),
)

// Routes

//* Default route
app.get('/', async (req: Request, res: Response) => {
	res.status(201).json({
		success: true,
		message: 'WellSpace API is running ✅',
	})
})

app.use('/api/v1/user', UserRoutes)
app.use('/api/v1/admin', AdminRoutes)

export default app
