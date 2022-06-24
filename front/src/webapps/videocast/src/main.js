//@ts-check
$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.files', "breizbot.pager", "breizbot.display"],


	/**
	 * 
	 * @param {Breizbot.Services.Files.Interface} files 
	 * @param {Breizbot.Services.Pager.Interface} pager
	 * @param {Breizbot.Services.Display.Interface} display
	 */
	init: function (elt, files, pager, display) {

		/**@type MediaStream */
		let stream = null
		
		/**
		 * 
		 * @param {number} n 
		 * @returns {string}
		 */
		function formatNumber(n) {
			return (n / 100).toFixed(2).split('.')[1]
		}

		function getTime(duration) {
			const offset = new Date(0).getHours()
			const d = new Date(duration * 1000)
			const hours = d.getHours() - offset
			if (hours != 0) {
				return hours.toString() + ':' + formatNumber(d.getMinutes()) + ':' + formatNumber(d.getSeconds())
			}

			return d.getMinutes().toString() + ':' + formatNumber(d.getSeconds())
		}

		const ctrl = $$.viewController(elt, {
			data: {
				videoGain: 0.5,
				url: '#',
				showStartRecord: function () {
					return this.status == 'OK' && !this.recording
				},
				isDisplayAvailable: false,
				isDisplayStarted: false,
				isPlaying: false,
				duration: 0,
				curTime: 0,	
				getDuration: function() {
					return getTime(this.curTime) + ' / ' + getTime(this.duration)
				}

			},
			events: {
				onSyncMainWithDisplay: function() {
					videoElt.currentTime = ctrl.model.curTime
				},
				onSyncDisplayWithMain: function() {
					display.setCurrentTime(videoElt.currentTime)
				},
				onPlay: function() {
					display.play()
				},
				onPause: function() {
					display.pause()
				},
				onCast: async function () {
					if (display.isStarted()) {
						display.close()
					}
					else {
						await display.start()
					}
				},
				onSend: function () {
					display.setUrl(ctrl.model.url)
					ctrl.setData({duration: videoElt.duration, isPlaying: false})
				},
				onVideoGainChange: function (ev, data) {
					//console.log('onVideoGainChange', data)
					if (display.isStarted()) {
						display.setVolume(data)
					}
					else {
						videoElt.volume = data
					}
				},
				onChooseFile: function () {
					pager.pushPage('breizbot.filechooser', {
						title: 'Choose File',
						props: {
							filterExtension: 'mp4'
						},
						onReturn: function (data) {
							//console.log('data', data)
							ctrl.setData({ url: data.url })
							videoElt.volume = ctrl.model.videoGain
						}
					})
				}
			}
		})

		display.on('availability', (isDisplayAvailable) => {
			ctrl.setData({ isDisplayAvailable })
		})

		display.on('ready', () => {
			ctrl.setData({ isDisplayStarted: true })
		})

		display.on('close', () => {
			ctrl.setData({ isDisplayStarted: false })
		})

		display.on('playing', () => {
			ctrl.setData({ isPlaying: true })
		})

		display.on('paused', () => {
			ctrl.setData({ isPlaying: false })
		})

		display.on('timeUpdate', (value) => {
			//console.log('timeUpdate', value)
			ctrl.setData({curTime: value})
		})


		/**@type {HTMLVideoElement} */
		const videoElt = ctrl.scope.video.get(0)



		this.dispose = function () {
			console.log('dispose')
			if (stream) {
				stream.getTracks().forEach(function (track) {
					track.stop();
				})
				stream = null
			}
		}



	}



});




