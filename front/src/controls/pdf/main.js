//@ts-check
$$.control.registerControl('breizbot.pdf', {

	template: { gulp_inject: './main.html' },

	props: {
		url: ''
	},

	init: function (elt) {

		//@ts-ignore
		const { url } = this.props

		const progressDlg = $$.ui.progressDialog('Processing...')


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
				onRefresh: async function() {
					await pdf.refresh()
				},
				onRotateRight: async function() {
					//console.log('onRotateRight')
					await pdf.rotateRight()
				},
				onRotateLeft: async function() {
					//console.log('onRotateLeft')
					await pdf.rotateLeft()
				},
				onZoomIn: async function() {
					//console.log('onZoomIn')
					await pdf.zoomIn()
				},
				onZoomOut: async function() {
					//console.log('onZoomOut')
					await pdf.zoomOut()
				},
				onGotoPage: async function() {
					const pageNo = await $$.ui.showPrompt({
						title: 'Go to Page',
						label: 'Page Number',
						attrs: {
							type: 'number',
							min: 1,
							max: ctrl.model.numPages,
							step: 1
						}
					})
					ctrl.setData({ wait: true })
					const currentPage =  await pdf.setPage(pageNo)
					ctrl.setData({ currentPage, wait: false })
				},
				onPrint: async function() {
					progressDlg.setPercentage(0)
					progressDlg.show()
					await pdf.print({
						onProgress: function(data) {
							progressDlg.setPercentage(data.page / ctrl.model.numPages)						
						}
					})
					progressDlg.hide()
				},
				onNextPage: async function (ev) {
					//console.log('onNextPage')
					ctrl.setData({ wait: true })
					const currentPage = await pdf.nextPage()
					ctrl.setData({ currentPage, wait: false })
				},

				onPrevPage: async function (ev) {
					//console.log('onPrevPage')
					ctrl.setData({ wait: true })
					const currentPage = await pdf.prevPage()
					ctrl.setData({ currentPage, wait: false })
				},

				onFit: function (ev) {
					pdf.fit()
				}

			}
		})

		/**@type {Brainjs.Controls.Pdf.Interface} */
		const pdf = ctrl.scope.pdf

		async function openFile(url, title) {

			ctrl.setData({ wait: true })

			try {
				const numPages = await pdf.openFile(url)
				console.log('file loaded')
				ctrl.setData({
					title,
					numPages,
					wait: false
				})
			}
			catch(e) {
				
			}

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

	}



});




