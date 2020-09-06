$$.control.registerControl('$service.details', {

	template: {gulp_inject: './service.details.html'},

	props: {
		name: ''
	},

	init: function(elt) {

		const info = $$.service.getServiceInfo(this.props.name)
		console.log('info', info)



		let methods =  info.iface || []

		const ctrl = $$.viewController(elt, {
			
			data: {
				deps: info.deps,				
				hasMethods: methods.length > 0,
				name: this.props.name,
				methods,
			}
		})	

	}

});


