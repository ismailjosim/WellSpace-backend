import express, { type Application, type Request, type Response } from 'express'
import cors from 'cors'
import config from './config'
import globalErrorHandler from './app/middlewares/globalErrorHandler'
import notFound from './app/middlewares/notFound'
import router from './app/routes'

// App
const app: Application = express()

// middleware
app.use(
	cors({
		origin: 'http://localhost:3000',
		credentials: true,
	}),
)

// * Parser
app.use(express.json())
app.use(
	express.urlencoded({
		extended: true,
	}),
)

// Routes
app.use('/api/v1', router)

//* Default route
app.get('/', async (req: Request, res: Response) => {
	res.status(201).json({
		message: 'Server is running..',
		environment: config.node_env,
		uptime: process.uptime().toFixed(2) + ' sec',
		timeStamp: new Date().toISOString(),
	})
})

app.use(globalErrorHandler)
app.use(notFound)

export default app
