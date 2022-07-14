//@ts-check
(function () {

	function getTime(duration) {
		const d = new Date(duration * 1000)
		return d.getMinutes().toString() + ':' + d.getSeconds().toString().padStart(2, '0')
	}

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
						return `${getTime(this.curTime)} / ${getTime(this.duration)}`
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


			function play() {
				audioBufferSourceNode = audioCtx.createBufferSource()
				audioBufferSourceNode.buffer = audioBuffer
				audioBufferSourceNode.connect(gainNode)
				startTime = audioCtx.currentTime
				audioBufferSourceNode.start(0, elapsedTime)
				ctrl.setData({ playing: true })
				elt.trigger('playing')
			}

			function pause() {
				elapsedTime += audioCtx.currentTime - startTime
				//console.log('elapsedTime', elapsedTime)
				audioBufferSourceNode.stop()
				ctrl.setData({ playing: false })
				elt.trigger('pause')
			}


			this.seek = function (ticks) {
				if (!ctrl.model.playing && ctrl.model.loaded) {
					elapsedTime += ticks * 11 / 360
				}
			}

			function reset(time = 0, restart = false) {
				//console.log('reset', { time, restart })
				const { playing } = ctrl.model
				if (playing) {
					pause()
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



