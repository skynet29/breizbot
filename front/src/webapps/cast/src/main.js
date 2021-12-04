// @ts-check

$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.files'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Files.Interface} files
	 */
	init: function (elt, files) {

		let presentationConnection = null

		const ctrl = $$.viewController(elt, {
			data: {
				url: '#'
			},
			events: {
				onTimeUpdate: function() {
					sendMsg({type: 'event', name: 'timeUpdate', value: videoElt.currentTime})
				},
				onPlaying: function () {
					sendMsg({ type: 'event', name: 'playing' })
				},
				onPaused: function () {
					sendMsg({ type: 'event', name: 'paused' })
				}

			}
		})

		/**@type {HTMLVideoElement} */
		const videoElt = ctrl.scope.video.get(0)

		const audioCtx = new AudioContext()
		const source = audioCtx.createMediaElementSource(videoElt)
		const mix2 = audioCtx.createGain()
		mix2.gain.value = 1
		const lowPass = audioCtx.createBiquadFilter()
		lowPass.type = 'lowpass'
		lowPass.frequency.value = 120

		const highPass = audioCtx.createBiquadFilter()
		highPass.type = 'highpass'
		highPass.frequency.value = 120
		const mix = audioCtx.createGain()
		mix.gain.value = 0

		source.connect(mix2)
		mix2.connect(audioCtx.destination)

		source.connect(lowPass)
		lowPass.connect(mix)

		source.connect(highPass)

		audioCtx.audioWorklet.addModule(files.assetsUrl('karaoke-processor.js')).then(() => {
			console.log('audio module loaded')
			const processor = new AudioWorkletNode(audioCtx, 'karaoke-processor', {numberOfInputs: 2, numberOfOutputs: 1})
			highPass.connect(processor)
			processor.connect(mix)

			mix.connect(audioCtx.destination)
		})



		// const processor = audioCtx.createScriptProcessor(2048, 2, 1)
		// processor.onaudioprocess = function (evt) {
		// 	const inputL = evt.inputBuffer.getChannelData(0)
		// 	const inputR = evt.inputBuffer.getChannelData(1)
		// 	const output = evt.outputBuffer.getChannelData(0)
		// 	for (let i = 0; i < inputL.length; i++) {
		// 		output[i] = inputL[i] - inputR[i]
		// 	}
		// }


		function enableKaraoke(enabled) {
			mix.gain.value = (enabled) ? 1 : 0
			mix2.gain.value = (enabled) ? 0 : 1
		}

		navigator.presentation.receiver.connectionList
			.then(list => {
				console.log(list.connections)
				list.connections.map(connection => addConnection(connection))

				list.addEventListener('connectionavailable', function (event) {
					console.log('connectionavailable')
					addConnection(event.connection)
				})
			})

		function sendMsg(msg) {
			presentationConnection.send(JSON.stringify(msg))
		}

		function addConnection(connection) {
			console.log('addConnection', connection.state)
			presentationConnection = connection

			sendMsg({ type: 'ready' })

			connection.addEventListener('message', function (event) {
				const msg = JSON.parse(event.data)
				console.log('Message', msg)
				switch (msg.type) {
					case 'url':
						ctrl.setData({ url: msg.url })
						break
					case 'volume':
						videoElt.volume = msg.volume
						break
						case 'currentTime':
							videoElt.currentTime = msg.currentTime
							break
						case 'play':
						videoElt.play()
						break
					case 'pause':
						videoElt.pause()
						break
					case 'enableKaraoke':
						enableKaraoke(msg.enabled)
						break
				}
			})

			connection.addEventListener('connect', function (event) {
				console.log('connected')
			})

			connection.addEventListener('close', function (event) {
				console.log('Connection closed!')
			})
		}


	}


});




