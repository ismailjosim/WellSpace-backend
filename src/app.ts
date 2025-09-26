import express, { type Application, type Request, type Response } from 'express'
import cors from 'cors'
// App
const app: Application = express()

// middleware
app.use(cors())
app.use(express.json())

// Routes

//* Default route
app.get('/', async (req: Request, res: Response) => {
	res.status(201).json({
		success: true,
		message: 'WellSpace API is running ✅',
	})
})

export default app
