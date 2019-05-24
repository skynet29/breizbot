$$.service.registerService('breizbot.media', {

	deps: ['brainjs.http'],

	init: function(config, http) {
		return {
			drive: function() {
				return http.get('/api/media/drive')
			},

			list: function(driveName, destPath) {
				return http.post('/api/media/list', {driveName, destPath})
			}


		}
	},

	$iface: `
		drive():Promise;
		list(driveName, destPath):Promise		
	`

});
