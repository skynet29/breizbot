$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.pager'],

    props: {
    },

	init: function(elt, pager) {


		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
			}
		})

	}


});




