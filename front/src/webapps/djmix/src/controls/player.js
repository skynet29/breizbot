//@ts-check
(function () {

	/**
	 * 
	 * @param {HTMLCanvasElement} bufferCanvas
	 * @param {(time: number) => void} onTimeUpdate
	 */
	function createBufferDisplay(bufferCanvas, onTimeUpdate) {
		const { width, height } = bufferCanvas
		console.log({ width, height })
		const bufferCanvasCtx = bufferCanvas.getContext('2d')

		if (typeof onTimeUpdate == 'function') {
			bufferCanvas.onclick = function (ev) {
				console.log('onclick', ev.offsetX)
				const time = ev.offsetX / width * audioBuffer.duration
				onTimeUpdate(time)
			}
		}

		const canvas = document.createElement('canvas')
		canvas.width = width
		canvas.height = height
		const ctx = canvas.getContext('2d')

		/**@type {AudioBuffer} */
		let audioBuffer = null

		async function load(url) {
			audioBuffer = await $$.media.getAudioBuffer(url)
			console.log('duration', audioBuffer.duration)
			$$.media.drawAudioBuffer(width, height - 10, ctx, audioBuffer, 'black')
			update(0)
			return audioBuffer
		}

		/**
		 * 
		 * @param {number} bufferTime 
		 */
		function update(bufferTime) {
			if (audioBuffer) {
				bufferCanvasCtx.clearRect(0, 0, width, height)
				bufferCanvasCtx.drawImage(canvas, 0, 5)
				const boxWidth = width * bufferTime / audioBuffer.duration
				bufferCanvasCtx.fillStyle = 'rgba(255, 255, 255, 0.33)'
				bufferCanvasCtx.fillRect(0, 0, boxWidth, height)
			}
		}

		return {
			load,
			update
		}
	}


	$$.control.registerControl('audioplayer', {

		template: { gulp_inject: './player.html' },

		deps: ['breizbot.pager', 'AudioTools', 'MIDICtrl', 'breizbot.beatdetector'],

		props: {
			showBuffer: false,
			deck: 1
		},

		/**
		 * @param {Breizbot.Services.Pager.Interface} pager
		 * @param {DJMix.Service.AudioTools.Interface} audioTools
		 * @param {DJMix.Service.MIDICtrl.Interface} midiCtrl
		 * @param {Breizbot.Services.BeatDetector.Interface} beatdetector
		 */
		init: function (elt, pager, audioTools, midiCtrl, beatdetector) {
			console.log('props', this.props)

			const { showBuffer, deck } = this.props

			const getTime = $$.media.getFormatedTime

			/**@type {AudioBuffer} */
			let audioBuffer = null

			const hotcues = {}
			let isHotcueDeleteMode = false

			let autoLoop = 0
			let loopStartTime = 0
			let loopEndTime = 0

			let startTime = 0
			let elapsedTime = 0

			/**@type {AudioBufferSourceNode} */
			let audioBufferSourceNode = null

			const audioCtx = audioTools.getAudioContext()

			const gainNode = audioCtx.createGain()
			gainNode.gain.value = 0.5

			const ctrl = $$.viewController(elt, {
				data: {
					tempo: 0,
					name: 'No Track loaded',
					volume: 0.5,
					duration: 0,
					curTime: 0,
					playing: false,
					loaded: false,
					showBuffer,
					getTimeInfo: function () {
						return `${getTime(this.curTime, true)} / ${getTime(this.duration)}`
					},
					showPlay: function () {
						return this.loaded && !this.playing
					}

				},
				events: {
					onVolumeChange: function (ev, value) {
						//console.log('onVolumeChange', value)
						gainNode.gain.value = value
					},

					onPlay: function () {
						play()
					},

					onPause: function () {
						pause()
					},

					onSliderChange: function (ev, value) {
						//console.log('onSliderChange', value)
						//audio.currentTime = value
						reset(value, true)
					},


				}
			})



			/**@type {HTMLCanvasElement} */
			const bufferCanvas = ctrl.scope.bufferCanvas.get(0)

			const bufferDisplay = createBufferDisplay(bufferCanvas, (time) => {
				console.log({ time })
				//audio.currentTime = time
			})

			let pauseFeedback = null

			function play() {
				//console.log('play', { elapsedTime, deck })
				midiCtrl.setButtonIntensity('PLAY', 127, deck)

				gainNode.gain.value = ctrl.model.volume
				audioBufferSourceNode = audioCtx.createBufferSource()
				audioBufferSourceNode.buffer = audioBuffer
				audioBufferSourceNode.onended = function () {
					//console.log('onended', ctrl.model.playing)

					if (ctrl.model.playing) {
						ctrl.setData({ playing: false })
						elapsedTime = audioBuffer.duration
						elt.trigger('pause')
					}

					if (pauseFeedback != null) {
						pauseFeedback()
						pauseFeedback = null
					}
				}
				audioBufferSourceNode.connect(gainNode)
				startTime = audioCtx.currentTime
				audioBufferSourceNode.start(0, elapsedTime)
				ctrl.setData({ playing: true })
				elt.trigger('playing')
			}

			const FADE = 0.01

			function pause() {
				//console.log('pause')
				midiCtrl.setButtonIntensity('PLAY', 1, deck)

				return new Promise((resolve) => {
					ctrl.setData({ playing: false })
					elapsedTime += audioCtx.currentTime - startTime
					audioBufferSourceNode.stop()
					audioBufferSourceNode = null
					elt.trigger('pause')
					pauseFeedback = resolve

				})
			}


			this.seek = function (ticks) {
				if (!ctrl.model.playing && ctrl.model.loaded) {
					elapsedTime += ticks * 11 / 360
					elapsedTime = Math.max(0, elapsedTime)
				}
			}

			async function reset(time = 0, restart = false) {
				//console.log('reset', { time, restart })
				const { playing } = ctrl.model
				if (playing) {
					await pause()
				}
				elapsedTime = time
				if (restart && playing) {
					play()
				}
			}

			this.reset = reset

			this.setInfo = async function (info) {
				let { mp3, name, url } = info
				let { artist, title } = mp3
				if (title != undefined) {
					name = `${artist} - ${title}`
				}
				console.log('name', name)
				ctrl.setData({ name: 'Loading...' })
				audioBuffer = await $$.media.getAudioBuffer(url)
				const tempo = await beatdetector.computeBeatDetection(audioBuffer)
				console.log('tempo', tempo)

				const duration = audioBuffer.duration
				ctrl.setData({ name, duration, loaded: true, bpm: tempo.bpm })
				return { audioBuffer, tempo }
			}

			this.getCurrentTime = function () {
				let curTime = elapsedTime
				if (ctrl.model.playing) {
					curTime += audioCtx.currentTime - startTime
				}
				if (autoLoop != 0 && curTime >= loopEndTime) {
					reset(loopStartTime, true)
					curTime = audioCtx.currentTime - loopStartTime
				}
				ctrl.setData({ curTime })
				//console.log('getCurrentTime', curTime)
				return curTime
			}

			this.setStartLoopTime = function(time) {
				loopStartTime = time
			}

			this.setEndLoopTime = function(time) {
				loopEndTime = time
				autoLoop = 5
				reset(loopStartTime, true)
				midiCtrl.setButtonIntensity('LOOP_MANUAL', 127, deck, 3)
			}

			this.clearLoop = function() {
				autoLoop = 0
				midiCtrl.setButtonIntensity('LOOP_MANUAL', 1, deck, 3)
			}

			this.getStartLoopTime = function() {
				return loopStartTime
			}

			this.getOutputNode = function () {
				return gainNode
			}


			this.isPlaying = function () {
				return ctrl.model.playing
			}

			this.setVolume = function (volume) {
				gainNode.gain.value = volume
				ctrl.setData({ volume })

			}

			this.isLoaded = function () {
				return ctrl.model.loaded
			}

			this.togglePlay = function () {
				if (ctrl.model.playing) {
					pause()
				}
				else {
					play()
				}
			}

			this.getAudioBuffer = function () {
				return audioBuffer
			}


			this.getHotcue = function (nb) {
				return hotcues[nb]
			}

			this.addHotcue = function (nb, time, div) {
				console.log('addHotcue', nb)
				hotcues[nb] = { time, div }
				midiCtrl.setButtonIntensity('HOT_CUE', 127, deck, nb)
			}

			this.jumpToHotcue = function (nb) {
				console.log('jumpToHotcue', nb)
				const { time } = hotcues[nb]
				reset(time, true)
			}

			this.toggleHotcueDeleteMode = function () {
				isHotcueDeleteMode = !isHotcueDeleteMode
				console.log('isHotcueDeleteMode', isHotcueDeleteMode)
				midiCtrl.setButtonIntensity('HOT_CUE', (isHotcueDeleteMode) ? 127 : 1, deck, 1)
			}

			this.isHotcueDeleteMode = function () {
				return isHotcueDeleteMode
			}

			this.deleteHotcue = function (nb) {
				console.log('deleteHotcue', nb)
				delete hotcues[nb]
				midiCtrl.setButtonIntensity('HOT_CUE', 1, deck, nb)
			}

			this.getBpm = function () {
				return ctrl.model.bpm
			}
			this.autoLoopActivate = function (nb, startTime, duration) {
				if (nb == autoLoop) {
					midiCtrl.setButtonIntensity('LOOP_AUTO', 1, deck, nb)
					autoLoop = 0
					return 0
				}
				if (autoLoop != 0) {
					midiCtrl.setButtonIntensity('LOOP_AUTO', 1, deck, autoLoop)
					loopEndTime = loopStartTime + duration
				}
				else {
					loopStartTime = startTime
					loopEndTime = startTime + duration	
				}
				midiCtrl.setButtonIntensity('LOOP_AUTO', 127, deck, nb)
				autoLoop = nb
				return loopStartTime
			}
		}


	});

})();



