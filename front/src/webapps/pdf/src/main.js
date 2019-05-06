$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.files'],	

	props: {
		$pager: null
	},


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
				},

				onNextPage: function(ev) {
					console.log('onNextPage')

					ctrl.scope.pdf.nextPage().then((currentPage) => {
						ctrl.setData({currentPage})
					})
					
				},

				onPrevPage: function(ev) {
					console.log('onPrevPage')
					ctrl.scope.pdf.prevPage().then((currentPage) => {
						ctrl.setData({currentPage})
					})
				},

				onZoomIn: function(ev) {
					console.log('onZoomIn')
					zoomLevel += 0.5
					ctrl.scope.pdf.setZoomLevel(zoomLevel)

				},

				onZoomOut: function(ev) {
					console.log('onZoomOut')
					if (zoomLevel > 1) {
						zoomLevel -= 0.5
						ctrl.scope.pdf.setZoomLevel(zoomLevel)						
					}
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
			const {pdf} = ctrl.scope

			pdf.openFile(url).then((numPages) => {
				console.log('file loaded')
				ctrl.setData({
					title: data.fileName,
					numPages
				})
			})
		}

	}


});




