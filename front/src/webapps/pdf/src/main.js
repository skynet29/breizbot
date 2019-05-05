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
				currentPage: 1
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
					ctrl.scope.pdf.nextPage()
				},

				onPrevPage: function(ev) {
					console.log('onPrevPage')
					ctrl.scope.pdf.prevPage()
				}
			}
		})

		this.onReturn = function(data) {
			if (data == undefined) {
				return
			}
			const fileName = data.rootDir + data.fileName
			const url = files.fileUrl(fileName)
			const {pdf} = ctrl.scope

			pdf.openFile(url).then(() => {
				console.log('file loaded')
				ctrl.setData({
					title: data.fileName,
					 numPages: pdf.getNumPages()
				})
			})
		}

	}


});




