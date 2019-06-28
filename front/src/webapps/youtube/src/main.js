$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['app.ytdl', 'breizbot.broker', 'breizbot.params'],

	init: function(elt ,ytdl, broker, params) {

		const ctrl = $$.viewController(elt, {
			data: {
				title: '',
				length_seconds: 0,
				thumbnail_url: '#', 
				description: '',
				percent: 0,
				results: [],
				showInfo: true,
				videoUrl: ''
			},
			events: {
				onStart: function(ev) {
					ev.preventDefault()
					const {url} = $(this).getFormData()
					if (url.startsWith('https://youtu.be/')) {
						showInfo(url)	
					}
					else {
						searchInfo(url)
					}
				},
				onDownload: function(ev) {
					const {videoUrl, title} = ctrl.model
					console.log('onDownload', videoUrl)
					const fileName = title + '.mp4'
					ytdl.download(videoUrl, fileName)
				},

				onItemInfo: function(ev) {
					const idx = $(this).index()
					const videoId = ctrl.model.results[idx].id
					console.log('onItemInfo', videoId)
					showInfo('https://youtu.be/' + videoId)
				},
				onInputClick: function() {
					$(this).val('')
				},

				onBackToList: function() {
					ctrl.setData({showInfo: false})
				}
			}
		})

		function showInfo(url) {
			//console.log('showInfo', url)
			ytdl.info(url).then((info) => {
				//console.log('info', info)
				info.percent = 0
				info.showInfo = true,
				info.videoUrl = url
				ctrl.setData(info)
			})
		}

		function searchInfo(query) {
			//console.log('searchInfo', query)
			ytdl.search(query, 10).then((results) => {
				//console.log('results', results)
				ctrl.setData({results, showInfo: false})
			})
		}

		broker.onTopic('breizbot.ytdl.progress', (msg) => {
			if (msg.hist == true) {
				return
			}
			//console.log('progress', msg.data)
			const {percent} = msg.data
			ctrl.setData({percent})
		})

		if (params.url != undefined) {
			ctrl.scope.form.setFormData({url: params.url})
			showInfo(params.url)
		}

	}


});




