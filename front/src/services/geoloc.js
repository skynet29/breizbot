$$.service.registerService('breizbot.geoloc', {

	deps: ['brainjs.resource'],

	init: function (config, resource) {

		const http = resource('/api/position')


		let coords = null

		function geoError(e) {
			console.log('geoloc error:', e)
		}

		function updateLocation(position) {
			//console.log('updateLocation', position)
			coords = position.coords
		}


		function startWatch() {

			navigator.geolocation.getCurrentPosition(updateLocation)

			navigator.geolocation.watchPosition(updateLocation, geoError,
				{
					enableHighAccuracy: true
				}
			)	

			setInterval(sendPosition, 30 * 1000) // every 30 sec
		}


		function sendPosition() {
			//console.log('sendPosition', coords)
			if (coords != null) {
				http.post('/position', {
					lat: coords.latitude,
					lng: coords.longitude
				})

			}
		}		

		return {

			startWatch
		}
	}
});
