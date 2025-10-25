import OpenAI from 'openai'
import { envVars } from './env'

const openai = new OpenAI({
	baseURL: 'https://openrouter.ai/api/v1',
	apiKey: envVars.OPEN_ROUTER_API_KEY,
	defaultHeaders: {
		'HTTP-Referer': '<YOUR_SITE_URL>',
		'X-Title': '<YOUR_SITE_NAME>',
	},
})

async function main() {
	const completion = await openai.chat.completions.create({
		model: 'openai/gpt-4o',
		messages: [
			{
				role: 'user',
				content: 'What is the meaning of life?',
			},
		],
	})

	console.log(completion?.choices[0]?.message)
}

main()
