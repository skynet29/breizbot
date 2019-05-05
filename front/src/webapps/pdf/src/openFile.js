$$.control.registerControl('openFilePage', {

	template: {gulp_inject: './openFile.html'},

	props: {
		$pager: null,
	},

	init: function(elt) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onFileClick: function(ev, data) {
					console.log('onFileClick', data)
					$pager.popPage(data)
				}
			}
		})
	}
});




