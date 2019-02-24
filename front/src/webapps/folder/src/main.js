$$.control.registerControl('breizbot.main', {

	template: {gulp_inject: './main.html'},

	init: function(elt) {

		$$.viewController(elt, {
			data: {
			}
		})
	}
});




