$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.http'],

	init: function (elt, http) {


		const ctrl = $$.viewController(elt, {
			data: {
				url: 'about:blank',
				results: [],
				showClear: false
			},
			events: {
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
				onSearch: async function (ev, data) {
					//console.log('onSearch', data)
					const url = data.value
					if (url.startsWith('https://') || url.startsWith('http://')) {
						ctrl.setData({ results: [], url })
					}
					else {
						const results = await http.post(`/search`, { query: url })
						//console.log('results', results)
						ctrl.setData({
							results,
							url: 'about:blank'
						})
					}
				}

			}
		})

	}


});




