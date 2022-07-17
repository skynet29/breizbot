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

		deps: ['breizbot.pager', 'AudioTools'],

		props: {
			showBuffer: false
		},

		/**
		 * @param {Breizbot.Services.Pager.Interface} pager
		 * @param {DJMix.Service.AudioTools.Interface} audioTools
		 */
		init: function (elt, pager, audioTools) {
			const { showBuffer } = this.props

			const getTime = $$.media.getFormatedTime

			/**@type {AudioBuffer} */
			let audioBuffer = null

			let startTime = 0
			let elapsedTime = 0

			/**@type {AudioBufferSourceNode} */
			let audioBufferSourceNode = null

			const audioCtx = audioTools.getAudioContext()

			const gainNode = audioCtx.createGain()
			gainNode.gain.value = 0.5

			const ctrl = $$.viewController(elt, {
				data: {
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
				console.log('play', elapsedTime)
				gainNode.gain.value = ctrl.model.volume
				audioBufferSourceNode = audioCtx.createBufferSource()
				audioBufferSourceNode.buffer = audioBuffer
				audioBufferSourceNode.onended = function() {
					console.log('onended', ctrl.model.playing)

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
				console.log('pause')
				return new Promise((resolve) => {
					ctrl.setData({ playing: false })
					elapsedTime +=  audioCtx.currentTime - startTime
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
				ctrl.setData({name: 'Loading...'})
				audioBuffer = await $$.media.getAudioBuffer(url)
				const duration = audioBuffer.duration
				ctrl.setData({ name, duration, loaded: true })
				return audioBuffer
			}

			this.getCurrentTime = function () {
				let curTime = elapsedTime
				if (ctrl.model.playing) {
					curTime += audioCtx.currentTime - startTime
				}
				ctrl.setData({ curTime })
				//console.log('getCurrentTime', curTime)
				return curTime
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
		}


	});

})();



