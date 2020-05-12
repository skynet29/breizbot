const wildcard = require('wildcard')
const ws = require("nodejs-websocket")
const cookie = require('cookie')
const auth = require('basic-auth')
const uniqid = require('uniqid')
const EventEmitter = require('events')

require('colors')

const db = require('./db')

const history = {}
const pingInterval = 30 * 1000 // 30 sec


function addToHistory(userName, msg) {
	if (history[userName] == undefined) {
		history[userName] = {}
	}
	msg.hist = true
	history[userName][msg.topic] = msg
}

function forwardHistory(userName, topic, client) {
	if (history[userName]) {
		const msgs = wildcard(topic, history[userName])
		for (let i in msgs) {
			sendMsg(client, msgs[i])
		}
	}

}

const config = require('./config')

let wss

setInterval(() => {
	//console.log('[Broker] check connection')
	const now = Date.now()
	wss.connections.forEach((client) => {
		if ((now - client.lastPingDate) > pingInterval) {
			client.close()
		}
	})
}, pingInterval)

function init(options, store) {
	if (Object.keys(options).length != 0) {
		options.secure = true
	}

	wss = ws.createServer(options, function (client) {
		onConnect(client, store)
	})

	wss.listen(config.wsPort, () => {
		console.log(`WebSocket server start listening on port `, config.wsPort)
	})
}

function sendMsg(client, msg) {
	//console.log('[Broker] sendMsg', msg)
	if (client == undefined) {
		return
	}
	msg.time = Date.now()
	client.sendText(JSON.stringify(msg))
}



function sendError(client, text) {
	console.log('sendError', text)
	sendMsg(client, { type: 'error', text })
}

function onConnect(client, store) {

	const { path, headers } = client
	//console.log('onConnect', path)

	if (path.startsWith('/homebox/')) {
		const authorization = headers.authorization
		if (authorization == undefined) {
			sendError(client, 'Missing authorization')
			return
		}

		const credentials = auth.parse(headers.authorization)
		//console.log('credentials', credentials)
		const userName = credentials.name
		db.getUserInfo(userName)
			.then((userInfo) => {
				const { pwd } = userInfo
				if (pwd === credentials.pass) {
					addHomeboxClient(client, userName)
				}
				else {
					sendError(client, 'Bad password')
				}
			})
			.catch((e) => {
				sendError(client, e)
			})
	}
	else if (path.startsWith('/hmi/')) {

		if (headers.cookie == undefined) {
			sendError(client, 'Missing cookie')
			return
		}

		const cookies = cookie.parse(headers.cookie)
		//console.log('cookies', cookies)

		let sid = cookies['connect.sid']
		if (sid == undefined) {
			sendError(client, 'Missing sid')
		}

		sid = sid.split(/[:.]+/)[1]
		//console.log('sid', sid)

		store.get(sid, function (err, session) {
			//console.log('err', err)
			//console.log('session', session)
			if (err != null || session == null) {
				sendError(client, 'Unknown session')
				return
			}
			const userName = session.user
			client.sessionId = sid

			addHmiClient(client, userName)
		})
	}
	else {
		sendError(client, 'Unknown client type')
	}
}



function getHmiClients(userName) {
	return wss.connections.filter((c) => c.userName == userName && c.hmi === true)
}

function sendToUser(userName, msg) {
	//console.log('sendToUser', userName, msg)

	msg.time = Date.now()
	msg.type = 'notif'

	const clients = getHmiClients(userName)
	if (clients.length == 0) {
		//console.log(`user '${userName}' is not connected yet`.yellow)
		addToHistory(userName, msg)
		return false
	}

	const text = JSON.stringify(msg)

	clients.forEach((client) => {
		Object.keys(client.registeredTopics).forEach((registeredTopic) => {
			if (wildcard(registeredTopic, msg.topic)) {
				client.sendText(text)
				return
			}

		})
	})
	addToHistory(userName, msg)
	return true
}

function sendTopic(userName, topic, data) {
	return sendToUser(userName, { topic, data })
}

