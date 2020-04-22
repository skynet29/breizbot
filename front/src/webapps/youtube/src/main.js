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
				videoUrl: '',
				show1: function() {return this.showInfo && this.percent != 0},
				show2: function() {return this.showInfo && this.results.length > 0},
				show3: function() {return this.showInfo && this.title != ''},
				show4: function() {return this.percent == 0},
				text1: function() {
					return new Date(this.length_seconds*1000).toLocaleTimeString('fr-FR', {timeZone: 'UTC'})
				}
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

		async function showInfo(url) {
			//console.log('showInfo', url)
			const info = await ytdl.info(url)
			//console.log('info', info)
			info.percent = 0
			info.showInfo = true,
			info.videoUrl = url
			ctrl.setData(info)
		}

		async function searchInfo(query) {
			//console.log('searchInfo', query)
			const results = await ytdl.search(query, 10)
			//console.log('results', results)
			ctrl.setData({results, showInfo: false})
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




