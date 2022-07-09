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

		deps: ['breizbot.pager'],

		props: {
		},

		/**
		 * @param {Breizbot.Services.Pager.Interface} pager
		 */
		init: function (elt, pager) {

			/**@type {AudioBuffer} */
			let audioBuffer = null


			const ctrl = $$.viewController(elt, {
				data: {
					url: '#',
					name: '',
					volume: 0.5,
					duration: 0,
					curTime: 0,
					playing: false,
					getTimeInfo: function () {
						return `${getTime(this.curTime)} / ${getTime(this.duration)}`
					}

				},
				events: {
					onVolumeChange: function (ev, value) {
						audio.volume = value
					},
					onLoad: function () {
						//console.log('duration', this.duration)
						audio.volume = 0.5
						ctrl.setData({ duration: Math.floor(audio.duration), volume: audio.volume })
					},

					onTimeUpdate: function () {
						ctrl.setData({ curTime: this.currentTime })
						bufferDisplay.update(this.currentTime)
						elt.trigger('timeUpdate', this.currentTime)
					},

					onPlaying: function () {
						//console.log('onPlaying')
						ctrl.setData({ playing: true })
					},

					onPaused: function () {
						//console.log('onPaused')
						ctrl.setData({ playing: false })
					},

					onPlay: function () {
						audio.play()
					},

					onPause: function () {
						audio.pause()
					},

					onSliderChange: function (ev, value) {
						//console.log('onSliderChange', value)
						audio.currentTime = value
					},


				}
			})


			/**@type {HTMLAudioElement} */
			const audio = ctrl.scope.audio.get(0)

			/**@type {HTMLCanvasElement} */
			const bufferCanvas = ctrl.scope.bufferCanvas.get(0)

			const bufferDisplay = createBufferDisplay(bufferCanvas, (time) => {
				console.log({ time })
				audio.currentTime = time
			})


			this.setInfo = async function (info) {
				let { mp3, name, url } = info
				let { artist, title } = mp3
				if (title != undefined) {
					name = `${artist} - ${title}`
				}
				console.log('name', name)
				ctrl.setData({ url, name })
				return  await bufferDisplay.load(url)
			}

			this.getAudioElement = function () {
				return audio
			}

			this.isPlaying = function () {
				return ctrl.model.playing
			}

			this.setVolume = function (volume) {
				audio.volume = volume
				ctrl.setData({ volume })

			}

			this.togglePlay = function () {
				if (ctrl.model.playing) {
					audio.pause()
				}
				else {
					audio.play()
				}
			}

			this.getAudioBuffer = function() {
				return audioBuffer
			}
		}


	});

})();



