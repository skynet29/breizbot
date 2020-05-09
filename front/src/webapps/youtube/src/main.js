$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['app.ytdl', 'breizbot.params', 'breizbot.pager'],

	init: function(elt ,ytdl, params, pager) {

		const ctrl = $$.viewController(elt, {
			data: {
				results: [],
				showInfo: true,
				getDate: function(scope) {
					return new Date(scope.$i.date * 1000).toLocaleDateString('fr-FR')
				}
			},
			events: {
				onStart: function(ev, data) {
					const url = data.value
					const startUrl = 'https://youtu.be/'
					if (url.startsWith(startUrl)) {
						showInfo(url.replace('https://youtu.be/', ''))	
					}
					else {
						searchInfo(url)
					}
				},
				onItemInfo: function(ev) {
					const idx = $(this).index()
					const videoId = ctrl.model.results[idx].id
					console.log('onItemInfo', videoId)
					showInfo(videoId)
				}

			}
		})

		async function showInfo(videoId) {
			//console.log('showInfo', url)
			const videoUrl = 'https://youtu.be/' + videoId
			const info = await ytdl.info(videoUrl)
			info.videoUrl = videoUrl
			info.videoId = videoId
			//console.log('info', info)
			pager.pushPage('infoPage', {
				title: info.title,
				props: {
					info
				}
			})
			
		}

		async function searchInfo(query) {
			//console.log('searchInfo', query)
			const results = await ytdl.search(query, 20)
			//console.log('results', results)
			if (typeof results == 'string') {
				$$.ui.showAlert({title: 'Error', content: results})
			}
			else {
				ctrl.setData({results, showInfo: false})
			}
		}

		if (params.url != undefined) {
			ctrl.scope.searchbar.setValue(params.url)
			showInfo(params.url)
		}

	}


});




