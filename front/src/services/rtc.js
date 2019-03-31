$$.service.registerService('breizbot.rtc', ['brainjs.http'], function(config, http) {


	return {
		call: function(to) {
			return http.post(`/api/rtc/send`, {to, type: 'call'})
		},

		cancel: function(to) {
			return http.post(`/api/rtc/send`, {to, type: 'cancel'})
		},

		accept: function(to) {
			return http.post(`/api/rtc/send`, {to, type: 'accept'})
		},

		deny: function(to) {
			return http.post(`/api/rtc/send`, {to, type: 'deny'})
		}

	}
});
