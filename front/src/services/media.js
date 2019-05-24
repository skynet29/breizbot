$$.service.registerService('breizbot.media', {

	deps: ['brainjs.http'],

	init: function(config, http) {
		return {
			drive: function() {
				return http.get('/api/media/drive')
			},

			list: function(driveName, destPath) {
				return http.post('/api/media/list', {driveName, destPath})
			},

			fileUrl: function(driveName, fileName) {
				return `/api/media/load?driveName=${driveName}&fileName=${fileName}`
			},

		}
	},

	$iface: `
		drive():Promise;
		list(driveName, destPath):Promise		
	`

});
