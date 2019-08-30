$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.pager'],


	init: function(elt, pager) {

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
						pager.pushPage('viewerPage', {
							title: fileName,
							props: {
								fullName
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




