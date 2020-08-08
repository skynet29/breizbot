$$.service.registerService('breizbot.position', {

	deps: ['brainjs.resource'],

	init: function (config, resource) {

		const http = resource('/api/position')

		return {

			sendPosition: function (coords) {
				//console.log('sendFriendPosition', coords)
				return http.post('/position', coords)
			}
		}
	},
	$iface: `
		sendPosition(coords):Promise
	`
});
