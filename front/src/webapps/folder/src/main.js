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
					if (isImage) {						
						$pager.pushPage('imagePage', {
							title: fileName,
							props: {fileName: rootDir + fileName},
							buttons: [
								{name: 'del', icon: 'fa fa-trash'},
								{name: 'fit', icon: 'fa fa-expand'}
							]
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




