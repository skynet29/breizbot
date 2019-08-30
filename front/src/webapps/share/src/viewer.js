$$.control.registerControl('viewerPage', {

	deps: ['breizbot.files'],

	template: {gulp_inject: './viewer.html'},

	props: {
		fullName: '',
		userName: ''
	},
	
	init: function(elt, files) {

		const {fullName, userName} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				type: $$.util.getFileType(fullName),
				url: files.fileUrl(fullName, userName)
			}
		})

	}
});




