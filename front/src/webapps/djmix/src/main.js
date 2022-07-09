// @ts-check

$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'MIDICtrl', 'AudioTools'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {DJMix.Service.MIDICtrl.Interface} midiCtrl
	 * @param {DJMix.Service.AudioTools.Interface} audioTools
	 */
	init: async function (elt, pager, midiCtrl, audioTools) {

		const map = $$.util.mapRange(0, 127, 0, 1)


		const ctrl = $$.viewController(elt, {
			data: {
				audio1: false,
				audio2: false,
				curPFL: 1,
				midiInputs: [],
				midiOutputs: [],
				crossFader: 0.5,
			},
			events: {
				onTimeUpdate: function(ev, data) {
					//console.log('onTimeUpdate', data)
					updateTime(data)
				},
				onSliderChange: function () {
					const value = $(this).getValue()
					masterCrossFader.setFaderLevel(value)
				},
				onLoad: async function () {
					const audio = $(this).data('audio')
					const selFile = fileList.getSelFile()
					if (selFile) {
						ctrl.model[audio] = true
						ctrl.update()
						const audioBuffer = await ctrl.scope[audio].setInfo(selFile)
						drawRunningBuffer(audioBuffer, 'red')
						ctrl.model[audio] = false
						updateTime(0)
						ctrl.update()
					}
				},
				onMidiInputChange: function (ev) {
					const selectedId = $(this).getValue()
					midiCtrl.selectMIDIDevice(selectedId)
					midiCtrl.clearAllButtons()
					midiCtrl.setButtonIntensity('PFL', 1, 1)
				}
			}
		})


		function updateTime(time) {
			const left = (RUNNING_DISPLAY_WIDTH / 2) * (1 - time)
			runningBuffer.style.left = left + 'px'
		}

		/**
		 * 
		 * @param {number} deck 
		 * @returns {DJMix.Control.AudioPlayer.Interface}
		 */
		function getAudioCtrl(deck) {
			return ctrl.scope['audio' + deck]
		}

		midiCtrl.on('PLAY', ({ deck }) => {
			const audioCtrl = getAudioCtrl(deck)
			midiCtrl.setButtonIntensity('PLAY', audioCtrl.isPlaying() ? 1 : 127, deck)
			audioCtrl.togglePlay()
		})

		midiCtrl.on('LOAD', async ({ deck }) => {
			const selFile = fileList.getSelFile()
			const audio = 'audio' + deck
			//console.log('selFile', selFile)
			if (selFile) {
				ctrl.model[audio] = true
				ctrl.update()
				await getAudioCtrl(deck).setInfo(selFile)
				ctrl.model[audio] = false
				ctrl.update()
			}
		})

		midiCtrl.on('CROSS_FADER', async ({ velocity }) => {
			const crossFader = map(velocity)
			ctrl.setData({ crossFader })
			masterCrossFader.setFaderLevel(crossFader)
		})

		midiCtrl.on('LEVEL', async ({ deck, velocity }) => {
			const volume = map(velocity)
			getAudioCtrl(deck).setVolume(volume)
		})

		midiCtrl.on('BROWSE_WHEEL', async ({ velocity }) => {
			if (velocity == 1) {
				fileList.selDown()
			}
			else {
				fileList.selUp()
			}
		})

		midiCtrl.on('ENTER', async () => {
			fileList.enterSelFolder()
		})

		midiCtrl.on('PFL', ({ deck }) => {
			if (deck == 1) {
				cueCrossFader.setFaderLevel(0)
				midiCtrl.setButtonIntensity('PFL', 1, 1)
				midiCtrl.setButtonIntensity('PFL', 0, 2)
			}
			else {
				cueCrossFader.setFaderLevel(1)
				midiCtrl.setButtonIntensity('PFL', 0, 1)
				midiCtrl.setButtonIntensity('PFL', 1, 2)
			}
		})

		midiCtrl.on('MASTER_LEVEL', ({ velocity }) => {
			masterCrossFader.setMasterLevel(map(velocity))
		})

		midiCtrl.on('CUE_LEVEL', ({ velocity }) => {
			cueCrossFader.setMasterLevel(map(velocity))
		})

		async function init() {
			console.log('init')
			const info = await midiCtrl.requestMIDIAccess()
			ctrl.setData(info)
		}



		/**@type {Breizbot.Controls.FileList.Interface} */
		const fileList = ctrl.scope.filelist

		/**@type {DJMix.Control.AudioPlayer.Interface} */
		const audio1 = ctrl.scope.audio1

		/**@type {DJMix.Control.AudioPlayer.Interface} */
		const audio2 = ctrl.scope.audio2

		/**@type {HTMLElement} */
		const runningBufferContainer = ctrl.scope.runningBufferContainer.get(0)

		/**@type {HTMLElement} */
		const runningBuffer = ctrl.scope.runningBuffer.get(0)

		const RUNNING_DISPLAY_WIDTH = 1200
		const RUNNING_DISPLAY_HEIGHT = 80
		const SECONDS_OF_RUNNING_DISPLAY = 2.0
		const MAX_CANVAS_WIDTH = 32000


		runningBufferContainer.style.width = RUNNING_DISPLAY_WIDTH + 'px'
		runningBufferContainer.style.height = RUNNING_DISPLAY_HEIGHT + 'px'

		function createCanvas(color) {
			console.log('createCanvas')
			const canvas = document.createElement('canvas')
			canvas.width = MAX_CANVAS_WIDTH
			canvas.height = RUNNING_DISPLAY_HEIGHT
			runningBuffer.appendChild(canvas)
			const ctx = canvas.getContext('2d')
			ctx.clearRect(0, 0, MAX_CANVAS_WIDTH, RUNNING_DISPLAY_HEIGHT)
			ctx.fillStyle = color
			return ctx
		}

		/**
		 * 
		 * @param {AudioBuffer} audioBuffer 
		 * @param {string} color 
		 */
		function drawRunningBuffer(audioBuffer, color) {
			console.log('bufferLength', audioBuffer.length)
			const width = Math.ceil(RUNNING_DISPLAY_WIDTH * audioBuffer.duration / SECONDS_OF_RUNNING_DISPLAY)
			console.log('width', width)

			const data = audioBuffer.getChannelData(0)
			const step = Math.ceil(SECONDS_OF_RUNNING_DISPLAY * audioBuffer.sampleRate / RUNNING_DISPLAY_WIDTH)
			console.log('step', step)
			const amp = RUNNING_DISPLAY_HEIGHT / 2

			let ctx = createCanvas(color)
			for (let i = 0, k = 0; i < width; i++, k++) {
				if (k == MAX_CANVAS_WIDTH) {
					ctx = createCanvas(color)
					k = 0
				}
				let min = 1.0
				let max = -1.0
				for (let j = 0; j < step; j++) {
					const datnum = data[(i * step) + j]
					if (datnum < min)
						min = datnum
					if (datnum > max) 
						max = datnum
				}
				ctx.fillRect(k, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
			}

		}


		const source1 = audioTools.createMediaSource(audio1.getAudioElement())
		const source2 = audioTools.createMediaSource(audio2.getAudioElement())

		const masterCrossFader = audioTools.createCrossFaderWithMasterLevel(source1, source2)

		const cueCrossFader = audioTools.createCrossFaderWithMasterLevel(source1, source2)
		cueCrossFader.setFaderLevel(0)

		const merger = audioTools.createStereoMerger(masterCrossFader.getOutputNode(), cueCrossFader.getOutputNode())

		audioTools.createDestination(4, merger)

		init()

	}


});




