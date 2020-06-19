$$.control.registerControl('breizbot.pdf', {

	template: { gulp_inject: './main.html' },

	props: {
		url: ''
	},

	deps: ['breizbot.files'],

	init: function (elt, files) {

		const { url } = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				numPages: 0,
				title: '',
				currentPage: 1,
				wait: false,
				show1: function () {
					return this.numPages > 1 && !this.wait
				}
			},
			events: {
				onPrint: function() {
					ctrl.scope.pdf.print()
				},
				onNextPage: async function (ev) {
					//console.log('onNextPage')
					ctrl.setData({ wait: true })
					const currentPage = await ctrl.scope.pdf.nextPage()
					ctrl.setData({ currentPage, wait: false })
				},

				onPrevPage: async function (ev) {
					//console.log('onPrevPage')
					ctrl.setData({ wait: true })
					const currentPage = await ctrl.scope.pdf.prevPage()
					ctrl.setData({ currentPage, wait: false })
				},

				onFit: function (ev) {
					ctrl.scope.pdf.fit()
				}

			}
		})

		async function openFile(url, title) {

			ctrl.setData({ wait: true })

			const numPages = await ctrl.scope.pdf.openFile(url)
			console.log('file loaded')
			ctrl.setData({
				title,
				numPages,
				wait: false
			})
		}

		if (url != '') {
			openFile(url)
		}

		this.setData = function (data) {
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




