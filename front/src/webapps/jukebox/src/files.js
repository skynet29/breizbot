$$.control.registerControl('files', {

	template: {gulp_inject: './files.html'},

	deps: ['breizbot.pager'],

	props: {
		friendUser: ''
	},


	init: function(elt, pager) {

		const {friendUser} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				friendUser
			},
			events: {
				onFileClick: function(ev, data) {
					//console.log('onFileClick', data)
					const {rootDir, fileName } = data
					const files = ctrl.scope.files.getFiles()
					//console.log('files', files)
					const firstIdx = files.findIndex((f) => f.name == fileName)
					//console.log('firstIdx', firstIdx)
					pager.pushPage('player', {
						title: 'Diaporama',
						props: {
							firstIdx,
							files,
							rootDir,
							friendUser
						}
					})

				}
			}
		})

	}


});




