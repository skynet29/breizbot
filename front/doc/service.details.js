$$.control.registerControl('$service.details', {

	template: {gulp_inject: './service.details.html'},

	props: {
		name: ''
	},

	init: function(elt) {

		const info = $$.service.getServiceInfo(this.props.name)
		console.log('info', info)


		let hasMethods = false

		let methods =  []
		if (typeof info.options.$iface == 'string') {
			methods = info.options.$iface.split(';')
			hasMethods = true
		}


		const ctrl = $$.viewController(elt, {
			
			data: {
				deps: info.deps,				
				hasMethods,
				name: this.props.name,
				methods,
			}
		})	

	}

});


