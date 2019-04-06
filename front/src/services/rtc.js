$$.service.registerService('breizbot.rtc', ['brainjs.http'], function(config, http) {


	return {
		call: function(to, clientId) {
			return http.post(`/api/rtc/sendToUser`, {to, type: 'call', data: {clientId}})
		},

		cancel: function(to) {
			return http.post(`/api/rtc/sendToUser`, {to, type: 'cancel'})
		},

		accept: function(clientId, fromClientId) {
			return http.post(`/api/rtc/sendToClient`, {clientId, type: 'accept', data: {fromClientId}})
		},

		deny: function(clientId) {
			return http.post(`/api/rtc/sendToClient`, {clientId, type: 'deny'})
		},

		bye: function(clientId) {
			return http.post(`/api/rtc/sendToClient`, {clientId, type: 'bye'})
		},

		candidate: function(clientId, data) {
			return http.post(`/api/rtc/sendToClient`, {clientId, type: 'candidate', data})
		},

		offer: function(clientId, data) {
			return http.post(`/api/rtc/sendToClient`, {clientId, type: 'offer', data})
		},

		answer: function(clientId, data) {
			return http.post(`/api/rtc/sendToClient`, {clientId, type: 'answer', data})
		}

	}
});
