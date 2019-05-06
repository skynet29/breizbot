$$.control.registerControl('breizbot.pdf', {

	template: {gulp_inject: './main.html'},

	props: {
		url: ''
	},

	deps: ['breizbot.files'],	

	init: function(elt, files) {

		const {url} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				numPages: 0,
				title: '',
				currentPage: 1
			},
			events: {
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

				onFit: function(ev) {
					ctrl.scope.pdf.fit()
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

		if (url != '') {
			openFile(url)
		}

		this.setData = function(data) {
			console.log('setData', data)
			if (data.url != undefined) {
				openFile(data.url)
			}
		}

	},

	$iface: `
		setData({url})
	`


});




