$$.service.registerService('breizbot.cities', {

	deps: ['brainjs.http'],

	init: function(config, http) {

		return {
			getCountries: function() {
				return http.get('/api/cities/countries')
			},

			getCities: function(country, search) {
				return http.post('/api/cities/cities', {country, search})
			}
			
		}
	},

	$iface: `
		getCountries():Promise;
		getCities(country, search):Promise;
		`
});
