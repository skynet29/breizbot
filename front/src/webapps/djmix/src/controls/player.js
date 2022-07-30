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

			/**@type {$$.media.AudioPlayerInterface} */
			let player = null


			const audioCtx = audioTools.getAudioContext()

			const gainNode = audioCtx.createGain()
			//sourceNode.connect(gainNode)

			const mapRate = $$.util.mapRange(0.92, 1.08, 1.08, 0.92)

			let hotcues = {}
			let isHotcueDeleteMode = false

			let autoLoop = 0
			let loopStartTime = 0
			let loopEndTime = 0
			let jogTouchPressed = false

			const ctrl = $$.viewController(elt, {
				data: {
					samplers: [],
					tempo: 0,
					name: 'No Track loaded',
					volume: 0.5,
					rate: 1,
					pitch: function () {
						return mapRate(this.rate)
					},
					duration: 0,
					curTime: 0,
					playing: false,
					loaded: false,
					showBuffer,
					bpm: 0,
					getBpm: function () {
						return (this.bpm * this.rate).toFixed(1)
					},
					getTimeInfo: function () {
						return `${getTime(this.curTime, true)} / ${getTime(this.duration)}`
					},
					showPlay: function () {
						return this.loaded && !this.playing
					}

				},
				events: {
					onPlaySampler: function () {
						const combo = $(this).closest('.samplerPlayer').find('.brainjs-combobox')
						const value = combo.getValue()
						console.log('onPlaySampler', value)
						playSampler(value)
					},
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
						player.seek(value, player.isPlaying())
					},


				}
			})

			gainNode.gain.value = ctrl.model.volume


			/**@type {HTMLCanvasElement} */
			const bufferCanvas = ctrl.scope.bufferCanvas.get(0)

			const bufferDisplay = createBufferDisplay(bufferCanvas, (time) => {
				console.log({ time })
				//audio.currentTime = time
			})


			function playSampler(id) {
				const { samplers } = ctrl.model
				if (id < samplers.length) {
					//console.log('playSampler', id)
					const sampleBufferSource = audioCtx.createBufferSource()
					sampleBufferSource.buffer = samplers[id].audioBuffer
					sampleBufferSource.connect(gainNode)
					sampleBufferSource.start()
				}
			}

			this.playSample = function (key) {
				const combo = elt.find('.samplerPlayer').eq(key - 1).find('.brainjs-combobox')
				const value = combo.getValue()
				playSampler(value)
			}

			function play() {
				//console.log('play', { deck })
				if (!ctrl.model.loaded)
					return
				//audio.play()
				player.play()
			}

			function pause() {
				//console.log('pause')
				//audio.pause()
				player.pause()

			}

			this.setSamplers = function (samplers) {
				ctrl.setData({ samplers })
			}

			this.seek = function (offset) {
				if (player && jogTouchPressed) {
					//console.log('seek', elapsedTime)
					player.seekOffset(offset)
				}
			}

			this.jogTouch = function(isPressed) {
				//console.log('jogTouch', isPressed)

				if (!isPressed && player) {
					player.seekEnd()
				}

				jogTouchPressed = isPressed
			}


			async function reset(time = 0, restart = false) {
				//console.log('reset', { time, restart })
				player.seek(time, restart)
			}

			this.reset = reset

			this.setInfo = async function (info) {
				let { mp3, name, url } = info
				let { artist, title } = mp3
				if (title != undefined) {
					name = `${artist} - ${title}`
				}
				//console.log('name', name)
				ctrl.setData({ name: 'Loading...' })
				const audioBuffer = await $$.media.getAudioBuffer(url)
				player = $$.media.createAudioPlayer(audioCtx, audioBuffer, gainNode)
				player.setPlaybackRate(ctrl.model.rate)

				player.on('playing', function () {
					//console.log('onplaying', {deck})
					midiCtrl.setButtonIntensity('PLAY', 127, deck)
					ctrl.setData({ playing: true })
				})

				player.on('pause', function () {
					//console.log('onpause', {deck})
					midiCtrl.setButtonIntensity('PLAY', 1, deck)
					ctrl.setData({ playing: false })
				})

				player.on('ended', function () {
					console.log('ended', { deck })
					midiCtrl.setButtonIntensity('PLAY', 1, deck)
					ctrl.setData({ playing: false })
				})

				// audio.src = url
				// audio.volume = ctrl.model.volume
				const tempo = await beatdetector.computeBeatDetection(audioBuffer)
				console.log('tempo', tempo)
				hotcues = {}

				const duration = audioBuffer.duration
				ctrl.setData({ name, duration, loaded: true, bpm: parseFloat(tempo.tempo.toFixed(1)) })
				return { audioBuffer, tempo }
			}

			this.getCurrentTime = function () {
				//return audio.currentTime
				return player.getCurrentTime()
			}

			this.getRealTime = function () {
				let curTime = player.getCurrentTime()
				if (autoLoop != 0 && curTime >= loopEndTime) {
					curTime = loopStartTime
					player.seek(curTime, true)
				}
				ctrl.setData({ curTime })
				//console.log('getCurrentTime', curTime)
				return curTime / player.getPlaybackRate()
			}

			this.setStartLoopTime = function (time) {
				loopStartTime = time
			}

			this.setEndLoopTime = function (time) {
				loopEndTime = time
				autoLoop = 5
				reset(loopStartTime, true)
				midiCtrl.setButtonIntensity('LOOP_MANUAL', 127, deck, 3)
			}

			this.clearLoop = function () {
				autoLoop = 0
				midiCtrl.setButtonIntensity('LOOP_MANUAL', 1, deck, 3)
			}

			this.getStartLoopTime = function () {
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
				if (!ctrl.model.playing) {
					play()
				}
				else {
					pause()
				}
			}

			this.getHotcue = function (nb) {
				return hotcues[nb]
			}

			this.addHotcue = function (nb, time, div) {
				console.log('addHotcue', nb)
				hotcues[nb] = { time, div }
				if (nb != 1) {
					midiCtrl.setButtonIntensity('HOT_CUE', 127, deck, nb)
				}
			}

			this.jumpToHotcue = function (nb, restart = true) {
				console.log('jumpToHotcue', nb)
				const { time } = hotcues[nb]
				reset(time, restart)
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

			this.setPlaybackRate = function (rate) {
				//console.log('setPlaybackRate', rate)
				if (player) {
					player.setPlaybackRate(rate)
				}
				ctrl.setData({ rate })
			}
		}


	});

})();



