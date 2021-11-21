//@ts-check
$$.control.registerControl('rootPage', {

	template: { gulp_inject: './video.html' },

	deps: ['breizbot.files', "breizbot.pager"],


	/**
	 * 
	 * @param {Breizbot.Services.Files.Interface} files 
	 * @param {Breizbot.Services.Pager.Interface} pager
	 */
	init: function (elt, files, pager) {

		let stream = null
		let requestID = null
		let analyser = null
		let dataArray = null
		let bufferLength = 0
		let url = '#'

		const ctrl = $$.viewController(elt, {
			data: {
				micGain: 0.5,
				videoGain: 0.5,
				url,
				audioDevices: [],
				showAnalyser: false,
				status: 'KO'
			},
			events: {
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
				onChooseFile: function() {
					pager.pushPage('FileChoice', {
						title: 'Choose File',
						onReturn: function(url) {
							console.log('url', url)
							ctrl.setData({url})
						}
					})
				}
			}
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



		const canvas = ctrl.scope.canvas.get(0)
		const canvasCtx = canvas.getContext('2d')
		const audioCtx = new AudioContext()
		const micGainNode = audioCtx.createGain()
		micGainNode.gain.value = ctrl.model.micGain
		/**@type {HTMLVideoElement} */
		const videoElt = ctrl.scope.video.get(0)
		ctrl.setData({ videoGain: videoElt.volume })
		const videoSource = audioCtx.createMediaElementSource(videoElt)


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

				analyser = audioCtx.createAnalyser()
				analyser.fftSize = 2048

				bufferLength = analyser.frequencyBinCount
				dataArray = new Uint8Array(bufferLength)

				audioSource.connect(analyser)

				audioSource.connect(micGainNode)

				const splitter = audioCtx.createChannelSplitter()
				videoSource.connect(splitter)

				const merger = audioCtx.createChannelMerger()
				micGainNode.connect(merger, 0, 0)
				micGainNode.connect(merger, 0, 1)
				splitter.connect(merger, 0, 0)
				splitter.connect(merger, 1, 1)


				merger.connect(audioCtx.destination)
				ctrl.setData({status: 'OK'})

				if (ctrl.model.showAnalyser) {
					draw()
				}
			}
			catch (e) {
				ctrl.setData({status: 'KO'})
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




