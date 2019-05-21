$$.control.registerControl('rootPage', {

	deps: ['breizbot.files'],

	template: {gulp_inject: './main.html'},

	props: {
		$pager: null
	},

	init: function(elt, srvFiles) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onFileClick: function(ev, data) {
					console.log('onFileClick', data)
					const {fileName, rootDir, isImage} = data
					const fullName = rootDir + fileName

					if (isImage) {						
						$pager.pushPage('imagePage', {
							title: fileName,
							props: {
								fullName
							}
						})
					}

					if (fileName.endsWith('.pdf')) {
						$pager.pushPage('pdfPage', {
							title: fileName,
							props: {
								fullName
							}
						})						
					}	


					if (fileName.endsWith('.ogg') || fileName.endsWith('.mp3')) {
						$pager.pushPage('soundPage', {
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




