$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.files'],	

	props: {
		$pager: null
	},


	init: function(elt, files) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				numPages: 0,
				title: '',
				currentPage: 1,
				zoomLevel: 1
			},
			events: {
				onOpenFile: function(ev) {
					console.log('onOpenFile')
					$pager.pushPage('openFilePage', {
						title: 'Open File'
					})
				},

				onNextPage: function(ev) {
					console.log('onNextPage')
					let {currentPage, numPages} = ctrl.model
					if (currentPage < numPages) {
						currentPage++
						render().then(() => {
							ctrl.setData({currentPage})
						})
					}
				},

				onPrevPage: function(ev) {
					console.log('onPrevPage')
					let {currentPage, numPages} = ctrl.model
					if (currentPage > 1) {
						currentPage--
						render(currentPage).then(() => {
							ctrl.setData({currentPage})
						})
					}
				}
			}
		})

		function render() {
			const {zoomLevel, currentPage} = ctrl.model
			return ctrl.scope.pdf.renderPage(currentPage, zoomLevel)
		}

		this.onReturn = function(data) {
			if (data == undefined) {
				return
			}
			const fileName = data.rootDir + data.fileName
			const url = files.fileUrl(fileName)
			const {pdf} = ctrl.scope

			pdf.openFile(url).then(() => {
				console.log('file loaded')
				render().then(() => {
					ctrl.setData({
						title: data.fileName,
						 numPages: pdf.getNumPages()
					})

				})
			})
		}

	}


});




