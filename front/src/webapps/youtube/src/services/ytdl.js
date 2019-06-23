$$.service.registerService('app.ytdl', {

	deps: ['breizbot.http'],

	init: function(config, http) {

		return {
			info: function(url) {
				return http.get(`/info`, {url})
			},

			download: function(url, fileName, srcId) {
				return http.post(`/download`, {url, fileName, srcId})
			}			
		}
	}

});