function addHmiClient(client, userName) {
	const clientId = uniqid()
	client.registeredTopics = {}
	client.clientId = clientId
	client.hmi = true
	client.userName = userName
	client.lastPingDate = Date.now()

	console.log(`Client connected`, client.path, userName, clientId)

	if (getHmiClients(userName).length == 1) {
		console.log(`user '${userName}' is connected`.green)
		sendFriends(userName, true)
	}

	client.on('text', (text) => {

		const msg = JSON.parse(text)
		const { type, topic } = msg
		if (type == 'register') {
			//console.log('register', topic)
			client.registeredTopics[topic] = 1

			forwardHistory(userName, topic, client)

			registerHomeboxTopics(getHomeboxClient(userName), [topic])

		}

		if (type == 'unregister') {
			//console.log('unregister', topic)
			if (client.registeredTopics[topic] != undefined) {
				delete client.registeredTopics[topic]
			}

			unregisterHomeboxTopics(getHomeboxClient(userName), [topic])
		}

		if (type == 'notif' && topic.startsWith('homebox.')) {
			//console.log('notif', topic)
			sendMsg(getHomeboxClient(userName), msg)
		}

		if (type == 'ping') {
			//console.log('ping')
			client.lastPingDate = Date.now()
			sendMsg(client, { type: 'pong' })
		}

	})

	client.on('close', (code) => {
		console.log(`Client disconnected`, clientId)
		const topics = Object.keys(client.registeredTopics)
		unregisterHomeboxTopics(getHomeboxClient(userName), topics)

		if (getHmiClients(userName).length == 0) {
			console.log(`client '${userName}' is disconnected`.red)
			sendFriends(userName, false)
		}
	})

	client.on('error', (err) => {
		console.log('connection error')
	})


	sendMsg(client, { type: 'ready', clientId })


}

function getHomeboxClient(userName) {
	return wss.connections.find((c) => c.userName == userName && c.homebox === true)
}

function registerHomeboxTopics(client, topics) {
	if (client == undefined) {
		return
	}

	topics.forEach((topic) => {
		if (topic.startsWith('homebox.')) {
			if (client.registeredTopics[topic] == undefined) {
				client.registeredTopics[topic] = 1
				sendMsg(client, { type: 'register', topic })
			}
			else {
				client.registeredTopics[topic]++
			}
		}
	})
}

function unregisterHomeboxTopics(client, topics) {
	if (client == undefined) {
		return
	}

	topics.forEach((topic) => {
		if (topic.startsWith('homebox.')) {
			if (client.registeredTopics[topic] != undefined) {
				if (--client.registeredTopics[topic] == 0) {
					delete client.registeredTopics[topic]
					sendMsg(client, { type: 'unregister', topic })
				}
			}
		}
	})
}

function addHomeboxClient(client, userName) {
	client.registeredTopics = {}
	client.clientId = uniqid()
	client.homebox = true
	client.userName = userName
	client.services = new EventEmitter()
	client.lastPingDate = Date.now()

	console.log(`homebox '${userName}' is connected`.green)
	sendTopic(userName, 'breizbot.homebox.status', { connected: true })

	client.on('text', (text) => {

		const msg = JSON.parse(text)
		const { type, topic } = msg

		if (type == 'ping') {
			client.lastPingDate = Date.now()
			sendMsg(client, { type: 'pong' })
		}

		if (type == 'notif') {
			sendToUser(userName, msg)
		}
		if (type == 'callServiceResp') {
			client.services.emit(msg.srvName, msg)
		}


	})

	client.on('close', (code) => {
		//console.log(`Client disconnected`)
		console.log(`homebox '${userName}' is disconnected`.red)
		sendTopic(userName, 'breizbot.homebox.status', { connected: false })

	})

	client.on('error', (err) => {
		console.log('connection error')
	})

	getHmiClients(userName).forEach((client) => {
		const topics = Object.keys(client.registeredTopics)
		registerHomeboxTopics(client, topics)
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

		client.services.once(srvName, (msg) => {
			if (msg.err != undefined) {
				reject(msg.err)
			}
			else {
				resolve(msg.data)
			}
		})

		sendMsg(client, {
			type: 'callService',
			srvName,
			data
		})

	})
}

function logout(sessionId) {
	wss.connections.find((client) => {
		if (client.sessionId == sessionId && client.path == '/hmi/') {
			sendMsg(client, { type: 'notif', topic: 'breizbot.logout' })
		}
	})
}

function isUserConnected(userName) {
	return getHmiClients(userName).length != 0
}

async function sendToFriends(userName, topic, data) {
	const friends = await db.getFriends(userName)
	friends.forEach((friend) => {
		sendTopic(friend, topic, data)
	})
}

function sendFriends(userName, isConnected) {
	sendToFriends(userName, 'breizbot.friends', { isConnected, userName })
}

function sendToClient(destId, msg) {
	//console.log('sendToClient', destId, msg)
	msg.type = 'notif'
	const dest = wss.connections.find((client) => {
		return client.clientId == destId
	})
	if (dest != undefined) {
		sendMsg(dest, msg)
		return true
	}
	console.log('client not found !')
	return false
}

function getClients() {
	return wss.connections
}

module.exports = {
	init,
	logout,
	isUserConnected,
	sendToUser,
	sendToClient,
	sendTopic,
	sendToFriends,
	getClients,
	callService
}