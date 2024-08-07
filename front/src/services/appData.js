//@ts-check
$$.service.registerService('breizbot.appData', {

	deps: ['brainjs.http'],

	/**
	 * 
	 * @returns 
	 */
	init: function(config, http) {

		let _data = config

		return {
			getData: function() {
				return _data
			},

			saveData: function(data) {
				_data = data
				return http.post('/api/appData', data)
			}
			
		}
	}
});
