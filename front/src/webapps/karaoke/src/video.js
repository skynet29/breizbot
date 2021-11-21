//@ts-check
$$.control.registerControl('VidoCtrl', {

	template: { gulp_inject: './video.html' },

	deps: ['breizbot.files'],

	props: {
		url: '#'
	},

	/**
	 * 
	 * @param {Breizbot.Services.Files.Interface} files 
	 */
	init: function (elt, files) {

		const {url} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				micGain: 0.5,
				videoGain: 0.5,
				url,
				audioDevices: []
			},
			events: {
				onMicGainChange: function(ev, data) {
					//console.log('onMicGainChange', data)
					micGainNode.gain.value = data
				},
				onVideoGainChange: function(ev, data) {
					//console.log('onVideoGainChange', data)
					videoElt.volume = data
				},
				onAudioDeviceChange: async function() {
					const deviceId = $(this).getValue()
					//console.log('onAudioDeviceChange', deviceId)
					await initNodes(buildContraints(deviceId))
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

		let stream = null

		const canvas = ctrl.scope.canvas.get(0)
		const canvasCtx = canvas.getContext('2d')
		const audioCtx = new AudioContext()
		const micGainNode = audioCtx.createGain()
		micGainNode.gain.value = ctrl.model.micGain
		/**@type {HTMLVideoElement} */
		const videoElt = ctrl.scope.video.get(0)
		ctrl.setData({videoGain: videoElt.volume})
		const videoSource = audioCtx.createMediaElementSource(videoElt)

		function visualize(source) {
			const analyser = audioCtx.createAnalyser()

			analyser.fftSize = 2048

			const bufferLength = analyser.frequencyBinCount
			const dataArray = new Uint8Array(bufferLength)

			source.connect(analyser)

			draw()

			function draw() {
				const width = canvas.width
				const height = canvas.height

				requestAnimationFrame(draw)

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
			//try {
				stream = await navigator.mediaDevices.getUserMedia(constraints)
				const source = audioCtx.createMediaStreamSource(stream)
				source.connect(micGainNode)

				const splitter = audioCtx.createChannelSplitter()
				videoSource.connect(splitter)

				const merger = audioCtx.createChannelMerger()
				micGainNode.connect(merger, 0, 0)
				micGainNode.connect(merger, 0, 1)
				splitter.connect(merger, 0, 0)
				splitter.connect(merger, 1, 1)


				merger.connect(audioCtx.destination)

				visualize(source)	
			// }	
			// catch(e)	
			// {
			// 	console.error(e)
			// }
		}

		async function init() {
			await getAudioInputDevices()			
			await initNodes(buildContraints(ctrl.model.audioDevices[0].value))
		}
		
		this.dispose = function() {
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




