function sendMsg(client, msg) {
	client.sendText(JSON.stringify(msg))
}

class Broker {
	constructor(userName) {
		this.clients = []
		this.userName = userName

	}


	addClient(client) {

		console.log('[Broker] addClient', this.userName, client.path)

		this.clients.push(client)

		client.registeredTopics = {}

		client.on('text', (text) => {

			const msg = JSON.parse(text)
			this.handleClientMsg(client, msg)

		})

		client.on('close', (code)  => {
			//console.log(`Client disconnected`)
			this.removeClient(client)
			
		})		

		client.on('error', (err) => {
			console.log('connection error')
		})	

		sendMsg(client, {type: 'ready'})
		

	}

	removeClient(client) {
		console.log('[Broker] removeClient', this.userName, client.path)

		const idx = this.clients.indexOf(client)
		if (idx >= 0) {
			this.clients.splice(idx, 1)
		}
	}


	handleClientMsg(client, msg) {

		console.log('[Broker] msg', this.userName, client.path, msg)

		const {type, topic} = msg

		if (typeof type != 'string') {
			console.log('Missing parameter type', msg)
			return
		}	

		switch(msg.type) {

			case 'unregister':
				if (client.registeredTopics[topic] != undefined) {
					console.log(`client unsubscribes to topic '${topic}'`)
					delete client.registeredTopics[topic]
				}
			break

			case 'register':
				console.log(`client subscribes to topic '${topic}'`)
				client.registeredTopics[topic] = 1
			break

			case 'notif':
				this.broadcastToSubscribers(msg)
			break

			default:
				console.log('Unknown msg type', type)
		}

	}	

	broadcastToSubscribers(msg) {
		const text = JSON.stringify(msg)
		this.clients.forEach((client) => {
			if (client.registeredTopics[msg.topic] == 1) {
				client.sendText(text)
			}
		})
	}

	sendMessage(topic, data) {
		const msg = {
			time: Date.now(),
			type: 'notif',
			topic,
			data
		}	
		this.broadcastToSubscribers(msg)		
	}


}

module.exports = Broker