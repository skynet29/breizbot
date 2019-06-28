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
				percent: '0%'
			},
			events: {
				onStart: function(ev) {
					ev.preventDefault()
					const {url} = $(this).getFormData()
					showInfo(url)
				},
				onDownload: function(ev) {
					const {url} = ctrl.scope.form.getFormData()
					console.log('onDownload', url)
					const fileName = ctrl.model.title + '.mp4'
					ytdl.download(url, fileName)
				}
			}
		})

		function showInfo(url) {
			console.log('showInfo', url)
			ytdl.info(url).then((info) => {
				console.log('info', info)
				info.percent = '0%'
				ctrl.setData(info)
			})

		}

		broker.onTopic('breizbot.ytdl.progress', (msg) => {
			if (msg.hist == true) {
				return
			}
			//console.log('progress', msg.data)
			ctrl.setData({percent: msg.data.percent + '%'})
		})

		if (params.url != undefined) {
			ctrl.scope.form.setFormData({url: params.url})
			showInfo(params.url)
		}

	}


});




