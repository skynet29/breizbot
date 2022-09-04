// @ts-check

$$.control.registerControl('fileInfo', {

	template: { gulp_inject: './fileInfo.html' },

	deps: ['breizbot.pager'],

	props: {
		info: null
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, pager) {

		console.log('props', this.props)
		const { info } = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				info
			},
			events: {
			}
		})

	}


});




