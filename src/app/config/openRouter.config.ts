import OpenAI from 'openai'
import { envVars } from './env'

const openAIConfig = new OpenAI({
	baseURL: 'https://openrouter.ai/api/v1',
	apiKey: envVars.OPEN_ROUTER_API_KEY,
})

export default openAIConfig
