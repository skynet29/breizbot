const ws = require("nodejs-websocket")
const cookie = require('cookie')
const auth = require('basic-auth')
require('colors')

const db = require('./db')


const config = require('./config')
const Broker = require('./broker')

const brokers = {}
let wss

function init(options, store) {
	if (Object.keys(options).length != 0) {
		options.secure = true
	}

	wss = ws.createServer(options, function(client) {
		onConnect(client, store)
	})

	wss.listen(config.wsPort, () => {
		console.log(`WebSocket server start listening on port `, config.wsPort)
	})
}

function sendError(client, text) {
	console.log('sendError', text)
	const msg = {
		type: 'error',
		text
	}
	client.sendText(JSON.stringify(msg))
}

function getBroker(userName) {
	let broker = brokers[userName]
	if (broker == undefined) {
		broker = brokers[userName] = new Broker(userName)
		broker.on('connect', (isConnected) => {
			if (isConnected)
				console.log(`client '${userName}' is connected`.green)
			else
				console.log(`client '${userName}' is disconnected`.red)

			db.getFriends(userName).then((friends) => {
				friends.forEach((friend) => {
					if (isUserConnected(friend)) {
						sendMessage(friend, 'breizbot.friends', {isConnected, userName})
					}
				})
			})
		})
	}
	return broker	
}


function onConnect(client, store) {

	const {path, headers} = client
	console.log('onConnect', path)

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
			const {pwd} = userInfo
			if (pwd === credentials.pass) {
					getBroker(userName).setHomeboxClient(client)
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

		store.get(sid, function(err, session) {
			//console.log('err', err)
			//console.log('session', session)
			if (err != null || session == null) {
				sendError(client, 'Unknown session')
				return
			}
			const userName = session.user
			const broker = getBroker(userName)
			client.sessionId = sid
			
			broker.addClient(client)
		})
	}
	else {
		sendError(client, 'Unknown client type')
	}
}

function sendMessage(userName, topic, data) {
	//console.log('[WSS] sendMessage', userName, topic, data)
	getBroker(userName).sendMessage(undefined, topic, data)
}

function sendMsg(client, msg) {
	client.sendText(JSON.stringify(msg))
}

function sendTo(srcId, destId, topic, data) {
	console.log('sendTo', {destId, topic, srcId})
	const dest = wss.connections.find((client) => {
		return client.clientId == destId
	})
	if (dest != undefined) {
		sendMsg(dest, {type: 'notif', topic, data, srcId, time: Date.now()})
		return true
	}
	return false
}

function getClients() {
	return wss.connections
}

function isUserConnected(userName) {
	return getBroker(userName).hasClient()
}


function callService(userName, srvName, data) {
	console.log('[WSS] callService', userName, srvName, data)
	return getBroker(userName).callService(srvName, data)
}

module.exports = {
	init,
	sendMessage,
	getBroker,
	sendTo,
	getClients,
	isUserConnected,
	callService
}