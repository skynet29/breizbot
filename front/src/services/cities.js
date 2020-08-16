$$.service.registerService('breizbot.cities', {

	deps: ['brainjs.resource', 'brainjs.http'],

	init: function(config, resource, httpSrv) {

		const http = resource('/api/cities')

		return {
			getCountries: function() {
				return http.get('/countries')
			},

			getCities: function(country, search) {
				return http.post('/cities', {country, search})
			},

			getCitesFromPostalCode: async function(postalCode) {
				const url = 'https://apicarto.ign.fr/api/codes-postaux/communes/' + postalCode
				try {
					const info = await httpSrv.get(url)
					console.log('info', info)
					return info.map((i) => i.libelleAcheminement)	
				}
				catch(e) {
					return []
				}
	
			}


			
		}
	},

	$iface: `
		getCountries():Promise;
		getCities(country, search):Promise;
		`
});
