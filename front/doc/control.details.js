$$.control.registerControl('$control.details', {

	template: {gulp_inject: './control.details.html'},

	props: {
		name: ''
	},

	init: function(elt) {

		const info = $$.control.getControlInfo(this.props.name)
		console.log('info', info)


		let hasMethods = false
		let hasEvents = false

		let methods =  []
		if (typeof info.options.$iface == 'string') {
			methods = info.options.$iface.split(';')
			hasMethods = true
		}

		let events =  []
		if (typeof info.options.$events == 'string') {
			events = info.options.$events.split(';')
			hasEvents = true
		}

		const props = info.options.props || {}
		
		const hasProperties = Object.keys(props).length != 0
		console.log('hasMethods', hasMethods, methods)
		console.log('hasEvents', hasEvents, events)

		const ctrl = $$.viewController(elt, {
			
			data: {
				deps: info.deps,
				hasEvents,
				hasMethods,
				hasProperties,
				name: this.props.name,
				methods,
				events,
				props: JSON.stringify(props, null, 4)//.replace(/\"/g, '')
			}
		})	

	}

});


