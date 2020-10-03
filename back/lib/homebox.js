//@ts-check

const auth = require('basic-auth')
const bcrypt = require('bcrypt')
const EventEmitter = require('events')

// @ts-ignore
const events = new EventEmitter()

const websocket = require('./websocket.js')
const dbUsers = require('../db/users.js')

const wss = websocket.addServer('/homebox/', onHomeboxConnect)


async function onHomeboxConnect(client) {

	const { headers } = client
	//console.log('onConnect', path)

	const authorization = headers.authorization
	if (authorization == undefined) {
		websocket.sendError(client, 'Missing authorization')
		return
	}

	const credentials = auth.parse(headers.authorization)
	//console.log('credentials', credentials)
	const userName = credentials.name
	try {
		const userInfo = await dbUsers.getUserInfo(userName)
		const { pwd, crypted } = userInfo
		let match
		if (crypted) {
			match = await bcrypt.compare(credentials.pass, pwd)
		}
		else {
			match = (credentials.pass == pwd)
		}
		if (match) {
			addHomeboxClient(client, userName)
		}
		else {
			websocket.sendError(client, 'Bad password')
		}

	}
	catch (e) {
		websocket.sendError(client, e)
	}
}

function getClients() {
	return Array.from(wss.clients)
}

function getHomeboxClient(userName) {
	// @ts-ignore
	return getClients().find((c) => c.userName == userName)
}

function registerHomeboxTopics(userName, topics) {
	const client = getHomeboxClient(userName)
	if (client == undefined) {
		return
	}

	topics.forEach((topic) => {
		if (topic.startsWith('homebox.')) {
			// @ts-ignore
			if (client.registeredTopics[topic] == undefined) {
				// @ts-ignore
				client.registeredTopics[topic] = 1
				websocket.registerTopic(client, topic)
			}
			else {
				// @ts-ignore
				client.registeredTopics[topic]++
			}
		}
	})
}

function unregisterHomeboxTopics(userName, topics) {
	const client = getHomeboxClient(userName)

	if (client == undefined) {
		return
	}

	topics.forEach((topic) => {
		if (topic.startsWith('homebox.')) {
			// @ts-ignore
			if (client.registeredTopics[topic] != undefined) {
				// @ts-ignore
				if (--client.registeredTopics[topic] == 0) {
					// @ts-ignore
					delete client.registeredTopics[topic]
					websocket.unregisterTopic(client, topic)

				}
			}
		}
	})
}

function addHomeboxClient(client, userName) {
	client.registeredTopics = {}
	client.userName = userName
	// @ts-ignore
	client.services = new EventEmitter()
	client.lastPingDate = Date.now()

	console.log(`homebox '${userName}' is connected`.green)
	events.emit('clientConnected', userName)

	client.on('message', (text) => {

		const msg = JSON.parse(text)
		const { type } = msg

		if (type == 'ping') {
			websocket.sendPong(client)
		}

		if (type == 'notif') {
			events.emit('notif', userName, msg)
		}
		if (type == 'callServiceResp') {
			client.services.emit(msg.srvName, msg)
		}


	})

	client.on('close', (code) => {
		//console.log(`Client disconnected`)
		console.log(`homebox '${userName}' is disconnected`.red)
		events.emit('clientDisconnected', userName)

	})

	client.on('error', (err) => {
		console.log('connection error')
	})

}

function callService(userName, srvName, data) {
	console.log('[broker] callService', srvName, data)
	return new Promise((resolve, reject) => {
		const client = getHomeboxClient(userName)
		if (client == undefined) {
			reject('homebox is not connected')
			return
		}

		// @ts-ignore
		client.services.once(srvName, (msg) => {
			if (msg.err != undefined) {
				reject(msg.err)
			}
			else {
				resolve(msg.data)
			}
		})

		websocket.sendMsg(client, {
			type: 'callService',
			srvName,
			data
		})

	})
}



function sendMsg(userName, msg) {
	websocket.sendMsg(getHomeboxClient(userName), msg)
}

module.exports = {
	callService,
	registerHomeboxTopics,
	unregisterHomeboxTopics,
	sendMsg,
	events
}