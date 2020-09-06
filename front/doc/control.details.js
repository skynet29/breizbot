$$.control.registerControl('$control.details', {

	template: {gulp_inject: './control.details.html'},

	props: {
		name: ''
	},

	init: function(elt) {

		const info = $$.control.getControlInfo(this.props.name)
		console.log('info', info)


		const methods =  info.iface || []

		const events =  info.events || []

		const props = info.props || {}
		
		const hasProperties = Object.keys(props).length != 0

		const ctrl = $$.viewController(elt, {
			
			data: {
				deps: info.deps,
				hasDeps: info.deps.length > 0,
				hasEvents: events.length > 0,
				hasMethods: methods.length > 0,
				hasProperties,
				name: this.props.name,
				methods,
				events,
				props: JSON.stringify(props, null, 4)//.replace(/\"/g, '')
			}
		})	

	}

});


