

$$.service.registerService('breizbot.broker', {

	init: function (config) {

		const events = new EventEmitter2()

		let sock = null
		let isConnected = false
		let tryReconnect = true
		let isPingOk = true
		const topics = new EventEmitter2({ wildcard: true })
		const pingInterval = 10 * 1000
		let timeoutId = null
		const registeredTopics = {}

		let { host, pathname, protocol } = location
		protocol = (protocol == 'http:') ? 'ws:' : 'wss:'


		const url = `${protocol}//${host}/hmi${pathname}`

		function onClose() {
			//console.log('onClose')
			if (isConnected) {
				console.log('[Broker] Disconnected !')
				events.emit('connected', false)
			}
			isConnected = false
			if (tryReconnect) {
				setTimeout(() => { connect() }, 5000)
			}
		}

		function checkPing() {
			timeoutId = setTimeout(() => {

				if (!isPingOk) {
					console.log('timeout ping')
					sock.onmessage = null
					sock.onclose = null
					sock.close()
					onClose()
				}
				else {
					isPingOk = false
					sendMsg({ type: 'ping' })
					checkPing()
				}
			}, pingInterval)
		}

		function connect() {

			console.log('try to connect...')

			sock = new WebSocket(url)

			sock.onopen = () => {
				console.log("Connected to broker")
				isConnected = true
				isPingOk = true
				events.emit('connected', true)
				checkPing()

			}


			sock.onmessage = (ev) => {
				const msg = JSON.parse(ev.data)

				if (ev.currentTarget != sock) {
					console.log('[broker] message bad target', msg.type)
					ev.currentTarget.close()
					return
				}
				//console.log('[Broker] message', msg)

				if (msg.type == 'ready') {
					Object.keys(registeredTopics).forEach((topic) => {
						sendMsg({ type: 'register', topic })
					})

					events.emit('ready', { clientId: msg.clientId })
				}

				if (msg.type == 'pong') {
					isPingOk = true
				}

				if (msg.type == 'notif') {
					topics.emit(msg.topic, msg)
				}

				if (msg.type == 'error') {
					console.log('[Broker] log', msg.text)
					tryReconnect = false
					sock.close()
				}

			}

			sock.onclose = (ev) => {
				if (ev.currentTarget != sock) {
					console.log('[broker] close bad target')
					return
				}
				console.log('[broker] close')
				if (timeoutId != null) {
					clearTimeout(timeoutId)
					timeoutId = null
				}
				onClose()
			}

		}

		function sendMsg(msg) {
			msg.time = Date.now()
			const text = JSON.stringify(msg)
			if (isConnected) {
				//console.log('[Broker] sendMsg', msg)
				sock.send(text)
			}
		}

		function emitTopic(topic, data) {
			//console.log('[Broker] emitTopic', topic, data)
			const msg = {
				type: 'notif',
				topic,
				data
			}

			sendMsg(msg)
		}

		function onTopic(topic, callback) {
			topics.on(topic, callback)
		}

		function offTopic(topic, callback) {
			topics.off(topic, callback)
		}

		function register(topic, callback) {
			//console.log('[Broker] register', topic)
			if (registeredTopics[topic] == undefined) {
				registeredTopics[topic] = 1
			}
			else {
				registeredTopics[topic]++;
			}
			topics.on(topic, callback)
			sendMsg({ type: 'register', topic })
		}

		function unregister(topic, callback) {

			topics.off(topic, callback)
			
			if (--registeredTopics[topic] == 0) {
				delete registeredTopics[topic]
				sendMsg({ type: 'unregister', topic })
			}
		}

		connect()

		return {
			emitTopic,
			onTopic,
			offTopic,
			register,
			unregister,
			on: events.on.bind(events)

		}
	},

	$iface: `
			emitTopic(topicName, data);
			register(topicName, callback);
			unregister(topicName, callback);
			onTopic(topicName, callback)
			on(event, callback)

		`
});




