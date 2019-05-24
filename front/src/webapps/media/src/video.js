$$.control.registerControl('videoPage', {

	template: {gulp_inject: './video.html'},

	props: {
		$pager: null,
		url: ''
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




