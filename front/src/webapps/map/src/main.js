$$.control.registerControl('rootPage', {

	deps: ['breizbot.broker', 'breizbot.appData'],

	template: {gulp_inject: './main.html'},

	init: function(elt, broker, appData) {

		let {zoom, center} = appData.getData()

		const ctrl = $$.viewController(elt, {
			data: {
				center: center || {lat: 48.39, lng: -4.486},
				zoom: zoom || 13
			}
		})

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
		};			

	}
});




