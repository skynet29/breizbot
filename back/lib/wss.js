//@ts-check

const wildcard = require('wildcard')
const cookie = require('cookie')
const uniqid = require('uniqid')
const websocket = require('./websocket.js')


require('colors')

const dbFriends = require('../db/friends.js')
const homebox = require('./homebox.js')

homebox.events.on('clientConnected', (userName) => {
	sendNotifToUser(userName, 'breizbot.homebox.status', { connected: true })

	getHmiClients(userName).forEach((client) => {
		const topics = Object.keys(client.registeredTopics)
		homebox.registerHomeboxTopics(userName, topics)
	})

})

homebox.events.on('clientDisconnected', (userName) => {
	sendNotifToUser(userName, 'breizbot.homebox.status', { connected: false })

})

homebox.events.on('notif', (userName, msg) => {
	sendMsgToUser(userName, msg)

})

const history = {}

const wss = websocket.addServer('/hmi/', onHmiConnect)


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
			websocket.sendMsg(client, msgs[i])
		}
	}

}


async function onHmiConnect(client, store) {

	console.log('onHmiConnect')

	const { headers } = client
	//console.log('onConnect', path)

	if (headers.cookie == undefined) {
		websocket.sendError(client, 'Missing cookie')
		return
	}

	const cookies = cookie.parse(headers.cookie)
	//console.log('cookies', cookies)

	let sid = cookies['connect.sid']
	if (sid == undefined) {
		websocket.sendError(client, 'Missing sid')
	}

	sid = sid.split(/[:.]+/)[1]
	//console.log('sid', sid)

	store.get(sid, function (err, session) {
		//console.log('err', err)
		//console.log('session', session)
		if (err != null || session == null) {
			websocket.sendError(client, 'Unknown session')
			return
		}
		const userName = session.user
		client.sessionId = sid

		addHmiClient(client, userName)
	})
}

function getHmiClients(userName) {
	return getClients().filter((c) => c.userName == userName)
}

function sendMsgToUser(userName, msg) {
	//console.log('sendToUser', userName, msg)

	msg.time = Date.now()

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
				client.send(text)
				return
			}

		})
	})
	addToHistory(userName, msg)
	return true
}

function sendNotifToUser(userName, topic, data) {
	return sendMsgToUser(userName, { type: 'notif', topic, data })
}

function addHmiClient(client, userName) {
	const clientId = uniqid()
	client.registeredTopics = {}
	client.clientId = clientId
	client.userName = userName
	client.lastPingDate = Date.now()

	console.log(`Client connected`, client.path, userName, clientId)

	if (getHmiClients(userName).length == 1) {
		console.log(`user '${userName}' is connected`.green)
		sendStatusToFriends(userName, true)
	}

	client.on('message', (text) => {

		//console.log('message', text)

		const msg = JSON.parse(text)
		const { type, topic } = msg
		if (type == 'register') {
			//console.log('register', userName, topic)
			client.registeredTopics[topic] = 1

			forwardHistory(userName, topic, client)

			homebox.registerHomeboxTopics(userName, [topic])

		}

		if (type == 'unregister') {
			//console.log('unregister', topic)
			if (client.registeredTopics[topic] != undefined) {
				delete client.registeredTopics[topic]
			}

			homebox.unregisterHomeboxTopics(userName, [topic])
		}

		if (type == 'notif' && topic.startsWith('homebox.')) {
			//console.log('notif', topic)
			homebox.sendMsg(userName, msg)
		}

		if (type == 'ping') {
			//console.log('ping')
			websocket.sendPong(client)
		}

	})

	client.on('close', (code) => {
		console.log(`Client disconnected`, clientId)
		const topics = Object.keys(client.registeredTopics)
		homebox.unregisterHomeboxTopics(userName, topics)

		if (getHmiClients(userName).length == 0) {
			console.log(`client '${userName}' is disconnected`.red)
			sendStatusToFriends(userName, false)
		}
	})

	client.on('error', (err) => {
		console.log('connection error')
	})


	websocket.sendMsg(client, { type: 'ready', clientId })


}








function logout(sessionId) {
	getClients().find((client) => {
		if (client.sessionId == sessionId && client.path == '/hmi/') {
			websocket.sendNotif(client, 'breizbot.logout')
		}
	})
}

function isUserConnected(userName) {
	return getHmiClients(userName).length != 0
}


async function sendToFriends(userName, topic, data) {
	const friends = await dbFriends.getFriends(userName)
	friends.forEach((friend) => {
		sendNotifToUser(friend, topic, data)
	})
}

function sendStatusToFriends(userName, isConnected) {
	sendToFriends(userName, 'breizbot.friends', { isConnected, userName })
}

function sendToClient(destId, msg) {
	//console.log('sendToClient', destId, msg)
	msg.type = 'notif'
	const dest = getClients().find((client) => {
		return client.clientId == destId
	})
	if (dest != undefined) {
		websocket.sendMsg(dest, msg)
		return true
	}
	console.log('client not found !')
	return false
}

function getClients() {
	return Array.from(wss.clients)
}

module.exports = {
	logout,
	isUserConnected,
	sendMsgToUser,
	sendToClient,
	sendNotifToUser,
	sendToFriends,
	getClients,
	homebox
}