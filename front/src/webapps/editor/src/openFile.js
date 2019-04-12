$$.control.registerControl('openFile', {

	template: {gulp_inject: './openFile.html'},

	props: {
		$pager: null,
		imageOnly: false,
		filterExtension: '',
		showThumbnail: false,
		cmd: ''
	},

	init: function(elt) {

		const {$pager, imageOnly, filterExtension, cmd, showThumbnail} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				imageOnly,
				filterExtension,
				showThumbnail
			},
			events: {
				onFileClick: function(ev, data) {
					data.cmd = cmd
					console.log('onFileClick', data)
					$pager.popPage(data)
				}
			}
		})
	}
});




