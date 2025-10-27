import Stripe from 'stripe'
import { envVars } from './env'

export const stripeConfig = new Stripe(envVars.STRIPE_SECRET_KEY)
