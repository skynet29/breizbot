$$.service.registerService('breizbot.apps', ['brainjs.http'], function(config, http) {


	return {
		listAll: function() {
			return http.get('/api/apps/all')
		},

		listMyApp: function() {
			return http.get('/api/apps/myapp')
		}
		
	}
});
