$$.service.registerService('app.ytdl', {

	deps: ['brainjs.http'],

	init: function(config, http) {

		return {
			info: function(url) {
				return http.get(`/api/app/youtube/info?url=${url}`)
			},

			download: function(url, fileName, srcId) {
				return http.post(`/api/app/youtube/download`, {url, fileName, srcId})
			}			
		}
	},

	$iface: `
		info(url):Promise;
		download():Promise
		`
});
