$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['app.media', 'breizbot.pager'],


	init: function(elt, srvMedia, pager) {

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
						pager.pushPage('soundPage', {
							title: fileName,
							props: {
								url
							},
							onReturn: function(data) {
								if (data === 'reload') {
									ctrl.scope.files.update()
								}
							}							
						})						
					}

					if (fileName.endsWith('.mp4')) {
						pager.pushPage('videoPage', {
							title: fileName,
							props: {
								url
							},
							onReturn: function(data) {
								if (data === 'reload') {
									ctrl.scope.files.update()
								}
							}							
						})						
					}														

				}
			}
		})

	}
});




