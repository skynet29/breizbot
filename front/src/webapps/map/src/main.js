$$.control.registerControl('breizbot.main', {

	deps: ['breizbot.broker'],

	template: {gulp_inject: './main.html'},

	init: function(elt, broker) {

		const ctrl = $$.viewController(elt)

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

	}
});




