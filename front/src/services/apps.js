$$.service.registerService('breizbot.apps', {

	deps: ['brainjs.http'],

	init: function(config, http) {

		return {
			listAll: function() {
				return http.get('/api/apps/all')
			},

			listMyApp: function() {
				return http.get('/api/apps/myapp')
			}
			
		}
	},

	$iface: `
		listAll():Promise;
		listMyApp():Promise 
		`
});
