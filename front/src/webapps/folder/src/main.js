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
					const {fileName, rootDir} = data
					const fullName = rootDir + fileName

					const type = $$.util.getFileType(fileName)
					if (type != undefined) {
						$pager.pushPage('viewerPage', {
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




