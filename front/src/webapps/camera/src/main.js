$$.control.registerControl('breizbot.main', {

	template: {gulp_inject: './main.html'},

	init: function(elt) {

		const ctrl = $$.viewController(elt, {
			data: {
				pages: [

					{name: 'first', control: 'firstPage'},
					{name: 'snap', control: 'snapPage', title: 'Picture', buttons: [
						{label: 'Save', name: 'save'}
					]}
				]
			}
		})
	}

});




