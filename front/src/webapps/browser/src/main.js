$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.http', 'breizbot.pager', 'breizbot.files'],

	init: function (elt, http, pager, srvFiles) {

		const savingDlg = $$.ui.progressDialog()

		const ctrl = $$.viewController(elt, {
			data: {
				results: [],
				theme: 'web',
				query: '',
				isWeb: function () { return this.theme == 'web' },
				isImages: function () { return this.theme == 'images' },
				getUrl: function (scope) { return `https:${scope.$i.thumbnail}` }
			},
			events: {
				onItemMenuClick: function () {
					const elt = $(this)
					const theme = elt.data('theme')
					console.log('onItemMenuClick', theme)
					elt.closest('.toolbar').find('.menuItem.selected').removeClass('selected')
					elt.addClass('selected')
					if (theme != ctrl.model.theme) {
						ctrl.setData({ theme })
						search()
					}
				},
				onContextMenu: async function (ev, data) {
					const idx = $(this).index()
					const { title, url } = ctrl.model.results[idx]
					const name = await $$.ui.showPrompt({
						title: 'Add link',
						label: 'Name',
						value: title.replace(/<\/?b>/g, '')
					})
					console.log('name', name)
					if (name != null) {
						await http.post('/addFavorite', { name, link: url })
					}
				},
				onSearch: function (ev, data) {
					//console.log('onSearch', data)
					ctrl.setData({ query: data.value })
					search()
				},
				onImageClick: function () {
					const idx = $(this).index()
					//console.log('onImageClick', idx)
					const info = ctrl.model.results[idx]
					const url = info.media
					pager.pushPage('breizbot.viewer', {
						title: info.title,
						props: {
							type: 'image',
							url
						},
						buttons: {
							save: {
								title: 'Save',
								icon: 'fa fa-save',
								onClick: function () {
									saveImage(url)
								}
							}
						}
					})
				}
			}
		})

		async function saveImage(url) {
			const fileName = 'SNAP' + Date.now() + '.png'
			console.log('fileName', fileName)
			try {
				savingDlg.setPercentage(0)
				savingDlg.show()
				const blob = await $$.util.imageUrlToBlob(url)
				const resp = await srvFiles.uploadFile(blob, fileName, '/apps/browser', (percentage) => {
					savingDlg.setPercentage(percentage)
				})
				await $$.util.wait(1000)
				savingDlg.hide()
				//console.log('resp', resp)
			}
			catch (e) {
				savingDlg.hide()
				$$.ui.showAlert({
					title: 'Error',
					content: e
				})

			}
		}


		document.body.addEventListener(
			'load',
			function (event) {
				var tgt = event.target;
				if (tgt.tagName == 'IMG') {
					//console.log('onImageLoaded')
					tgt.style.display = 'inline';
				}
			},
			true // <-- useCapture
		)

		async function search() {
			ctrl.setData({ results: [] })
			const { theme, query } = ctrl.model
			if (query != '') {
				try {
					const results = await http.post(`/search`, { query, theme })
					console.log('results', results)
					ctrl.setData({
						results
					})
				}
				catch (e) {
					$$.ui.showAlert({ title: 'Error', content: e.responseText })
				}

			}

		}


	}


});




