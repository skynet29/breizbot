//@ts-check
$$.service.registerService('breizbot.songs', {

	deps: ['brainjs.resource'],

	init: function (config, resource) {

		const http = resource('/api/songs')

		return {
			generateDb: function () {
				return http.post('/generateDb')
			},

			querySongs: function (query) {
				return http.post('/querySongs', { query })
			}

		}
	}
});
