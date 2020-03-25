$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.pager', 'breizbot.files'],


	init: function(elt, pager, srvFiles) {

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onFileClick: function(ev, data) {
					//console.log('onFileClick', data)
					const {fileName, rootDir} = data
					const fullName = rootDir + fileName

					const type = $$.util.getFileType(fileName)
					if (type != undefined) {
						pager.pushPage('breizbot.viewer', {
							title: fileName,
							props: {
								type,
								url: srvFiles.fileUrl(fullName)				
							}
						})
					}
													
				}
			}
		})

	}
});




