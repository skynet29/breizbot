//@ts-check
$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['app.ytdl', 'breizbot.params', 'breizbot.pager'],

	/**
	 * 
	 * @param {AppYoutube.Services.Interface} ytdl 
	 * @param {*} params 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, ytdl, params, pager) {

		const url1 = 'https://www.youtube.com/watch?v='
		const url2 = 'https://youtu.be/'

		const ctrl = $$.viewController(elt, {
			data: {
				results: [],
				waiting: false,
				getDate: function (scope) {
					return new Date(scope.$i.date * 1000).toLocaleDateString('fr-FR')
				}
			},
			events: {
				onStart: function (ev, data) {
					const url = data.value
					if (url.startsWith(url1) || url.startsWith(url2)) {
						showInfo(url)
					}
					else {
						searchInfo(url)
					}
				},
				onItemInfo: function (ev) {
					const idx = $(this).index()
					const videoId = ctrl.model.results[idx].id
					//console.log('onItemInfo', videoId)
					showInfo(url2 + videoId)
				}

			}
		})

		/**
		 * 
		 * @param {string} videoUrl 
		 */
		async function showInfo(videoUrl) {
			//console.log('showInfo', videoUrl)
			let videoId
			if (videoUrl.startsWith(url1)) {
				videoId = videoUrl.replace(url1, '')
			}
			else {
				videoId = videoUrl.replace(url2, '')
			}
			//console.log('videoId', videoId)
			const info = await ytdl.info(videoId)
			console.log('info', info)
			pager.pushPage('infoPage', {
				title: info.title,
				/**@type AppYoutube.Controls.InfoPage.Props */
				props: {
					info,
					videoUrl,
					videoId
				}
			})

		}

		/**
		 * 
		 * @param {string} query 
		 */
		async function searchInfo(query) {
			//console.log('searchInfo', query)
			ctrl.setData({ waiting: true })
			const results = await ytdl.search(query, 20)
			console.log('results', results)
			if (typeof results == 'string') {
				$$.ui.showAlert({ title: 'Error', content: results })
			}
			else {
				ctrl.setData({ results, waiting: false })
			}
		}

		if (params.url != undefined) {
			ctrl.scope.searchbar.setValue(params.url)
			showInfo(params.url)
		}

	}


});




