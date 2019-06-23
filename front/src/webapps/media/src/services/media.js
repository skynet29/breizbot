$$.service.registerService('app.media', {

	deps: ['breizbot.http'],

	init: function(config, http) {
		return {
			drive: function() {
				return http.get('/drive')
			},

			list: function(driveName, destPath) {
				return http.post('/list', {driveName, destPath})
			},

			fileUrl: function(driveName, fileName) {
				return $$.util.getUrlParams('/api/app/media/load', {driveName, fileName})
			},

		}
	},

	$iface: `
		drive():Promise;
		list(driveName, destPath):Promise		
	`

});
