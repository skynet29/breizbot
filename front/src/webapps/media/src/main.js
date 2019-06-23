$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['app.media'],


	props: {
		$pager: null
	},

	init: function(elt, srvMedia) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onFileClick: function(ev, data) {
					//console.log('onFileClick', data)
					const {fileName, rootDir, driveName} = data
					const fullName = rootDir + fileName
					const url = srvMedia.fileUrl(driveName, fullName)

					if (fileName.endsWith('.ogg') || fileName.endsWith('.mp3')) {
						$pager.pushPage('soundPage', {
							title: fileName,
							props: {
								url
							}
						})						
					}

					if (fileName.endsWith('.mp4')) {
						$pager.pushPage('videoPage', {
							title: fileName,
							props: {
								url
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




