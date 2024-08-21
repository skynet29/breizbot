//@ts-check
$$.service.registerService('app.ytdl', {

	deps: ['breizbot.http', 'breizbot.broker'],

	/**
	 * 
	 * @param {Breizbot.Services.Http.Interface} http 
	 * @param {Breizbot.Services.Broker.Interface} broker 
	 * @returns 
	 */
	init: function(config, http, broker) {

		let srcId

		broker.on('ready', (msg) => { srcId = msg.clientId})

		return {
			info: function(videoId) {
				return http.get(`/info`, {videoId})
			},

			download: function(url, fileName, videoId) {
				return http.post(`/download`, {url, fileName, srcId, videoId})
			},

			search: function(query, maxResults = 3)	{
				return http.post(`/search`, {query, maxResults})
			}		
		}
	}

});
