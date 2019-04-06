$$.service.registerService('breizbot.rtc', ['brainjs.http', 'breizbot.broker'], function(config, http, broker) {

	let srcId
	let destId

	broker.on('ready', (msg) => { srcId = msg.clientId})

	return {
		getRemoteClientId: function() {
			return destId
		},

		setRemoteClientId: function(clientId) {
			destId = clientId
		},

		call: function(to) {
			return http.post(`/api/rtc/sendToUser/${srcId}`, {to, type: 'call'})
		},

		cancel: function(to) {
			return http.post(`/api/rtc/sendToUser/${srcId}`, {to, type: 'cancel'})
		},

		accept: function() {
			return http.post(`/api/rtc/sendToClient/${srcId}`, {destId, type: 'accept'})
		},

		deny: function() {
			return http.post(`/api/rtc/sendToClient/${srcId}`, {destId, type: 'deny'})
		},

		bye: function() {
			return http.post(`/api/rtc/sendToClient/${srcId}`, {destId, type: 'bye'})
		},

		candidate: function(info) {
			return http.post(`/api/rtc/sendToClient/${srcId}`, {
				destId, 
				type: 'candidate', 
				data: {
					label: info.sdpMLineIndex,
					id: info.sdpMid,
					candidate: info.candidate	
				}
			})
		},

		offer: function(data) {
			return http.post(`/api/rtc/sendToClient/${srcId}`, {destId, type: 'offer', data})
		},

		answer: function(data) {
			return http.post(`/api/rtc/sendToClient/${srcId}`, {destId, type: 'answer', data})
		}

	}
});
