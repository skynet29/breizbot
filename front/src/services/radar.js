//@ts-check
$$.service.registerService('breizbot.radar', {

	deps: ['brainjs.resource', 'brainjs.http'],

	init: function(config, resource) {

		const http = resource('/api/radar')

		return {
			getRadar: function() {
				return http.get('/')
			}
			
		}
	}
});
