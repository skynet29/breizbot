$$.control.registerControl('viewerPage', {

	deps: ['app.share'],

	template: {gulp_inject: './viewer.html'},

	props: {
		$pager: null,
		fullName: '',
		userName: ''
	},
	
	init: function(elt, files) {

		const {$pager, fullName, userName} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				type: $$.util.getFileType(fullName),
				url: files.fileUrl(userName, fullName)
			}
		})

	}
});




