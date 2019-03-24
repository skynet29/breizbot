$$.control.registerControl('breizbot.main', {

	deps: ['breizbot.broker'],

	template: {gulp_inject: './main.html'},

	init: function(elt, broker) {

		const ctrl = $$.viewController(elt)

		broker.register('homebox.map.updateShape', (msg) => {
			if (msg.hist === true) {
				return
			}
			//console.log('msg', msg)
			const {id, shape} = msg.data
			try {
				ctrl.scope.map.updateShape(id, shape)
			}
			catch(e) {
				ctrl.scope.map.addShape(id, shape)
			}
		})

		broker.register('homebox.map.removeShape', (msg) => {
			if (msg.hist === true) {
				return
			}
			//console.log('msg', msg)
			const {id} = msg.data
			ctrl.scope.map.removeShape(id)
		})

	}
});




