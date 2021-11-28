//@ts-check
$$.control.registerControl('rootPage', {

	template: { gulp_inject: './video.html' },

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


		const ctrl = $$.viewController(elt, {
			data: {
				micGain: 0.5,
				videoGain: 0.5,
				url: '#',
				audioDevices: [],
				showAnalyser: false,
				status: 'KO',
				recording: false,
				showStartRecord: function () {
					return this.status == 'OK' && !this.recording
				},
				isDisplayAvailable: false,
				isDisplayStarted: false,
				isPlaying: false

			},
			events: {
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
				},
				onMicGainChange: function (ev, data) {
					//console.log('onMicGainChange', data)
					micGainNode.gain.value = data
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
				onAudioDeviceChange: async function () {
					const deviceId = $(this).getValue()
					//console.log('onAudioDeviceChange', deviceId)
					await initNodes(buildContraints(deviceId))
				},
				onChooseFile: function () {
					pager.pushPage('FileChoice', {
						title: 'Choose File',
						onReturn: function (url) {
							console.log('url', url)
							ctrl.setData({ url })
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
			const { url, videoGain } = ctrl.model
			display.setUrl(url)
			display.setVolume(videoGain)
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


		function buildContraints(deviceId) {
			return {
				audio: {
					deviceId: {
						exact: deviceId
					}
				}
			}
		}


		/**@type {HTMLVideoElement} */
		const videoElt = ctrl.scope.video.get(0)

		const audioCtx = new AudioContext()

		const micGainNode = audioCtx.createGain()
		micGainNode.gain.value = ctrl.model.micGain

		async function getAudioInputDevices() {
			const audioDevices = await $$.media.getAudioInputDevices()
			ctrl.setData({
				audioDevices: audioDevices.map((i) => {
					return { value: i.id, label: i.label }
				})
			})
		}

		async function initNodes(constraints) {
			console.log('initNodes', constraints)
			try {
				stream = await navigator.mediaDevices.getUserMedia(constraints)
				const audioSource = audioCtx.createMediaStreamSource(stream)
				const dest = audioCtx.createMediaStreamDestination()

				audioSource.connect(micGainNode)
				micGainNode.connect(audioCtx.destination)
				ctrl.setData({ status: 'OK' })

			}
			catch (e) {
				ctrl.setData({ status: 'KO' })
				console.error(e)
			}
		}

		async function init() {
			await getAudioInputDevices()
			await initNodes(buildContraints(ctrl.model.audioDevices[0].value))
		}

		this.dispose = function () {
			console.log('dispose')
			if (stream) {
				stream.getTracks().forEach(function (track) {
					track.stop();
				})
				stream = null
			}
		}



		init()
	}



});




