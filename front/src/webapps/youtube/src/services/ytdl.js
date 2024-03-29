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
			info: function(url) {
				return http.get(`/info`, {url})
			},

			download: function(url, fileName, itag) {
				return http.post(`/download`, {url, fileName, srcId, itag})
			},

			search: function(query, maxResults = 3)	{
				return http.post(`/search`, {query, maxResults})
			}		
		}
	}

});
