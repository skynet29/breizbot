$$.service.registerService('breizbot.songs', {

	deps: ['brainjs.resource'],

	init: function(config, resource) {

		const http = resource('/api/songs')

		return {
			generateDb: function() {
				return http.post('/generateDb')
			}
			
		}
	},

	$iface: `
        generateDb():Promise
		`
});
