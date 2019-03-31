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
					//console.log('onFileClick', data)
					const {fileName, rootDir} = data
					if ($$.util.isImage(fileName)) {
						const url = srvFiles.fileUrl(rootDir + fileName)
						$pager.pushPage('imagePage', {
							title: fileName,
							props: {url, fileName: rootDir + fileName},
							buttons: [{name: 'del', label: 'Delete'}]
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




