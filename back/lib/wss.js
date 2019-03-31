const ws = require("nodejs-websocket")
const cookie = require('cookie')
const auth = require('basic-auth')

const db = require('./db')


const config = require('./config')
const Broker = require('./broker')

var brokers = {}

function init(options, store) {
	options.secure = true

	const wss = ws.createServer(options, function(client) {
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
		console.log('credentials', credentials)
		const userName = credentials.name
		db.getUserInfo(userName)
		.then((userInfo) => {
			const {pwd} = userInfo
			if (pwd === credentials.pass) {
					const broker = getBroker(userName)	
					if (broker.homeboxClient != null) {
						sendError(client, 'A homebox is already connected')
					}
					else {
						broker.setHomeboxClient(client)
					}
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
			
			broker.addClient(client)
		})
	}
	else {
		sendError(client, 'Unknown client type')
	}
}

function sendMessage(userName, topic, data) {
	getBroker(userName).sendMessage(topic, data)
}

module.exports = {
	init,
	sendMessage,
	getBroker
}