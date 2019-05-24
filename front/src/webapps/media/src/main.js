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
					console.log('onFileClick', data)
					const {fileName, rootDir, isImage} = data
					const fullName = rootDir + fileName

					if (fileName.endsWith('.ogg') || fileName.endsWith('.mp3')) {
						$pager.pushPage('soundPage', {
							title: fileName,
							props: {
								fullName
							}
						})						
					}

					if (fileName.endsWith('.mp4')) {
						$pager.pushPage('videoPage', {
							title: fileName,
							props: {
								fullName
							}
						})						
					}														

				}
			}
		})
		this.onReturn = function(data) {
			console.log('onReturn', data)
			if (data === 'reload') {
				ctrl.scope.files.update()
			}
		}
	}
});




