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
		let requestID = null


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
				isDisplayStarted: false
			},
			events: {
				onCast: async function() {
					if (display.isStarted()) {
						display.close()
					}
					else{
						await display.start()
					}
				},
				onSend: function() {
					display.setUrl(ctrl.model.url)
				},
				onRecord: async function (ev) {
					//console.log('onRecord')
					videoElt.currentTime = 0
					await videoElt.play()
					ctrl.setData({ recording: true })
					mediaRecorder.start()
				},

				onStop: function (ev) {
					//console.log('onStop')
					videoElt.pause()
					ctrl.setData({ recording: false })
					mediaRecorder.stop()
				},
				onMicGainChange: function (ev, data) {
					//console.log('onMicGainChange', data)
					micGainNode.gain.value = data
				},
				onVideoGainChange: function (ev, data) {
					//console.log('onVideoGainChange', data)
					videoElt.volume = data
				},
				onAudioDeviceChange: async function () {
					const deviceId = $(this).getValue()
					//console.log('onAudioDeviceChange', deviceId)
					await initNodes(buildContraints(deviceId))
				},
				onAnalyserChange: function (ev, data) {
					console.log('onAnalyserChange', data)
					ctrl.setData({ showAnalyser: data })
					if (data == false) {
						cancelAnimationFrame(requestID)
					}
					else if (ctrl.model.status == 'OK') {
						draw()
					}
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
			ctrl.setData({isDisplayStarted: true})
			display.setUrl(ctrl.model.url)
		})

		display.on('close', () => {
			ctrl.setData({isDisplayStarted: false})
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


		/**@type {HTMLCanvasElement} */
		const canvas = ctrl.scope.canvas.get(0)

		/**@type {HTMLVideoElement} */
		const videoElt = ctrl.scope.video.get(0)

		const canvasCtx = canvas.getContext('2d')
		const audioCtx = new AudioContext()

		const micGainNode = audioCtx.createGain()
		micGainNode.gain.value = ctrl.model.micGain
		const videoSource = audioCtx.createMediaElementSource(videoElt)
		const analyser = audioCtx.createAnalyser()
		analyser.fftSize = 2048
		const splitter = audioCtx.createChannelSplitter()
		const merger = audioCtx.createChannelMerger()

		const bufferLength = analyser.frequencyBinCount
		const dataArray = new Uint8Array(bufferLength)

		/**@type {MediaRecorder} */
		let mediaRecorder = null

		let chunks = []


		function draw() {
			const width = canvas.width
			const height = canvas.height

			requestID = requestAnimationFrame(draw)

			analyser.getByteTimeDomainData(dataArray)

			canvasCtx.fillStyle = 'rgb(200, 200, 200)'
			canvasCtx.fillRect(0, 0, width, height)

			canvasCtx.lineWidth = 2
			canvasCtx.strokeStyle = 'rgb(0, 0, 0)'

			canvasCtx.beginPath()

			const sliceWidth = width / bufferLength
			let x = 0

			for (let i = 0; i < bufferLength; i++) {
				const v = dataArray[i] / 128.0
				const y = v * height / 2

				if (i == 0) {
					canvasCtx.moveTo(x, y)
				}
				else {
					canvasCtx.lineTo(x, y)
				}

				x += sliceWidth

			}

			canvasCtx.lineTo(width, height / 2)
			canvasCtx.stroke()
		}


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

				audioSource.connect(analyser)
				audioSource.connect(micGainNode)
				micGainNode.connect(merger, 0, 0)
				micGainNode.connect(merger, 0, 1)
				videoSource.connect(splitter)
				splitter.connect(merger, 0, 0)
				splitter.connect(merger, 1, 1)
				merger.connect(audioCtx.destination)
				merger.connect(dest)

				mediaRecorder = new MediaRecorder(dest.stream)

				mediaRecorder.ondataavailable = function (e) {
					chunks.push(e.data)
				}

				mediaRecorder.onstop = async function (e) {
					const name = await $$.ui.showPrompt({ title: 'Sound Clip Title', label: 'Enter a name:' })
					if (name != null) {
						console.log('clipName', name)
						const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' })
						await files.saveFile(blob, name + '.ogg')

					}
					chunks = []

				}

				ctrl.setData({ status: 'OK' })

				if (ctrl.model.showAnalyser) {
					draw()
				}
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




