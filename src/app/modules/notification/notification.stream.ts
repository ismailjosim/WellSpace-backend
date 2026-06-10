import type { Response } from 'express'

const clients = new Map<string, Set<Response>>()

const writeEvent = (res: Response, event: string, data: unknown) => {
	res.write(`event: ${event}\n`)
	res.write(`data: ${JSON.stringify(data)}\n\n`)
}

const addClient = (userId: string, res: Response) => {
	res.setHeader('Content-Type', 'text/event-stream')
	res.setHeader('Cache-Control', 'no-cache, no-transform')
	res.setHeader('Connection', 'keep-alive')
	res.flushHeaders?.()

	writeEvent(res, 'connected', { connected: true })

	if (!clients.has(userId)) {
		clients.set(userId, new Set())
	}

	clients.get(userId)?.add(res)

	res.on('close', () => {
		clients.get(userId)?.delete(res)

		if (clients.get(userId)?.size === 0) {
			clients.delete(userId)
		}
	})
}

const sendToUser = (userId: string, event: string, data: unknown) => {
	const userClients = clients.get(userId)

	if (!userClients) return

	for (const client of userClients) {
		writeEvent(client, event, data)
	}
}

export const NotificationStream = {
	addClient,
	sendToUser,
}
