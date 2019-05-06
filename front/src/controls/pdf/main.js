$$.control.registerControl('breizbot.pdf', {

	template: {gulp_inject: './main.html'},

	props: {
		showToolbar: false,
		url: ''
	},

	deps: ['breizbot.files'],	

	init: function(elt, files) {

		const {showToolbar} = this.props

		let zoomLevel = 1

		const ctrl = $$.viewController(elt, {
			data: {
				numPages: 0,
				title: '',
				currentPage: 1,
				showToolbar
			},
			events: {
				onOpenFile: function(ev) {
					//console.log('onOpenFile')
					elt.trigger('pdfopenfile')
				},

				onNextPage: function(ev) {
					//console.log('onNextPage')

					ctrl.scope.pdf.nextPage().then((currentPage) => {
						ctrl.setData({currentPage})
					})
					
				},

				onPrevPage: function(ev) {
					//console.log('onPrevPage')
					ctrl.scope.pdf.prevPage().then((currentPage) => {
						ctrl.setData({currentPage})
					})
				},

				onZoomIn: function(ev) {
					//console.log('onZoomIn')
					zoomLevel += 0.5
					ctrl.scope.pdf.setZoomLevel(zoomLevel)

				},

				onZoomOut: function(ev) {
					//console.log('onZoomOut')
					if (zoomLevel > 1) {
						zoomLevel -= 0.5
						ctrl.scope.pdf.setZoomLevel(zoomLevel)						
					}
				}
			}
		})

		function openFile(url, title) {

			ctrl.scope.pdf.openFile(url).then((numPages) => {
				console.log('file loaded')
				ctrl.setData({
					title,
					numPages
				})
			})			
		}

		this.openFile = openFile

		this.setData = function(data) {
			console.log('setData', data)
			if (data.url != undefined) {
				openFile(data.url)
			}
		}

	},

	$iface: `
		openFile(url, title)
	`


});




