(function() {


	class BrokerClient {

		constructor() {
			this.sock = null
			this.isConnected = false
			this.tryReconnect = true
			this.topics = new EventEmitter2()

			this.registeredTopics = {}

			const {host, pathname} = location
			const port = 8090

			this.url = `wss://${host}:${port}/hmi${pathname}`
		}


		connect() {

			console.log('try to connect...')

			this.sock = new WebSocket(this.url)
	
			this.sock.addEventListener('open', () => {
				console.log("Connected to broker")
				this.isConnected = true

			}) 

			this.sock.addEventListener('message', (ev) => {
				const msg = JSON.parse(ev.data)
				//console.log('[Broker] message', msg)
				
				if (msg.type == 'ready') {
					this.topics.eventNames().forEach((topic) => {
						this.sendMsg({type: 'register', topic})	
					})				
				}

				if (msg.type == 'notif') {
					this.topics.emit(msg.topic, msg)
				}
				if (msg.type == 'error') {
					console.log('[Broker] log', msg.text)
					this.tryReconnect = false
					sock.close()
				}
											
			})

			this.sock.addEventListener('close', (code, reason) => {
				//console.log('WS close', code, reason)
				if (this.isConnected) {
					console.log('[Broker] Disconnected !')
				}
				this.isConnected = false
				if (this.tryReconnect) {
					setTimeout(() => {this.connect()}, 5000)
				}

			})

		}


		sendMsg(msg) {
			//console.log('[Broker] sendMsg', this.isConnected, msg)
			msg.time = Date.now()
			var text = JSON.stringify(msg)
			if (this.isConnected) {
				this.sock.send(text)
			}
		}

		emitTopic(topic, data) {
			console.log('[Broker] emitTopic', topic, data)
			var msg = {
				type: 'notif',
				topic,
				data
			}

			this.sendMsg(msg)
		}


		register(topic, callback) {

			this.topics.on(topic, callback)
			this.sendMsg({type: 'register', topic})			
		}

		unregister(topic, callback) {

			this.topics.off(topic, callback)
			const nbListeners = this.topics.listeners(topic).length

			if (nbListeners == 0) { // no more listeners for this topic
				this.sendMsg({type: 'unregister', topic})
			}		
		}		


		
	}




	$$.service.registerService('breizbot.broker', function(config) {

		const client = new BrokerClient()
		client.connect()

		return client;
	})


})();

