(function(){

class RTC extends EventEmitter2 {
	constructor(broker, http, params) {

		super()

		this.broker = broker
		this.http = http

		this.srdId = undefined
		this.destId = undefined
		this.distant = ''
		this.status = 'ready'
		this.isCallee = false
		if (params.caller != undefined) {
			this.status = 'connected'
			this.distant = params.caller
			this.destId = params.clientId
			this.isCallee = true
		}

		broker.on('ready', (msg) => {
			this.srcId = msg.clientId
			this.emit('ready')
		})

		broker.onTopic('breizbot.rtc.accept', (msg) => {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			this.cancel(false)
			this.destId = msg.srcId
			this.status = 'connected'
			this.emitStatus()	
			this.emit('accept')	
		})		

		broker.onTopic('breizbot.rtc.deny', (msg) => {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			this.status = 'refused'
			this.cancel(false)
			this.emitStatus()
			this.emit('deny')	

		})		

		broker.onTopic('breizbot.rtc.bye', (msg) => {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			this.status = 'disconnected'
			this.emitStatus()
			this.emit('bye')

		})				
	}

	getRemoteClientId() {
		return this.destId
	}

	processCall() {
		console.log('[RTC] processCall')
		this.broker.register('breizbot.rtc.call', (msg) => {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			this.destId = msg.srcId
			this.emit('call', msg.data)
		})

		this.broker.register('breizbot.rtc.cancel', (msg) => {
			if (msg.hist === true) {
				return
			}
			console.log('msg', msg)
			this.emit('cancel')
		})		
	}

	onData(name, callback) {
		this.broker.onTopic('breizbot.rtc.' + name, (msg) => {
			if (msg.hist === true) {
				return
			}
			callback(msg.data, msg.time)
		})			
	}

	emitStatus() {
		this.emit('status', {status: this.status, distant: this.distant})
	}

	call(to, appName, iconCls) {
		this.distant = to
		this.status = 'calling'
		this.emitStatus()
		return this.http.post(`/api/rtc/sendToUser`, {
			to,
			srcId: this.srcId,
			type: 'call',
			data: {appName, iconCls}
		})
	}	

	cancel(updateStatus = true) {
		console.log('[RTC] cancel', updateStatus)
		if (updateStatus) {
			this.status = 'canceled'
			this.emitStatus()			
		}
		return this.http.post(`/api/rtc/sendToUser`, {to: this.distant, srcId: this.srcId, type: 'cancel'})
	}	

	accept() {
		console.log('[RTC] accept')

		this.emitStatus()
		return this.sendData('accept')
	}

	deny() {
		console.log('[RTC] deny')

		return this.sendData('deny')
	}

	bye() {
		console.log('[RTC] bye')

		if (this.status == 'connected') {
			this.status = 'ready'
			this.distant = ''
			this.emitStatus()
			return this.sendData('bye')			
		}

		return Promise.resolve()
	}

	sendData(type, data) {
		return this.http.post(`/api/rtc/sendToClient`, {
			destId: this.destId, 
			srcId: this.srcId,
			type,
			data
		})
	}	

}

$$.service.registerService('breizbot.rtc', {

	deps: ['brainjs.http', 'breizbot.broker', 'breizbot.params'],

	init: function(config, http, broker, params) {

		return new RTC(broker, http, params)
	},
	$iface: `
		call(to):Promise;
		cancel(to):Promise;
		deny():Promise;
		bye():Promise;
		sendData(type, data):Promise;
		onData(callback(data, time))
	`
});


})();