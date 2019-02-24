$$.control.registerControl('breizbot.main', {

	template: {gulp_inject: './main.html'},

	init: function(elt) {

		$$.viewController(elt, {
			data: {
				center: {lat: 48.39, lng: -4.486}
			}

		})
	}
});




