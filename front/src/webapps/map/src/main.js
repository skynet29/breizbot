$$.control.registerControl('rootPage', {

	deps: ['breizbot.broker', 'breizbot.appData'],

	template: {gulp_inject: './main.html'},

	props: {
		$pager: null
	},

	init: function(elt, broker, appData) {

		const {$pager} = this.props

		const {zoom, center} = appData.getData()

		const ctrl = $$.viewController(elt, {
			data: {
				center: center || {lat: 48.39, lng: -4.486},
				zoom: zoom || 13,
				watchID: null
			},
			events: {
				onSearch: function() {
					console.log('onSearch')
					$pager.pushPage('searchPage', {
						title: 'Search City'
					})
				},
				onLocationChange: function(ev, state) {
					console.log('onLocationChange', state)
					if (state == 'ON') {
						navigator.geolocation.getCurrentPosition(updateLocation)
						
						const watchID = navigator.geolocation.watchPosition(
							updateLocation,
							geoError,
							{
								enableHighAccuracy: true
							}
						)
						ctrl.setData({watchID})
					}
					else {
						navigator.geolocation.clearWatch(ctrl.model.watchID)
						ctrl.setData({watchID: null})
						ctrl.scope.map.removeShape('location')
					}
				}
			}
		})

		function geoError() {
			console.log('geolocation error')
		}

		function updateLocation(position) {
			const latlng = {
				lat: position.coords.latitude,
				lng: position.coords.longitude
			}
			console.log('updateLocation', latlng)
			try {
				ctrl.scope.map.updateShape('location', {latlng})
			}
			catch(e) {
				ctrl.scope.map.addShape('location', {
					type: 'marker',
					icon: {
						type: 'font',
						className: 'far fa-dot-circle',
						color: 'red',
						fontSize: 20
					},
					latlng
				})
			}
			ctrl.scope.map.panTo(latlng)			
		}

		broker.register('homebox.map.updateShape.*', (msg) => {

			const shapeId = msg.topic.split('.').pop()
			//console.log('shapeId', shapeId)

			const shape = msg.data

			if (shape == undefined) {
				ctrl.scope.map.removeShape(shapeId)
				return
			}

			try {
				ctrl.scope.map.updateShape(shapeId, shape)
			}
			catch(e) {
				ctrl.scope.map.addShape(shapeId, shape)
			}
		})

		this.exitApp = function() {
			console.log('Exit map app')
			const {map} = ctrl.scope
			return appData.saveData({zoom: map.getZoom(), center: map.getCenter()})
		}

		this.onReturn = function(coord) {
			console.log('onReturn', coord)
			if (coord != undefined) {
				const latlng = {lat: coord.lat, lng: coord.lon}
				try {
					ctrl.scope.map.updateShape('marker', {latlng})
				}
				catch(e) {
					ctrl.scope.map.addShape('marker', {
						type: 'marker',
						latlng
					})
				}
				ctrl.scope.map.flyTo(latlng, 13)
			}
		}

	}
});




