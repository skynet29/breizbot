$$.control.registerControl('soundPage', {

	template: {gulp_inject: './sound.html'},

	props: {
		$pager: null,
		url: '',
	},
	
	init: function(elt) {

		const {$pager, url} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				url
			}
		})


	}
});




