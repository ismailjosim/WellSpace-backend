import type { Server } from 'http'
import app from './app'

const port = process.env.PORT || 5000

async function main() {
	let server: Server
	server = app.listen(port, () => {
		console.log(`WellSpace App Running On Port: ${port}`)
	})
}
main()
