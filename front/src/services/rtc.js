$$.service.registerService('breizbot.rtc', {

	deps: ['brainjs.http', 'breizbot.broker'],

	init: function(config, http, broker) {

		let srcId
		let destId

		return {
			getRemoteClientId: function() {
				return destId
			},

			setRemoteClientId: function(clientId) {
				destId = clientId
			},

			setLocalClientId: function(clientId) {
				srcId = clientId
			},


			call: function(to, appName, iconCls) {
				return http.post(`/api/rtc/sendToUser`, {
					to,
					srcId,
					type: 'call',
					data: {appName, iconCls}
				})
			},

			cancel: function(to) {
				return http.post(`/api/rtc/sendToUser`, {to, srcId, type: 'cancel'})
			},

			accept: function() {
				return this.sendData('accept')
			},

			deny: function() {
				return this.sendData('deny')
			},

			bye: function() {
				return this.sendData('bye')
			},

			sendData: function(type, data) {
				return http.post(`/api/rtc/sendToClient`, {destId, srcId, type, data})
			}

		}
	},
	$iface: `
		getRemoteClientId():string;
		setRemoteClientId(clientId);
		call(to):Promise;
		cancel(to):Promise;
		deny():Promise;
		bye():Promise;
		candidate(info):Promise;
		offer(data):Promise;
		answer(data):Promise
	`
});
