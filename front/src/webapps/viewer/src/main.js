// @ts-check

$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.params'],

	props: {
	},

	init: function (elt, params) {
		const {type, url} = params

		//console.log('params', params)

		const ctrl = $$.viewController(elt, {
			data: {
				type,
				url
			},
			events: {
			}
		})

	}


});




