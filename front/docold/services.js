$$.control.registerControl('$services', {

	template: {gulp_inject: './services.html'},

	init: function(elt) {

		const ctrl = $$.viewController(elt, {
			
			data: {
			}
		})		
	}

});


