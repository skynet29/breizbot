$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	props: {
		$pager: null
	},

	deps: ['breizbot.files'],

	init: function(elt, files) {

		const {$pager} = this.props

		let zoomLevel = 1

		const ctrl = $$.viewController(elt, {
			data: {
				numPages: 0,
				title: '',
				currentPage: 1
			},
			events: {
				onOpenFile: function(ev) {
					console.log('onOpenFile')
					$pager.pushPage('breizbot.files', {
						title: 'Open File',
						props: {
							filterExtension: '.pdf'
						}
					})
				}

			}
		})


		this.onReturn = function(data) {
			console.log('onReturn', data)
			if (data == undefined) {
				return
			}
			const fileName = data.rootDir + data.fileName
			const url = files.fileUrl(fileName)

			ctrl.scope.pdf.openFile(url, data.fileName)
		}

	}


});




