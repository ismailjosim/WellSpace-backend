import express, { type Application, type Request, type Response } from 'express'
import cors from 'cors'
import globalErrorHandler from '@/middlewares/globalErrorHandler'
import notFound from '@/middlewares/notFound'
import router from '@/routes'
import { envVars } from '@/config/env'
import { PaymentController } from './app/modules/payment/payment.controller'
import cookieParser from 'cookie-parser'
import cron from 'node-cron'
import { AppointmentService } from './app/modules/appointment/appointment.service'
import AppError from './app/helpers/AppError'
import StatusCode from './app/utils/statusCode'
// App
const app: Application = express()

// middleware
app.post(
	'/webhook',
	express.raw({
		type: 'application/json',
	}),
	PaymentController.handleStripeWebhookEvent,
)
app.use(
	cors({
		origin: 'http://localhost:3000',
		credentials: true,
	}),
)

// * Parser
app.use(express.json())
app.use(cookieParser())
app.use(
	express.urlencoded({
		extended: true,
	}),
)

// TODO: uncomment before deploy
// cron.schedule('* * * * *', () => {
// 	try {
// 		console.log('Node Corn Called At: ', new Date())
// 		AppointmentService.cancelUnpaidAppointments()
// 	} catch (error) {
// 		throw new AppError(
// 			StatusCode.BAD_REQUEST,
// 			'Facing Error While Removing Unpaid Appointment',
// 		)
// 	}
// })

// Routes
app.use('/api/v1', router)

//* Default route
app.get('/', async (req: Request, res: Response) => {
	res.status(201).json({
		message: 'Server is running..',
		environment: envVars.NODE_ENV,
		uptime: process.uptime().toFixed(2) + ' sec',
		timeStamp: new Date().toISOString(),
	})
})

app.use(globalErrorHandler)
app.use(notFound)

export default app
