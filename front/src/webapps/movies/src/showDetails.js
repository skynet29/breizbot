//@ts-check
$$.control.registerControl('showDetails', {

	template: { gulp_inject: './showDetails.html' },

	props: {
		data: {}
	},

	init: function (elt) {

		const { data } = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				getSynopsis: function() {
					return (data.synopsis) ? data.synopsis.replace(/\n/g, '<br><br>') : ''
				}
			},
			events: {
			}
		})

	}


});




