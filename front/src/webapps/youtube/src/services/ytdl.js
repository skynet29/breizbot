$$.service.registerService('app.ytdl', {

	deps: ['breizbot.http', 'breizbot.broker'],

	init: function(config, http, broker) {

		let srcId

		broker.on('ready', (msg) => { srcId = msg.clientId})

		return {
			info: function(url) {
				return http.get(`/info`, {url})
			},

			download: function(url, fileName) {
				return http.post(`/download`, {url, fileName, srcId})
			}			
		}
	}

});
