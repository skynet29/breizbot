$$.service.registerService('breizbot.rtc', ['brainjs.http', 'breizbot.broker'], function(config, http, broker) {

	let srcId

	broker.on('ready', (msg) => { srcId = msg.clientId})

	return {
		call: function(to) {
			return http.post(`/api/rtc/sendToUser/${srcId}`, {to, type: 'call'})
		},

		cancel: function(to) {
			return http.post(`/api/rtc/sendToUser/${srcId}`, {to, type: 'cancel'})
		},

		accept: function(destId) {
			return http.post(`/api/rtc/sendToClient/${srcId}`, {destId, type: 'accept'})
		},

		deny: function(destId) {
			return http.post(`/api/rtc/sendToClient/${srcId}`, {destId, type: 'deny'})
		},

		bye: function(destId) {
			return http.post(`/api/rtc/sendToClient/${srcId}`, {destId, type: 'bye'})
		},

		candidate: function(destId, data) {
			return http.post(`/api/rtc/sendToClient/${srcId}`, {destId, type: 'candidate', data})
		},

		offer: function(destId, data) {
			return http.post(`/api/rtc/sendToClient/${srcId}`, {destId, type: 'offer', data})
		},

		answer: function(destId, data) {
			return http.post(`/api/rtc/sendToClient/${srcId}`, {destId, type: 'answer', data})
		}

	}
});
