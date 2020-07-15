$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.http', 'breizbot.pager', 'breizbot.files', 'breizbot.scheduler'],

	init: function (elt, http, pager, srvFiles, scheduler) {

		let total = 0

		const ctrl = $$.viewController(elt, {
			data: {
				getResults: async function (idx) {
					//console.log('getResults', idx, total)
					return (idx != total) ? search(idx) : null
				},
				results: { web: [], images: [] },
				theme: 'web',
				query: '',
				waiting: false,
				isWeb: function () { return this.theme == 'web' },
				isImages: function () { return this.theme == 'images' },
				getUrl: function (scope) { return `https:${scope.$i.thumbnail}` }
			},
			events: {
				onLinkClicked: function (ev) {
					//console.log('onLinkClicked', this.href)
					if (this.href.startsWith('https://www.youtube.com/watch?v=')) {
						ev.preventDefault()
						scheduler.openApp('youtube', { url: this.href })
					}
				},
				onItemMenuClick: function () {
					const elt = $(this)
					const theme = elt.data('theme')
					//console.log('onItemMenuClick', theme)
					elt.closest('.toolbar').find('.menuItem.selected').removeClass('selected')
					elt.addClass('selected')
					if (theme != ctrl.model.theme) {
						ctrl.setData({ theme })
						search(0)
					}
				},
				onContextMenu: async function (ev, data) {
					const idx = $(this).index()
					const { title, url } = ctrl.model.results.web[idx]
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
					search(0)
				},
				onImageClick: function () {
					const idx = $(this).index()
					//console.log('onImageClick', idx)
					const info = ctrl.model.results.images[idx]
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
			const resp = await http.fetch('/getImage', { url })
			const blob = await resp.blob()
			const ext = blob.type.split('/')[1]
			const fileName = 'SNAP' + Date.now() + '.' + ext

			await srvFiles.saveFile(blob, fileName)
			//console.log('resp', resp)
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

		async function search(offset) {
			if (offset == 0) {
				ctrl.setData({ results: { web: [], images: [] } })
			}
			const { theme, query } = ctrl.model
			if (query != '') {
				try {
					ctrl.setData({ waiting: true })
					const results = await http.post(`/search`, { query, theme, offset, count: 10 })
					//console.log('results', results)
					total = results.total
					ctrl.model.results[theme] = ctrl.model.results[theme].concat(results.items)
					ctrl.model.waiting = false
					ctrl.enableNode('images', (offset == 0))
					ctrl.update()
					return results.items
				}
				catch (e) {
					ctrl.setData({ waiting: false })
					$$.ui.showAlert({ title: 'Error', content: e.responseText })
				}

			}

		}


	}


});




