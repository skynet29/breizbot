
$$.service.registerService('breizbot.rtc', {

	deps: ['brainjs.http', 'breizbot.broker', 'breizbot.params'],

	init: function (config, http, broker, params) {

		const events = new EventEmitter2()

		const private = {
			srcId: null,
			destId: null,
			distant: '',
			status: 'ready',
			isCallee: false
		}


		if (params.caller != undefined) {
			private.status = 'connected'
			private.distant = params.caller
			private.destId = params.clientId
			private.isCallee = true
		}

		broker.on('ready', (msg) => {
			private.srcId = msg.clientId
			//console.log('srcId', msg.clientId)
			events.emit('ready')
		})

		broker.onTopic('breizbot.rtc.accept', (msg) => {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			cancel(false)
			private.destId = msg.srcId
			private.status = 'connected'
			emitStatus()
			events.emit('accept')
		})

		broker.onTopic('breizbot.rtc.deny', (msg) => {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			private.status = 'refused'
			cancel(false)
			emitStatus()
			events.emit('deny')

		})

		broker.onTopic('breizbot.rtc.bye', (msg) => {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			private.status = 'disconnected'
			emitStatus()
			events.emit('bye')

		})


		function getRemoteClientId() {
			return private.destId
		}

		function processCall() {
			console.log('[RTC] processCall')
			broker.register('breizbot.rtc.call', (msg) => {
				if (msg.hist === true) {
					return
				}
				console.log('msg', msg)
				private.destId = msg.srcId
				events.emit('call', msg.data)
			})

			broker.register('breizbot.rtc.cancel', (msg) => {
				if (msg.hist === true) {
					return
				}
				console.log('msg', msg)
				events.emit('cancel')
			})
		}

		function onData(name, callback) {
			broker.onTopic('breizbot.rtc.' + name, (msg) => {
				if (msg.hist === true) {
					return
				}
				callback(msg.data, msg.time)
			})
		}

		function emitStatus() {
			events.emit('status', { status: private.status, distant: private.distant })
		}

		function call(to, appName, iconCls) {
			private.distant = to
			private.status = 'calling'
			emitStatus()
			return http.post(`/api/rtc/sendToUser`, {
				to,
				srcId: private.srcId,
				type: 'call',
				data: { appName, iconCls }
			})
		}

		function cancel(updateStatus = true) {
			console.log('[RTC] cancel', updateStatus)
			if (updateStatus) {
				private.status = 'canceled'
				emitStatus()
			}
			return http.post(`/api/rtc/sendToUser`, { to: private.distant, srcId: private.srcId, type: 'cancel' })
		}

		function accept() {
			console.log('[RTC] accept')

			emitStatus()
			return sendData('accept')
		}

		function deny() {
			console.log('[RTC] deny')

			return sendData('deny')
		}

		function bye() {
			console.log('[RTC] bye')

			if (private.status == 'connected') {
				private.status = 'ready'
				private.distant = ''
				emitStatus()
				return sendData('bye')
			}

			return Promise.resolve()
		}

		function exit() {
			if (private.status == 'calling') {
				return cancel()
			}
			if (private.status == 'connected') {
				return bye()
			}
			return Promise.resolve()
		}

		function sendData(type, data) {
			return http.post(`/api/rtc/sendToClient`, {
				destId: private.destId,
				srcId: private.srcId,
				type,
				data
			})
		}

		function isCallee() {
			return private.isCallee
		}

		return {
			call,
			cancel,
			deny,
			bye,
			sendData,
			onData,
			on: events.on.bind(events),
			processCall,
			getRemoteClientId,
			exit,
			accept,
			isCallee

		}
	}
});

