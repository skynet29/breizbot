$$.service.registerService('app.browser', {

	deps: ['breizbot.http'],

	init: function(config, http) {

		return {
			search: function(query) {
				return http.post(`/search`, {query})
			}
		
		}
	}

});