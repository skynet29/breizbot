$$.service.registerService('breizbot.ytdl', {

	deps: ['brainjs.http'],

	init: function(config, http) {

		return {
			info: function(url) {
				return http.get(`/api/ytdl/info?url=${url}`)
			},

			download: function(url, fileName, srcId) {
				return http.post(`/api/ytdl/download`, {url, fileName, srcId})
			}			
		}
	},

	$iface: `
		info(url):Promise;
		download():Promise
		`
});
