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

		const RUNNING_DISPLAY_WIDTH = 1200
		const RUNNING_DISPLAY_HEIGHT = 80
		const SECONDS_OF_RUNNING_DISPLAY = 10.0
		const MAX_CANVAS_WIDTH = 32000

		const hotcues1 = {}
		const hotcues2 = {}

		const hotcues = [hotcues1, hotcues2]

		const ctrl = $$.viewController(elt, {
			data: {
				audio1: false,
				audio2: false,
				curPFL: 1,
				midiInputs: [],
				midiOutputs: [],
				crossFader: 0.5,
				masterVolume: 0.5,
				cueVolume: 0.5,
				runningBufferContainerStyle: {
					width: RUNNING_DISPLAY_WIDTH + 'px',
					height: RUNNING_DISPLAY_HEIGHT + 'px'
				},
				zeroTimeStyle: {
					left: RUNNING_DISPLAY_WIDTH / 2,
					height: RUNNING_DISPLAY_HEIGHT
				},
				hotcueContainerStyle: {

				}
			},
			events: {
				onMasterVolumeChange: function (ev, value) {
					//console.log('onMasterVolumeChange', value)
					masterCrossFader.setMasterLevel(value)
				},
				onCueVolumeChange: function (ev, value) {
					masterCrossFader.setMasterLevel(value)
				},
				onPause: function () {
					const deck = $(this).data('audio')
					//console.log('onPause', deck)
					midiCtrl.setButtonIntensity('PLAY', 1, deck)
				},

				onPlay: function () {
					const deck = $(this).data('audio')
					//console.log('onPlay', deck)
					midiCtrl.setButtonIntensity('PLAY', 127, deck)

				},
				onCrossFaderChange: function (ev, value) {
					masterCrossFader.setFaderLevel(value)
				},
				onLoad: function () {
					const deck = $(this).data('audio')
					loadTrack(deck)
				},
				onMidiInputChange: function (ev) {
					const selectedId = $(this).getValue()
					midiCtrl.selectMIDIDevice(selectedId)
					midiCtrl.clearAllButtons()
					midiCtrl.setButtonIntensity('PFL', 1, 2)
				}
			}
		})

		const colors = ['red', 'green']

		async function loadTrack(deck) {
			console.log('loadTrack', deck)
			const audio = 'audio' + deck
			if (ctrl.model[audio] == true) {
				console.log('A track is already loading')
				return
			}
			const selFile = fileList.getSelFile()
			if (selFile) {
				const runningBuffer = runningBuffers[deck - 1]
				runningBuffer.innerHTML = '' // remove all children
				const hotcueContainer = hotcueContainers[deck - 1]
				hotcueContainer.innerHTML = '' // remove all children

				ctrl.model[audio] = true
				ctrl.update()
				const audioBuffer = await ctrl.scope[audio].setInfo(selFile)

				const width = RUNNING_DISPLAY_WIDTH / 2 * audioBuffer.duration
				hotcueContainer.style.width = width + 'px'
				hotcueContainer.style.height = RUNNING_DISPLAY_HEIGHT + 'px'

				drawRunningBuffer(audioBuffer, runningBuffer, colors[deck - 1])
				ctrl.model[audio] = false
				updateTime(0, deck)
				ctrl.update()
			}

		}

		/**
		 * 
		 * @param {number} time 
		 * @param {number} deck 
		 */
		function updateTime(time, deck) {
			//console.log('updateTime', time)
			const runningBuffer = runningBuffers[deck - 1]
			const hotcueContainer = hotcueContainers[deck - 1]
			const left = (RUNNING_DISPLAY_WIDTH / SECONDS_OF_RUNNING_DISPLAY) * (SECONDS_OF_RUNNING_DISPLAY / 2 - time)
			runningBuffer.style.left = left + 'px'
			hotcueContainer.style.left = left + 'px'
		}

		const hotcueColors = ['red', 'green', 'blue', 'orange']

		/**
		 * 
		 * @param {number} deck 
		 * @param {number} hotcue 
		 * @param {number} time 
		 */
		function createHotCue(deck, hotcue, time) {
			console.log('createHotCue', { deck, hotcue, time })
			const hotcueContainer = hotcueContainers[deck - 1]
			const div = document.createElement('div')
			div.classList.add('hotcue')

			const width = RUNNING_DISPLAY_WIDTH / SECONDS_OF_RUNNING_DISPLAY * time
			div.style.left = width + 'px'
			div.style.backgroundColor = hotcueColors[hotcue - 1]
			div.style.height = RUNNING_DISPLAY_HEIGHT + 'px'
			hotcueContainer.appendChild(div)
			hotcues[deck - 1][hotcue - 1] = time

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
			loadTrack(deck)
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

		midiCtrl.on('JOG_WHEEL', ({ deck, velocity }) => {
			//console.log('JOG_WHEEL', {deck, velocity})
			const audioCtrl = getAudioCtrl(deck)
			audioCtrl.seek(velocity == 1 ? 1 : -1)
		})

		midiCtrl.on('CUE', ({ deck }) => {
			const audioCtrl = getAudioCtrl(deck)
			audioCtrl.reset()
		})

		midiCtrl.on('HOT_CUE', ({ deck, key }) => {
			//console.log('HOT_CUE', { deck, key })
			const audioCtrl = getAudioCtrl(deck)
			const time = audioCtrl.getCurrentTime()
			//console.log('hotcues', hotcues[deck - 1])
			const hotcueTime = hotcues[deck - 1][key - 1]
			if (hotcueTime == undefined) {
				createHotCue(deck, key, time)
				midiCtrl.setButtonIntensity('HOT_CUE', 127, deck, key)
			}
			else {
				audioCtrl.reset(hotcueTime, true)
			}

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
			const masterVolume = map(velocity)
			masterCrossFader.setMasterLevel(masterVolume)
			ctrl.setData({ masterVolume })
		})

		midiCtrl.on('CUE_LEVEL', ({ velocity }) => {
			const cueVolume = map(velocity)
			cueCrossFader.setMasterLevel(cueVolume)
			ctrl.setData({ cueVolume })
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

		/**@type {Array<HTMLElement>} */
		const runningBuffers = [ctrl.scope.runningBuffer1.get(0), ctrl.scope.runningBuffer2.get(0)]

		/**@type {Array<HTMLElement>} */
		const hotcueContainers = [ctrl.scope.hotcueContainer1.get(0), ctrl.scope.hotcueContainer2.get(0)]

		/**
		 * 
		 * @param {HTMLElement} runningBuffer 
		 * @param {string} color 
		 * @returns 
		 */
		function createCanvas(runningBuffer, color) {
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
		function drawRunningBuffer(audioBuffer, runningBuffer, color) {

			console.log('bufferLength', audioBuffer.length)
			const width = Math.ceil(RUNNING_DISPLAY_WIDTH * audioBuffer.duration / SECONDS_OF_RUNNING_DISPLAY)
			console.log('width', width)

			const data = audioBuffer.getChannelData(0)
			const step = Math.ceil(SECONDS_OF_RUNNING_DISPLAY * audioBuffer.sampleRate / RUNNING_DISPLAY_WIDTH)
			console.log('step', step)
			const amp = RUNNING_DISPLAY_HEIGHT / 2

			let ctx = createCanvas(runningBuffer, color)
			for (let i = 0, k = 0; i < width; i++, k++) {
				if (k == MAX_CANVAS_WIDTH) {
					ctx = createCanvas(runningBuffer, color)
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

		function updateDisplay() {
			if (audio1.isLoaded()) {
				updateTime(audio1.getCurrentTime(), 1)
			}
			if (audio2.isLoaded()) {
				updateTime(audio2.getCurrentTime(), 2)
			}
			requestAnimationFrame(updateDisplay)
		}

		updateDisplay()

		const source1 = audio1.getOutputNode()
		const source2 = audio2.getOutputNode()

		const masterCrossFader = audioTools.createCrossFaderWithMasterLevel(source1, source2)

		const cueCrossFader = audioTools.createCrossFaderWithMasterLevel(source1, source2)
		cueCrossFader.setFaderLevel(1)

		const merger = audioTools.createStereoMerger(masterCrossFader.getOutputNode(), cueCrossFader.getOutputNode())

		audioTools.createDestination(4, merger)

		init()

	}


});




