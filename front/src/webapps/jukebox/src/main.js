$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	props: {
		$pager: null
	},


	init: function(elt) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onFileClick: function(ev, data) {
					//console.log('onFileClick', data)
					const {rootDir, fileName } = data
					const files = ctrl.scope.files.getFiles()
					//console.log('files', files)
					const firstIdx = files.findIndex((f) => f.name == fileName)
					//console.log('firstIdx', firstIdx)
					$pager.pushPage('player', {
						title: 'Playlist',
						props: {
							firstIdx,
							files,
							rootDir
						}
					})

				}
			}
		})

	}


});




