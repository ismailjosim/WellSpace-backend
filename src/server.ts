import express from 'express'

const app = express()
const port = process.env.PORT || 5000

// Example route
app.get('/', async (req, res) => {
	res.status(201).json({
		success: true,
		message: 'WellSpace API is running ✅',
	})
})

app.listen(port, () => {
	console.log(`WellSpace App Running On Port: ${port}`)
})
