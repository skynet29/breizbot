$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.ytdl', 'breizbot.broker'],

	init: function(elt ,ytdl, broker) {

		let srcId

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
					console.log('onStart', url)
					ytdl.info(url).then((info) => {
						console.log('info', info)
						info.percent = '0%'
						ctrl.setData(info)
					})

				},
				onDownload: function(ev) {
					const {url} = ctrl.scope.form.getFormData()
					console.log('onDownload', url, srcId)
					const fileName = ctrl.model.title + '.mp4'
					ytdl.download(url, fileName, srcId)
				}
			}
		})

		broker.onTopic('breizbot.ytdl.progress', (msg) => {
			if (msg.hist == true) {
				return
			}
			//console.log('progress', msg.data)
			ctrl.setData({percent: msg.data.percent + '%'})
		})

		broker.on('ready', (msg) => { srcId = msg.clientId})


	}


});




