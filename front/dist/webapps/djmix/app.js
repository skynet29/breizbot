// @ts-check

$$.control.registerControl('rootPage', {

	template: "<div class=\"top\">\n    <div class=\"midi\">\n        <div>MIDI Device</div>\n        <div bn-control=\"brainjs.combobox\" bn-data=\"{items: midiInputs}\" bn-event=\"comboboxchange: onMidiInputChange\">\n        </div>\n\n    </div>\n    <div class=\"balance\">\n        <label>Left</label>\n        <div bn-control=\"brainjs.slider\" bn-data=\"{min: 0, max: 1, step: 0.01}\" bn-event=\"input: onCrossFaderChange\"\n            bn-val=\"crossFader\"></div>\n        <label>Right</label>\n    </div>\n    <div>\n        <button class=\"w3-button w3-blue\" bn-event=\"click: onLoad\" data-audio=\"1\">LOAD 1\n            <i class=\"fa fa-spinner fa-pulse\" bn-show=\"audio1\"></i>\n        </button>\n        <button class=\"w3-button w3-blue\" bn-event=\"click: onLoad\" data-audio=\"2\">LOAD 2\n            <i class=\"fa fa-spinner fa-pulse\" bn-show=\"audio2\"></i>\n        </button>\n\n    </div>\n\n</div>\n<div class=\"visualizer\">\n    <div class=\"runningBufferContainer\" bn-style=\"runningBufferContainerStyle\">\n        <div class=\"runningBuffer\" bn-bind=\"runningBuffer1\"></div>\n        <div class=\"zeroTime\" bn-style=\"zeroTimeStyle\"></div>\n        <div class=\"hotcueContainer\" bn-style=\"hotcueContainerStyle\" bn-bind=\"hotcueContainer1\"></div>\n    </div>\n</div>\n<div class=\"visualizer\">\n    <div class=\"runningBufferContainer\" bn-style=\"runningBufferContainerStyle\">\n        <div class=\"runningBuffer\" bn-bind=\"runningBuffer2\"></div>\n        <div class=\"zeroTime\" bn-style=\"zeroTimeStyle\"></div>\n        <div class=\"hotcueContainer\" bn-bind=\"hotcueContainer2\"></div>\n    </div>\n</div>\n\n<div class=\"center\">\n    <div bn-control=\"audioplayer\" bn-iface=\"audio1\" data-audio=\"1\" bn-event=\"pause: onPause, playing: onPlay\"></div>\n    <div class=\"masterPanel\">\n        <span>Master</span>\n        <div class=\"toolbar2\">\n            <i class=\"fas fa-lg fa-volume-down w3-text-blue volume\"></i>\n            <div bn-control=\"brainjs.slider\" bn-data=\"{min: 0, max:1, step: 0.01, orientation: \'vertical\'}\"\n                bn-event=\"input: onMasterVolumeChange\" bn-val=\"masterVolume\" class=\"volulmeSlider\"></div>\n        </div>        \n    </div>\n    <div class=\"masterPanel\">\n        <span>PFL</span>\n        <div class=\"toolbar2\">\n            <i class=\"fas fa-lg fa-volume-down w3-text-blue volume\"></i>\n            <div bn-control=\"brainjs.slider\" bn-data=\"{min: 0, max:1, step: 0.01, orientation: \'vertical\'}\"\n                bn-event=\"input: onCueVolumeChange\" bn-val=\"cueVolume\" class=\"volulmeSlider\"></div>\n        </div>        \n    </div>\n    <div bn-control=\"audioplayer\" bn-iface=\"audio2\" data-audio=\"2\" bn-event=\"pause: onPause, playing: onPlay\"></div>\n</div>\n\n\n<div bn-control=\"breizbot.filelist\" bn-data=\"{selectionEnabled: true, filterExtension: \'mp3\', getMP3Info: true}\"\n    bn-iface=\"filelist\"></div>",

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

		template: "<div class=\"info\">\n	<div class=\"toolbar\">\n		<strong bn-text=\"name\"></strong>\n\n		<button bn-show=\"showPlay\" bn-event=\"click: onPlay\" class=\"w3-btn w3-blue\" title=\"Play\" bn-icon=\"fa fa-play\">\n		</button>\n\n		<button bn-show=\"playing\" bn-event=\"click: onPause\" class=\"w3-btn w3-blue\" title=\"Pause\" bn-icon=\"fa fa-pause\">\n		</button>\n\n\n\n	</div>\n\n	<div class=\"toolbar2\">\n		<i class=\"fas fa-lg fa-volume-down w3-text-blue volume\"></i>\n		<div bn-control=\"brainjs.slider\" bn-data=\"{min: 0, max:1, step: 0.01, orientation: \'vertical\'}\"\n			bn-event=\"input: onVolumeChange\" bn-val=\"volume\" class=\"volulmeSlider\"></div>\n	</div>\n</div>\n\n<div class=\"bufferContainer\" bn-show=\"showBuffer\">\n	<canvas bn-bind=\"bufferCanvas\" class=\"bufferCanvas\" width=\"470\" height=\"100\">\n</div>\n\n<div class=\"slider\">\n	<span bn-text=\"getTimeInfo\"></span>\n	<div bn-control=\"brainjs.slider\" bn-data=\"{max: duration}\" bn-event=\"input: onSliderChange\" bn-val=\"curTime\">\n	</div>\n\n</div>\n\n",

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
				if (ctrl.model.loaded && !ctrl.model.playing) {
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




//@ts-check

$$.service.registerService('AudioTools', {

    init: function() {

        const audioCtx = new AudioContext()

        function getAudioContext() {
            return audioCtx
        }

        function getCurrentTime() {
            return audioCtx.currentTime
        }

        /**
         * 
         * @param {AudioNode} source1 
         * @param {AudioNode} source2 
         */
        function createStereoMerger(source1, source2) {
            const splitter1 = audioCtx.createChannelSplitter(2)
            source1.connect(splitter1)
            const splitter2 = audioCtx.createChannelSplitter(2)
            source2.connect(splitter2)
            
            const merger = audioCtx.createChannelMerger(4)
            splitter1.connect(merger, 0, 0)
            splitter1.connect(merger, 1, 1)
            splitter2.connect(merger, 0, 2)
            splitter2.connect(merger, 1, 3)  
            
            return merger
        }

        /**
         * 
         * @param {number} channelCount 
         * @param {AudioNode} inputNode 
         */
        function createDestination(channelCount, inputNode) {
            const dest = audioCtx.createMediaStreamDestination()
            dest.channelCount = channelCount
            const audio = new Audio()
            //await audio.setSinkId(audioDevice[0].deviceId)
            audio.srcObject = dest.stream
            inputNode.connect(dest)
            audio.play()            
        }


        /**
         * 
         * @param {AudioNode} source1 
         * @param {AudioNode} source2 
         */
        function createCrossFaderWithMasterLevel(source1, source2) {
            const gain1 = audioCtx.createGain()
            gain1.gain.value = 0.5
            source1.connect(gain1)

            const gain2 = audioCtx.createGain()
            gain2.gain.value = 0.5
            source2.connect(gain2)

            const masterGain = audioCtx.createGain()
            masterGain.gain.value = 0.5

            gain1.connect(masterGain)
            gain2.connect(masterGain)


            function setFaderLevel(value) {
                gain2.gain.value = Math.cos((1.0 - value) * 0.5 * Math.PI)
                gain1.gain.value = Math.cos(value * 0.5 * Math.PI)
            }

            function setMasterLevel(value) {
                masterGain.gain.value = value
            }
            return {
                setFaderLevel,
                setMasterLevel,
                getOutputNode: function() {
                    return masterGain
                }
            }

        }

        return {
            createStereoMerger,
            createDestination,
            createCrossFaderWithMasterLevel,
            getAudioContext,
            getCurrentTime
        }
    }
});

//@ts-check


$$.service.registerService('MIDICtrl', {

    init: function (config) {

        const BtnIntensity = {
            MAX: 0x7F,
            MIN: 0x01,
            OFF: 0x00,
            ON: 0x01
        }

        const midiInputMapping = [
            { action: 'MASTER_LEVEL', cmd: 0xBF, note: 0X0A },
            { action: 'CUE_LEVEL', cmd: 0xBF, note: 0X0C },
            { action: 'CROSS_FADER', cmd: 0xBF, note: 0X08 },
            { action: 'LEVEL', cmd: 0xB0, note: 0X16, deck: 1 },
            { action: 'PITCH', cmd: 0xB0, note: 0X19, deck: 1 },
            { action: 'LEVEL', cmd: 0xB1, note: 0X16, deck: 2 },
            { action: 'PITCH', cmd: 0xB1, note: 0X19, deck: 2 },

            { action: 'SYNC', cmd: 0x90, note: 0X02, deck: 1, type: 'BTN' },
            { action: 'CUE', cmd: 0x90, note: 0X01, deck: 1, type: 'BTN' },
            { action: 'PLAY', cmd: 0x90, note: 0X00, deck: 1, type: 'BTN' },
            { action: 'PFL', cmd: 0x90, note: 0X1B, deck: 1, type: 'BTN2' },
            { action: 'JOGTOUCH', cmd: 0x90, note: 0X06, deck: 1 },

            { action: 'SYNC', cmd: 0x91, note: 0X02, deck: 2, type: 'BTN' },
            { action: 'CUE', cmd: 0x91, note: 0X01, deck: 2, type: 'BTN' },
            { action: 'PLAY', cmd: 0x91, note: 0X00, deck: 2, type: 'BTN' },
            { action: 'PFL', cmd: 0x91, note: 0X1B, deck: 2, type: 'BTN2' },
            { action: 'JOGTOUCH', cmd: 0x91, note: 0X06, deck: 2 },

            { action: 'LOAD', cmd: 0x9F, note: 0X02, deck: 1 },
            { action: 'LOAD', cmd: 0x9F, note: 0X03, deck: 2 },
            { action: 'ENTER', cmd: 0x9F, note: 0X06 },

            { action: 'JOG_WHEEL', cmd: 0xB0, note: 0X06, deck: 1 },
            { action: 'JOG_WHEEL', cmd: 0xB1, note: 0X06, deck: 2 },
            { action: 'BROWSE_WHEEL', cmd: 0xBF, note: 0X00 },

            { action: 'HOT_CUE', cmd: 0x94, note: 0X01, deck: 1, key: 1, type: 'BTN' },
            { action: 'HOT_CUE', cmd: 0x94, note: 0X02, deck: 1, key: 2, type: 'BTN' },
            { action: 'HOT_CUE', cmd: 0x94, note: 0X03, deck: 1, key: 3, type: 'BTN' },
            { action: 'HOT_CUE', cmd: 0x94, note: 0X04, deck: 1, key: 4, type: 'BTN' },

            { action: 'HOT_CUE', cmd: 0x95, note: 0X01, deck: 2, key: 1, type: 'BTN' },
            { action: 'HOT_CUE', cmd: 0x95, note: 0X02, deck: 2, key: 2, type: 'BTN' },
            { action: 'HOT_CUE', cmd: 0x95, note: 0X03, deck: 2, key: 3, type: 'BTN' },
            { action: 'HOT_CUE', cmd: 0x95, note: 0X04, deck: 2, key: 4, type: 'BTN' },


            { action: 'LOOP_AUTO', cmd: 0x94, note: 0X11, deck: 1, key: 1, type: 'BTN' },
            { action: 'LOOP_AUTO', cmd: 0x94, note: 0X12, deck: 1, key: 2, type: 'BTN' },
            { action: 'LOOP_AUTO', cmd: 0x94, note: 0X13, deck: 1, key: 3, type: 'BTN' },
            { action: 'LOOP_AUTO', cmd: 0x94, note: 0X14, deck: 1, key: 4, type: 'BTN' },

            { action: 'LOOP_AUTO', cmd: 0x95, note: 0X11, deck: 2, key: 1, type: 'BTN' },
            { action: 'LOOP_AUTO', cmd: 0x95, note: 0X12, deck: 2, key: 2, type: 'BTN' },
            { action: 'LOOP_AUTO', cmd: 0x95, note: 0X13, deck: 2, key: 3, type: 'BTN' },
            { action: 'LOOP_AUTO', cmd: 0x95, note: 0X14, deck: 2, key: 4, type: 'BTN' },

            { action: 'LOOP_MANUAL', cmd: 0x94, note: 0X21, deck: 1, key: 1, type: 'BTN' },
            { action: 'LOOP_MANUAL', cmd: 0x94, note: 0X22, deck: 1, key: 2, type: 'BTN' },
            { action: 'LOOP_MANUAL', cmd: 0x94, note: 0X23, deck: 1, key: 3, type: 'BTN' },
            { action: 'LOOP_MANUAL', cmd: 0x94, note: 0X24, deck: 1, key: 4, type: 'BTN' },

            { action: 'LOOP_MANUAL', cmd: 0x95, note: 0X21, deck: 2, key: 1, type: 'BTN' },
            { action: 'LOOP_MANUAL', cmd: 0x95, note: 0X22, deck: 2, key: 2, type: 'BTN' },
            { action: 'LOOP_MANUAL', cmd: 0x95, note: 0X23, deck: 2, key: 3, type: 'BTN' },
            { action: 'LOOP_MANUAL', cmd: 0x95, note: 0X24, deck: 2, key: 4, type: 'BTN' },

            { action: 'SAMPLER', cmd: 0x94, note: 0X31, deck: 1, key: 1, type: 'BTN' },
            { action: 'SAMPLER', cmd: 0x94, note: 0X32, deck: 1, key: 2, type: 'BTN' },
            { action: 'SAMPLER', cmd: 0x94, note: 0X33, deck: 1, key: 3, type: 'BTN' },
            { action: 'SAMPLER', cmd: 0x94, note: 0X34, deck: 1, key: 4, type: 'BTN' },

            { action: 'SAMPLER', cmd: 0x95, note: 0X31, deck: 2, key: 1, type: 'BTN' },
            { action: 'SAMPLER', cmd: 0x95, note: 0X32, deck: 2, key: 2, type: 'BTN' },
            { action: 'SAMPLER', cmd: 0x95, note: 0X33, deck: 2, key: 3, type: 'BTN' },
            { action: 'SAMPLER', cmd: 0x95, note: 0X34, deck: 2, key: 4, type: 'BTN' },

        ]


        function getActionDesc(data) {
            const [cmd, note] = data
            for (const e of midiInputMapping) {
                if (e.cmd == cmd && e.note == note) {
                    return e
                }
            }
            return null
        }

        const events = new EventEmitter2()

        /**@type {MIDIAccess} */
        let midiAccess = null

        /**@type {MIDIInput} */
        let midiIn = null
        /**@type {MIDIOutput} */
        let midiOut = null


        async function requestMIDIAccess() {
            midiAccess = await navigator.requestMIDIAccess()
            const midiInputs = []
            for (const { name, id } of midiAccess.inputs.values()) {
                midiInputs.push({ label: name, value: id })
            }
            const midiOutputs = []
            for (const { name, id } of midiAccess.outputs.values()) {
                midiOutputs.push({ label: name, value: id })
            }

            return { midiInputs, midiOutputs }
        }

        function selectMIDIInput(selectedId) {
            if (midiIn) {
                midiIn.onmidimessage = null
            }
            for (const input of midiAccess.inputs.values()) {
                if (input.id == selectedId) {
                    midiIn = input
                    midiIn.onmidimessage = onMidiMessage
                    return
                }
            }            
        }

        function selectMIDIDevice(selectedId) {
            if (midiIn) {
                midiIn.onmidimessage = null
            }
            for (const input of midiAccess.inputs.values()) {
                if (input.id == selectedId) {
                    midiIn = input
                    midiIn.onmidimessage = onMidiMessage

                    for (const output of midiAccess.outputs.values()) {
                        if (output.name == input.name) {
                            midiOut = output
                            break
                        }
                    }
        
                    break
                }
            }
        }

        function selectMIDIOutput(selectedId) {
            for (const output of midiAccess.outputs.values()) {
                if (output.id == selectedId) {
                    midiOut = output
                    break;
                }
            }
        }

        function clearAllButtons() {
            if (midiOut == null)
                return
            for (const { cmd, note, type } of midiInputMapping) {
                if (type == 'BTN' || type == 'BTN2') {
                    midiOut.send([cmd, note, type == 'BTN' ? BtnIntensity.MIN : BtnIntensity.OFF])
                }
            }
        }

        function setButtonIntensity(action, intensity, deck, key) {
            if (midiOut == null)
                return
            for (const e of midiInputMapping) {
                let ret = (e.action == action)
                if (deck != undefined) {
                    ret &= (e.deck == deck)
                }
                if (key != undefined) {
                    ret &= (e.key == key)
                }
                if (ret) {
                    midiOut.send([e.cmd, e.note, intensity])
                }
            }

        }

        function onMidiMessage(ev) {
            const [cmd, note, velocity] = ev.data
            //console.log('onMidiMessage', cmd.toString(16), note.toString(16), velocity)
            const desc = getActionDesc(ev.data)

            if (desc != null) {
                const { action, deck, key } = desc
                events.emit(action, { deck, key, velocity })
            }

        }

        return {
            selectMIDIInput,
            selectMIDIOutput,
            selectMIDIDevice,
            clearAllButtons,
            setButtonIntensity,
            requestMIDIAccess,
            on: events.on.bind(events),
            BtnIntensity
        }
    }
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJjb250cm9scy9wbGF5ZXIuanMiLCJzZXJ2aWNlcy9hdWRpb3Rvb2xzLmpzIiwic2VydmljZXMvbWlkaWN0cmwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEB0cy1jaGVja1xuXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncm9vdFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9wXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwibWlkaVxcXCI+XFxuICAgICAgICA8ZGl2Pk1JREkgRGV2aWNlPC9kaXY+XFxuICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogbWlkaUlucHV0c31cXFwiIGJuLWV2ZW50PVxcXCJjb21ib2JveGNoYW5nZTogb25NaWRpSW5wdXRDaGFuZ2VcXFwiPlxcbiAgICAgICAgPC9kaXY+XFxuXFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJiYWxhbmNlXFxcIj5cXG4gICAgICAgIDxsYWJlbD5MZWZ0PC9sYWJlbD5cXG4gICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5zbGlkZXJcXFwiIGJuLWRhdGE9XFxcInttaW46IDAsIG1heDogMSwgc3RlcDogMC4wMX1cXFwiIGJuLWV2ZW50PVxcXCJpbnB1dDogb25Dcm9zc0ZhZGVyQ2hhbmdlXFxcIlxcbiAgICAgICAgICAgIGJuLXZhbD1cXFwiY3Jvc3NGYWRlclxcXCI+PC9kaXY+XFxuICAgICAgICA8bGFiZWw+UmlnaHQ8L2xhYmVsPlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdj5cXG4gICAgICAgIDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1ibHVlXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uTG9hZFxcXCIgZGF0YS1hdWRpbz1cXFwiMVxcXCI+TE9BRCAxXFxuICAgICAgICAgICAgPGkgY2xhc3M9XFxcImZhIGZhLXNwaW5uZXIgZmEtcHVsc2VcXFwiIGJuLXNob3c9XFxcImF1ZGlvMVxcXCI+PC9pPlxcbiAgICAgICAgPC9idXR0b24+XFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtYmx1ZVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkxvYWRcXFwiIGRhdGEtYXVkaW89XFxcIjJcXFwiPkxPQUQgMlxcbiAgICAgICAgICAgIDxpIGNsYXNzPVxcXCJmYSBmYS1zcGlubmVyIGZhLXB1bHNlXFxcIiBibi1zaG93PVxcXCJhdWRpbzJcXFwiPjwvaT5cXG4gICAgICAgIDwvYnV0dG9uPlxcblxcbiAgICA8L2Rpdj5cXG5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJ2aXN1YWxpemVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwicnVubmluZ0J1ZmZlckNvbnRhaW5lclxcXCIgYm4tc3R5bGU9XFxcInJ1bm5pbmdCdWZmZXJDb250YWluZXJTdHlsZVxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJydW5uaW5nQnVmZmVyXFxcIiBibi1iaW5kPVxcXCJydW5uaW5nQnVmZmVyMVxcXCI+PC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJ6ZXJvVGltZVxcXCIgYm4tc3R5bGU9XFxcInplcm9UaW1lU3R5bGVcXFwiPjwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaG90Y3VlQ29udGFpbmVyXFxcIiBibi1zdHlsZT1cXFwiaG90Y3VlQ29udGFpbmVyU3R5bGVcXFwiIGJuLWJpbmQ9XFxcImhvdGN1ZUNvbnRhaW5lcjFcXFwiPjwvZGl2PlxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJ2aXN1YWxpemVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwicnVubmluZ0J1ZmZlckNvbnRhaW5lclxcXCIgYm4tc3R5bGU9XFxcInJ1bm5pbmdCdWZmZXJDb250YWluZXJTdHlsZVxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJydW5uaW5nQnVmZmVyXFxcIiBibi1iaW5kPVxcXCJydW5uaW5nQnVmZmVyMlxcXCI+PC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJ6ZXJvVGltZVxcXCIgYm4tc3R5bGU9XFxcInplcm9UaW1lU3R5bGVcXFwiPjwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaG90Y3VlQ29udGFpbmVyXFxcIiBibi1iaW5kPVxcXCJob3RjdWVDb250YWluZXIyXFxcIj48L2Rpdj5cXG4gICAgPC9kaXY+XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwiY2VudGVyXFxcIj5cXG4gICAgPGRpdiBibi1jb250cm9sPVxcXCJhdWRpb3BsYXllclxcXCIgYm4taWZhY2U9XFxcImF1ZGlvMVxcXCIgZGF0YS1hdWRpbz1cXFwiMVxcXCIgYm4tZXZlbnQ9XFxcInBhdXNlOiBvblBhdXNlLCBwbGF5aW5nOiBvblBsYXlcXFwiPjwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJtYXN0ZXJQYW5lbFxcXCI+XFxuICAgICAgICA8c3Bhbj5NYXN0ZXI8L3NwYW4+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJ0b29sYmFyMlxcXCI+XFxuICAgICAgICAgICAgPGkgY2xhc3M9XFxcImZhcyBmYS1sZyBmYS12b2x1bWUtZG93biB3My10ZXh0LWJsdWUgdm9sdW1lXFxcIj48L2k+XFxuICAgICAgICAgICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLnNsaWRlclxcXCIgYm4tZGF0YT1cXFwie21pbjogMCwgbWF4OjEsIHN0ZXA6IDAuMDEsIG9yaWVudGF0aW9uOiBcXCd2ZXJ0aWNhbFxcJ31cXFwiXFxuICAgICAgICAgICAgICAgIGJuLWV2ZW50PVxcXCJpbnB1dDogb25NYXN0ZXJWb2x1bWVDaGFuZ2VcXFwiIGJuLXZhbD1cXFwibWFzdGVyVm9sdW1lXFxcIiBjbGFzcz1cXFwidm9sdWxtZVNsaWRlclxcXCI+PC9kaXY+XFxuICAgICAgICA8L2Rpdj4gICAgICAgIFxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cXFwibWFzdGVyUGFuZWxcXFwiPlxcbiAgICAgICAgPHNwYW4+UEZMPC9zcGFuPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwidG9vbGJhcjJcXFwiPlxcbiAgICAgICAgICAgIDxpIGNsYXNzPVxcXCJmYXMgZmEtbGcgZmEtdm9sdW1lLWRvd24gdzMtdGV4dC1ibHVlIHZvbHVtZVxcXCI+PC9pPlxcbiAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5zbGlkZXJcXFwiIGJuLWRhdGE9XFxcInttaW46IDAsIG1heDoxLCBzdGVwOiAwLjAxLCBvcmllbnRhdGlvbjogXFwndmVydGljYWxcXCd9XFxcIlxcbiAgICAgICAgICAgICAgICBibi1ldmVudD1cXFwiaW5wdXQ6IG9uQ3VlVm9sdW1lQ2hhbmdlXFxcIiBibi12YWw9XFxcImN1ZVZvbHVtZVxcXCIgY2xhc3M9XFxcInZvbHVsbWVTbGlkZXJcXFwiPjwvZGl2PlxcbiAgICAgICAgPC9kaXY+ICAgICAgICBcXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYXVkaW9wbGF5ZXJcXFwiIGJuLWlmYWNlPVxcXCJhdWRpbzJcXFwiIGRhdGEtYXVkaW89XFxcIjJcXFwiIGJuLWV2ZW50PVxcXCJwYXVzZTogb25QYXVzZSwgcGxheWluZzogb25QbGF5XFxcIj48L2Rpdj5cXG48L2Rpdj5cXG5cXG5cXG48ZGl2IGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LmZpbGVsaXN0XFxcIiBibi1kYXRhPVxcXCJ7c2VsZWN0aW9uRW5hYmxlZDogdHJ1ZSwgZmlsdGVyRXh0ZW5zaW9uOiBcXCdtcDNcXCcsIGdldE1QM0luZm86IHRydWV9XFxcIlxcbiAgICBibi1pZmFjZT1cXFwiZmlsZWxpc3RcXFwiPjwvZGl2PlwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInLCAnTUlESUN0cmwnLCAnQXVkaW9Ub29scyddLFxuXG5cdHByb3BzOiB7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXIgXG5cdCAqIEBwYXJhbSB7REpNaXguU2VydmljZS5NSURJQ3RybC5JbnRlcmZhY2V9IG1pZGlDdHJsXG5cdCAqIEBwYXJhbSB7REpNaXguU2VydmljZS5BdWRpb1Rvb2xzLkludGVyZmFjZX0gYXVkaW9Ub29sc1xuXHQgKi9cblx0aW5pdDogYXN5bmMgZnVuY3Rpb24gKGVsdCwgcGFnZXIsIG1pZGlDdHJsLCBhdWRpb1Rvb2xzKSB7XG5cblx0XHRjb25zdCBtYXAgPSAkJC51dGlsLm1hcFJhbmdlKDAsIDEyNywgMCwgMSlcblxuXHRcdGNvbnN0IFJVTk5JTkdfRElTUExBWV9XSURUSCA9IDEyMDBcblx0XHRjb25zdCBSVU5OSU5HX0RJU1BMQVlfSEVJR0hUID0gODBcblx0XHRjb25zdCBTRUNPTkRTX09GX1JVTk5JTkdfRElTUExBWSA9IDEwLjBcblx0XHRjb25zdCBNQVhfQ0FOVkFTX1dJRFRIID0gMzIwMDBcblxuXHRcdGNvbnN0IGhvdGN1ZXMxID0ge31cblx0XHRjb25zdCBob3RjdWVzMiA9IHt9XG5cblx0XHRjb25zdCBob3RjdWVzID0gW2hvdGN1ZXMxLCBob3RjdWVzMl1cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0YXVkaW8xOiBmYWxzZSxcblx0XHRcdFx0YXVkaW8yOiBmYWxzZSxcblx0XHRcdFx0Y3VyUEZMOiAxLFxuXHRcdFx0XHRtaWRpSW5wdXRzOiBbXSxcblx0XHRcdFx0bWlkaU91dHB1dHM6IFtdLFxuXHRcdFx0XHRjcm9zc0ZhZGVyOiAwLjUsXG5cdFx0XHRcdG1hc3RlclZvbHVtZTogMC41LFxuXHRcdFx0XHRjdWVWb2x1bWU6IDAuNSxcblx0XHRcdFx0cnVubmluZ0J1ZmZlckNvbnRhaW5lclN0eWxlOiB7XG5cdFx0XHRcdFx0d2lkdGg6IFJVTk5JTkdfRElTUExBWV9XSURUSCArICdweCcsXG5cdFx0XHRcdFx0aGVpZ2h0OiBSVU5OSU5HX0RJU1BMQVlfSEVJR0hUICsgJ3B4J1xuXHRcdFx0XHR9LFxuXHRcdFx0XHR6ZXJvVGltZVN0eWxlOiB7XG5cdFx0XHRcdFx0bGVmdDogUlVOTklOR19ESVNQTEFZX1dJRFRIIC8gMixcblx0XHRcdFx0XHRoZWlnaHQ6IFJVTk5JTkdfRElTUExBWV9IRUlHSFRcblx0XHRcdFx0fSxcblx0XHRcdFx0aG90Y3VlQ29udGFpbmVyU3R5bGU6IHtcblxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uTWFzdGVyVm9sdW1lQ2hhbmdlOiBmdW5jdGlvbiAoZXYsIHZhbHVlKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25NYXN0ZXJWb2x1bWVDaGFuZ2UnLCB2YWx1ZSlcblx0XHRcdFx0XHRtYXN0ZXJDcm9zc0ZhZGVyLnNldE1hc3RlckxldmVsKHZhbHVlKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkN1ZVZvbHVtZUNoYW5nZTogZnVuY3Rpb24gKGV2LCB2YWx1ZSkge1xuXHRcdFx0XHRcdG1hc3RlckNyb3NzRmFkZXIuc2V0TWFzdGVyTGV2ZWwodmFsdWUpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUGF1c2U6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjb25zdCBkZWNrID0gJCh0aGlzKS5kYXRhKCdhdWRpbycpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25QYXVzZScsIGRlY2spXG5cdFx0XHRcdFx0bWlkaUN0cmwuc2V0QnV0dG9uSW50ZW5zaXR5KCdQTEFZJywgMSwgZGVjaylcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvblBsYXk6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjb25zdCBkZWNrID0gJCh0aGlzKS5kYXRhKCdhdWRpbycpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25QbGF5JywgZGVjaylcblx0XHRcdFx0XHRtaWRpQ3RybC5zZXRCdXR0b25JbnRlbnNpdHkoJ1BMQVknLCAxMjcsIGRlY2spXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25Dcm9zc0ZhZGVyQ2hhbmdlOiBmdW5jdGlvbiAoZXYsIHZhbHVlKSB7XG5cdFx0XHRcdFx0bWFzdGVyQ3Jvc3NGYWRlci5zZXRGYWRlckxldmVsKHZhbHVlKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkxvYWQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjb25zdCBkZWNrID0gJCh0aGlzKS5kYXRhKCdhdWRpbycpXG5cdFx0XHRcdFx0bG9hZFRyYWNrKGRlY2spXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTWlkaUlucHV0Q2hhbmdlOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRjb25zdCBzZWxlY3RlZElkID0gJCh0aGlzKS5nZXRWYWx1ZSgpXG5cdFx0XHRcdFx0bWlkaUN0cmwuc2VsZWN0TUlESURldmljZShzZWxlY3RlZElkKVxuXHRcdFx0XHRcdG1pZGlDdHJsLmNsZWFyQWxsQnV0dG9ucygpXG5cdFx0XHRcdFx0bWlkaUN0cmwuc2V0QnV0dG9uSW50ZW5zaXR5KCdQRkwnLCAxLCAyKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGNvbnN0IGNvbG9ycyA9IFsncmVkJywgJ2dyZWVuJ11cblxuXHRcdGFzeW5jIGZ1bmN0aW9uIGxvYWRUcmFjayhkZWNrKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnbG9hZFRyYWNrJywgZGVjaylcblx0XHRcdGNvbnN0IGF1ZGlvID0gJ2F1ZGlvJyArIGRlY2tcblx0XHRcdGlmIChjdHJsLm1vZGVsW2F1ZGlvXSA9PSB0cnVlKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdBIHRyYWNrIGlzIGFscmVhZHkgbG9hZGluZycpXG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXHRcdFx0Y29uc3Qgc2VsRmlsZSA9IGZpbGVMaXN0LmdldFNlbEZpbGUoKVxuXHRcdFx0aWYgKHNlbEZpbGUpIHtcblx0XHRcdFx0Y29uc3QgcnVubmluZ0J1ZmZlciA9IHJ1bm5pbmdCdWZmZXJzW2RlY2sgLSAxXVxuXHRcdFx0XHRydW5uaW5nQnVmZmVyLmlubmVySFRNTCA9ICcnIC8vIHJlbW92ZSBhbGwgY2hpbGRyZW5cblx0XHRcdFx0Y29uc3QgaG90Y3VlQ29udGFpbmVyID0gaG90Y3VlQ29udGFpbmVyc1tkZWNrIC0gMV1cblx0XHRcdFx0aG90Y3VlQ29udGFpbmVyLmlubmVySFRNTCA9ICcnIC8vIHJlbW92ZSBhbGwgY2hpbGRyZW5cblxuXHRcdFx0XHRjdHJsLm1vZGVsW2F1ZGlvXSA9IHRydWVcblx0XHRcdFx0Y3RybC51cGRhdGUoKVxuXHRcdFx0XHRjb25zdCBhdWRpb0J1ZmZlciA9IGF3YWl0IGN0cmwuc2NvcGVbYXVkaW9dLnNldEluZm8oc2VsRmlsZSlcblxuXHRcdFx0XHRjb25zdCB3aWR0aCA9IFJVTk5JTkdfRElTUExBWV9XSURUSCAvIDIgKiBhdWRpb0J1ZmZlci5kdXJhdGlvblxuXHRcdFx0XHRob3RjdWVDb250YWluZXIuc3R5bGUud2lkdGggPSB3aWR0aCArICdweCdcblx0XHRcdFx0aG90Y3VlQ29udGFpbmVyLnN0eWxlLmhlaWdodCA9IFJVTk5JTkdfRElTUExBWV9IRUlHSFQgKyAncHgnXG5cblx0XHRcdFx0ZHJhd1J1bm5pbmdCdWZmZXIoYXVkaW9CdWZmZXIsIHJ1bm5pbmdCdWZmZXIsIGNvbG9yc1tkZWNrIC0gMV0pXG5cdFx0XHRcdGN0cmwubW9kZWxbYXVkaW9dID0gZmFsc2Vcblx0XHRcdFx0dXBkYXRlVGltZSgwLCBkZWNrKVxuXHRcdFx0XHRjdHJsLnVwZGF0ZSgpXG5cdFx0XHR9XG5cblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge251bWJlcn0gdGltZSBcblx0XHQgKiBAcGFyYW0ge251bWJlcn0gZGVjayBcblx0XHQgKi9cblx0XHRmdW5jdGlvbiB1cGRhdGVUaW1lKHRpbWUsIGRlY2spIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ3VwZGF0ZVRpbWUnLCB0aW1lKVxuXHRcdFx0Y29uc3QgcnVubmluZ0J1ZmZlciA9IHJ1bm5pbmdCdWZmZXJzW2RlY2sgLSAxXVxuXHRcdFx0Y29uc3QgaG90Y3VlQ29udGFpbmVyID0gaG90Y3VlQ29udGFpbmVyc1tkZWNrIC0gMV1cblx0XHRcdGNvbnN0IGxlZnQgPSAoUlVOTklOR19ESVNQTEFZX1dJRFRIIC8gU0VDT05EU19PRl9SVU5OSU5HX0RJU1BMQVkpICogKFNFQ09ORFNfT0ZfUlVOTklOR19ESVNQTEFZIC8gMiAtIHRpbWUpXG5cdFx0XHRydW5uaW5nQnVmZmVyLnN0eWxlLmxlZnQgPSBsZWZ0ICsgJ3B4J1xuXHRcdFx0aG90Y3VlQ29udGFpbmVyLnN0eWxlLmxlZnQgPSBsZWZ0ICsgJ3B4J1xuXHRcdH1cblxuXHRcdGNvbnN0IGhvdGN1ZUNvbG9ycyA9IFsncmVkJywgJ2dyZWVuJywgJ2JsdWUnLCAnb3JhbmdlJ11cblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7bnVtYmVyfSBkZWNrIFxuXHRcdCAqIEBwYXJhbSB7bnVtYmVyfSBob3RjdWUgXG5cdFx0ICogQHBhcmFtIHtudW1iZXJ9IHRpbWUgXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gY3JlYXRlSG90Q3VlKGRlY2ssIGhvdGN1ZSwgdGltZSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2NyZWF0ZUhvdEN1ZScsIHsgZGVjaywgaG90Y3VlLCB0aW1lIH0pXG5cdFx0XHRjb25zdCBob3RjdWVDb250YWluZXIgPSBob3RjdWVDb250YWluZXJzW2RlY2sgLSAxXVxuXHRcdFx0Y29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jylcblx0XHRcdGRpdi5jbGFzc0xpc3QuYWRkKCdob3RjdWUnKVxuXG5cdFx0XHRjb25zdCB3aWR0aCA9IFJVTk5JTkdfRElTUExBWV9XSURUSCAvIFNFQ09ORFNfT0ZfUlVOTklOR19ESVNQTEFZICogdGltZVxuXHRcdFx0ZGl2LnN0eWxlLmxlZnQgPSB3aWR0aCArICdweCdcblx0XHRcdGRpdi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBob3RjdWVDb2xvcnNbaG90Y3VlIC0gMV1cblx0XHRcdGRpdi5zdHlsZS5oZWlnaHQgPSBSVU5OSU5HX0RJU1BMQVlfSEVJR0hUICsgJ3B4J1xuXHRcdFx0aG90Y3VlQ29udGFpbmVyLmFwcGVuZENoaWxkKGRpdilcblx0XHRcdGhvdGN1ZXNbZGVjayAtIDFdW2hvdGN1ZSAtIDFdID0gdGltZVxuXG5cdFx0fVxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7bnVtYmVyfSBkZWNrIFxuXHRcdCAqIEByZXR1cm5zIHtESk1peC5Db250cm9sLkF1ZGlvUGxheWVyLkludGVyZmFjZX1cblx0XHQgKi9cblx0XHRmdW5jdGlvbiBnZXRBdWRpb0N0cmwoZGVjaykge1xuXHRcdFx0cmV0dXJuIGN0cmwuc2NvcGVbJ2F1ZGlvJyArIGRlY2tdXG5cdFx0fVxuXG5cdFx0bWlkaUN0cmwub24oJ1BMQVknLCAoeyBkZWNrIH0pID0+IHtcblx0XHRcdGNvbnN0IGF1ZGlvQ3RybCA9IGdldEF1ZGlvQ3RybChkZWNrKVxuXHRcdFx0bWlkaUN0cmwuc2V0QnV0dG9uSW50ZW5zaXR5KCdQTEFZJywgYXVkaW9DdHJsLmlzUGxheWluZygpID8gMSA6IDEyNywgZGVjaylcblx0XHRcdGF1ZGlvQ3RybC50b2dnbGVQbGF5KClcblx0XHR9KVxuXG5cdFx0bWlkaUN0cmwub24oJ0xPQUQnLCBhc3luYyAoeyBkZWNrIH0pID0+IHtcblx0XHRcdGxvYWRUcmFjayhkZWNrKVxuXHRcdH0pXG5cblx0XHRtaWRpQ3RybC5vbignQ1JPU1NfRkFERVInLCBhc3luYyAoeyB2ZWxvY2l0eSB9KSA9PiB7XG5cdFx0XHRjb25zdCBjcm9zc0ZhZGVyID0gbWFwKHZlbG9jaXR5KVxuXHRcdFx0Y3RybC5zZXREYXRhKHsgY3Jvc3NGYWRlciB9KVxuXHRcdFx0bWFzdGVyQ3Jvc3NGYWRlci5zZXRGYWRlckxldmVsKGNyb3NzRmFkZXIpXG5cdFx0fSlcblxuXHRcdG1pZGlDdHJsLm9uKCdMRVZFTCcsIGFzeW5jICh7IGRlY2ssIHZlbG9jaXR5IH0pID0+IHtcblx0XHRcdGNvbnN0IHZvbHVtZSA9IG1hcCh2ZWxvY2l0eSlcblx0XHRcdGdldEF1ZGlvQ3RybChkZWNrKS5zZXRWb2x1bWUodm9sdW1lKVxuXHRcdH0pXG5cblx0XHRtaWRpQ3RybC5vbignQlJPV1NFX1dIRUVMJywgYXN5bmMgKHsgdmVsb2NpdHkgfSkgPT4ge1xuXHRcdFx0aWYgKHZlbG9jaXR5ID09IDEpIHtcblx0XHRcdFx0ZmlsZUxpc3Quc2VsRG93bigpXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0ZmlsZUxpc3Quc2VsVXAoKVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRtaWRpQ3RybC5vbignRU5URVInLCBhc3luYyAoKSA9PiB7XG5cdFx0XHRmaWxlTGlzdC5lbnRlclNlbEZvbGRlcigpXG5cdFx0fSlcblxuXHRcdG1pZGlDdHJsLm9uKCdKT0dfV0hFRUwnLCAoeyBkZWNrLCB2ZWxvY2l0eSB9KSA9PiB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdKT0dfV0hFRUwnLCB7ZGVjaywgdmVsb2NpdHl9KVxuXHRcdFx0Y29uc3QgYXVkaW9DdHJsID0gZ2V0QXVkaW9DdHJsKGRlY2spXG5cdFx0XHRhdWRpb0N0cmwuc2Vlayh2ZWxvY2l0eSA9PSAxID8gMSA6IC0xKVxuXHRcdH0pXG5cblx0XHRtaWRpQ3RybC5vbignQ1VFJywgKHsgZGVjayB9KSA9PiB7XG5cdFx0XHRjb25zdCBhdWRpb0N0cmwgPSBnZXRBdWRpb0N0cmwoZGVjaylcblx0XHRcdGF1ZGlvQ3RybC5yZXNldCgpXG5cdFx0fSlcblxuXHRcdG1pZGlDdHJsLm9uKCdIT1RfQ1VFJywgKHsgZGVjaywga2V5IH0pID0+IHtcblx0XHRcdC8vY29uc29sZS5sb2coJ0hPVF9DVUUnLCB7IGRlY2ssIGtleSB9KVxuXHRcdFx0Y29uc3QgYXVkaW9DdHJsID0gZ2V0QXVkaW9DdHJsKGRlY2spXG5cdFx0XHRjb25zdCB0aW1lID0gYXVkaW9DdHJsLmdldEN1cnJlbnRUaW1lKClcblx0XHRcdC8vY29uc29sZS5sb2coJ2hvdGN1ZXMnLCBob3RjdWVzW2RlY2sgLSAxXSlcblx0XHRcdGNvbnN0IGhvdGN1ZVRpbWUgPSBob3RjdWVzW2RlY2sgLSAxXVtrZXkgLSAxXVxuXHRcdFx0aWYgKGhvdGN1ZVRpbWUgPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdGNyZWF0ZUhvdEN1ZShkZWNrLCBrZXksIHRpbWUpXG5cdFx0XHRcdG1pZGlDdHJsLnNldEJ1dHRvbkludGVuc2l0eSgnSE9UX0NVRScsIDEyNywgZGVjaywga2V5KVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGF1ZGlvQ3RybC5yZXNldChob3RjdWVUaW1lLCB0cnVlKVxuXHRcdFx0fVxuXG5cdFx0fSlcblxuXG5cdFx0bWlkaUN0cmwub24oJ1BGTCcsICh7IGRlY2sgfSkgPT4ge1xuXHRcdFx0aWYgKGRlY2sgPT0gMSkge1xuXHRcdFx0XHRjdWVDcm9zc0ZhZGVyLnNldEZhZGVyTGV2ZWwoMClcblx0XHRcdFx0bWlkaUN0cmwuc2V0QnV0dG9uSW50ZW5zaXR5KCdQRkwnLCAxLCAxKVxuXHRcdFx0XHRtaWRpQ3RybC5zZXRCdXR0b25JbnRlbnNpdHkoJ1BGTCcsIDAsIDIpXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Y3VlQ3Jvc3NGYWRlci5zZXRGYWRlckxldmVsKDEpXG5cdFx0XHRcdG1pZGlDdHJsLnNldEJ1dHRvbkludGVuc2l0eSgnUEZMJywgMCwgMSlcblx0XHRcdFx0bWlkaUN0cmwuc2V0QnV0dG9uSW50ZW5zaXR5KCdQRkwnLCAxLCAyKVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRtaWRpQ3RybC5vbignTUFTVEVSX0xFVkVMJywgKHsgdmVsb2NpdHkgfSkgPT4ge1xuXHRcdFx0Y29uc3QgbWFzdGVyVm9sdW1lID0gbWFwKHZlbG9jaXR5KVxuXHRcdFx0bWFzdGVyQ3Jvc3NGYWRlci5zZXRNYXN0ZXJMZXZlbChtYXN0ZXJWb2x1bWUpXG5cdFx0XHRjdHJsLnNldERhdGEoeyBtYXN0ZXJWb2x1bWUgfSlcblx0XHR9KVxuXG5cdFx0bWlkaUN0cmwub24oJ0NVRV9MRVZFTCcsICh7IHZlbG9jaXR5IH0pID0+IHtcblx0XHRcdGNvbnN0IGN1ZVZvbHVtZSA9IG1hcCh2ZWxvY2l0eSlcblx0XHRcdGN1ZUNyb3NzRmFkZXIuc2V0TWFzdGVyTGV2ZWwoY3VlVm9sdW1lKVxuXHRcdFx0Y3RybC5zZXREYXRhKHsgY3VlVm9sdW1lIH0pXG5cdFx0fSlcblxuXHRcdGFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnaW5pdCcpXG5cdFx0XHRjb25zdCBpbmZvID0gYXdhaXQgbWlkaUN0cmwucmVxdWVzdE1JRElBY2Nlc3MoKVxuXHRcdFx0Y3RybC5zZXREYXRhKGluZm8pXG5cdFx0fVxuXG5cblxuXHRcdC8qKkB0eXBlIHtCcmVpemJvdC5Db250cm9scy5GaWxlTGlzdC5JbnRlcmZhY2V9ICovXG5cdFx0Y29uc3QgZmlsZUxpc3QgPSBjdHJsLnNjb3BlLmZpbGVsaXN0XG5cblx0XHQvKipAdHlwZSB7REpNaXguQ29udHJvbC5BdWRpb1BsYXllci5JbnRlcmZhY2V9ICovXG5cdFx0Y29uc3QgYXVkaW8xID0gY3RybC5zY29wZS5hdWRpbzFcblxuXHRcdC8qKkB0eXBlIHtESk1peC5Db250cm9sLkF1ZGlvUGxheWVyLkludGVyZmFjZX0gKi9cblx0XHRjb25zdCBhdWRpbzIgPSBjdHJsLnNjb3BlLmF1ZGlvMlxuXG5cdFx0LyoqQHR5cGUge0FycmF5PEhUTUxFbGVtZW50Pn0gKi9cblx0XHRjb25zdCBydW5uaW5nQnVmZmVycyA9IFtjdHJsLnNjb3BlLnJ1bm5pbmdCdWZmZXIxLmdldCgwKSwgY3RybC5zY29wZS5ydW5uaW5nQnVmZmVyMi5nZXQoMCldXG5cblx0XHQvKipAdHlwZSB7QXJyYXk8SFRNTEVsZW1lbnQ+fSAqL1xuXHRcdGNvbnN0IGhvdGN1ZUNvbnRhaW5lcnMgPSBbY3RybC5zY29wZS5ob3RjdWVDb250YWluZXIxLmdldCgwKSwgY3RybC5zY29wZS5ob3RjdWVDb250YWluZXIyLmdldCgwKV1cblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHJ1bm5pbmdCdWZmZXIgXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IGNvbG9yIFxuXHRcdCAqIEByZXR1cm5zIFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGNyZWF0ZUNhbnZhcyhydW5uaW5nQnVmZmVyLCBjb2xvcikge1xuXHRcdFx0Y29uc29sZS5sb2coJ2NyZWF0ZUNhbnZhcycpXG5cdFx0XHRjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKVxuXHRcdFx0Y2FudmFzLndpZHRoID0gTUFYX0NBTlZBU19XSURUSFxuXHRcdFx0Y2FudmFzLmhlaWdodCA9IFJVTk5JTkdfRElTUExBWV9IRUlHSFRcblx0XHRcdHJ1bm5pbmdCdWZmZXIuYXBwZW5kQ2hpbGQoY2FudmFzKVxuXHRcdFx0Y29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJylcblx0XHRcdGN0eC5jbGVhclJlY3QoMCwgMCwgTUFYX0NBTlZBU19XSURUSCwgUlVOTklOR19ESVNQTEFZX0hFSUdIVClcblx0XHRcdGN0eC5maWxsU3R5bGUgPSBjb2xvclxuXHRcdFx0cmV0dXJuIGN0eFxuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7QXVkaW9CdWZmZXJ9IGF1ZGlvQnVmZmVyIFxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBjb2xvciBcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBkcmF3UnVubmluZ0J1ZmZlcihhdWRpb0J1ZmZlciwgcnVubmluZ0J1ZmZlciwgY29sb3IpIHtcblxuXHRcdFx0Y29uc29sZS5sb2coJ2J1ZmZlckxlbmd0aCcsIGF1ZGlvQnVmZmVyLmxlbmd0aClcblx0XHRcdGNvbnN0IHdpZHRoID0gTWF0aC5jZWlsKFJVTk5JTkdfRElTUExBWV9XSURUSCAqIGF1ZGlvQnVmZmVyLmR1cmF0aW9uIC8gU0VDT05EU19PRl9SVU5OSU5HX0RJU1BMQVkpXG5cdFx0XHRjb25zb2xlLmxvZygnd2lkdGgnLCB3aWR0aClcblxuXHRcdFx0Y29uc3QgZGF0YSA9IGF1ZGlvQnVmZmVyLmdldENoYW5uZWxEYXRhKDApXG5cdFx0XHRjb25zdCBzdGVwID0gTWF0aC5jZWlsKFNFQ09ORFNfT0ZfUlVOTklOR19ESVNQTEFZICogYXVkaW9CdWZmZXIuc2FtcGxlUmF0ZSAvIFJVTk5JTkdfRElTUExBWV9XSURUSClcblx0XHRcdGNvbnNvbGUubG9nKCdzdGVwJywgc3RlcClcblx0XHRcdGNvbnN0IGFtcCA9IFJVTk5JTkdfRElTUExBWV9IRUlHSFQgLyAyXG5cblx0XHRcdGxldCBjdHggPSBjcmVhdGVDYW52YXMocnVubmluZ0J1ZmZlciwgY29sb3IpXG5cdFx0XHRmb3IgKGxldCBpID0gMCwgayA9IDA7IGkgPCB3aWR0aDsgaSsrLCBrKyspIHtcblx0XHRcdFx0aWYgKGsgPT0gTUFYX0NBTlZBU19XSURUSCkge1xuXHRcdFx0XHRcdGN0eCA9IGNyZWF0ZUNhbnZhcyhydW5uaW5nQnVmZmVyLCBjb2xvcilcblx0XHRcdFx0XHRrID0gMFxuXHRcdFx0XHR9XG5cdFx0XHRcdGxldCBtaW4gPSAxLjBcblx0XHRcdFx0bGV0IG1heCA9IC0xLjBcblx0XHRcdFx0Zm9yIChsZXQgaiA9IDA7IGogPCBzdGVwOyBqKyspIHtcblx0XHRcdFx0XHRjb25zdCBkYXRudW0gPSBkYXRhWyhpICogc3RlcCkgKyBqXVxuXHRcdFx0XHRcdGlmIChkYXRudW0gPCBtaW4pXG5cdFx0XHRcdFx0XHRtaW4gPSBkYXRudW1cblx0XHRcdFx0XHRpZiAoZGF0bnVtID4gbWF4KVxuXHRcdFx0XHRcdFx0bWF4ID0gZGF0bnVtXG5cdFx0XHRcdH1cblx0XHRcdFx0Y3R4LmZpbGxSZWN0KGssICgxICsgbWluKSAqIGFtcCwgMSwgTWF0aC5tYXgoMSwgKG1heCAtIG1pbikgKiBhbXApKTtcblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHVwZGF0ZURpc3BsYXkoKSB7XG5cdFx0XHRpZiAoYXVkaW8xLmlzTG9hZGVkKCkpIHtcblx0XHRcdFx0dXBkYXRlVGltZShhdWRpbzEuZ2V0Q3VycmVudFRpbWUoKSwgMSlcblx0XHRcdH1cblx0XHRcdGlmIChhdWRpbzIuaXNMb2FkZWQoKSkge1xuXHRcdFx0XHR1cGRhdGVUaW1lKGF1ZGlvMi5nZXRDdXJyZW50VGltZSgpLCAyKVxuXHRcdFx0fVxuXHRcdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKHVwZGF0ZURpc3BsYXkpXG5cdFx0fVxuXG5cdFx0dXBkYXRlRGlzcGxheSgpXG5cblx0XHRjb25zdCBzb3VyY2UxID0gYXVkaW8xLmdldE91dHB1dE5vZGUoKVxuXHRcdGNvbnN0IHNvdXJjZTIgPSBhdWRpbzIuZ2V0T3V0cHV0Tm9kZSgpXG5cblx0XHRjb25zdCBtYXN0ZXJDcm9zc0ZhZGVyID0gYXVkaW9Ub29scy5jcmVhdGVDcm9zc0ZhZGVyV2l0aE1hc3RlckxldmVsKHNvdXJjZTEsIHNvdXJjZTIpXG5cblx0XHRjb25zdCBjdWVDcm9zc0ZhZGVyID0gYXVkaW9Ub29scy5jcmVhdGVDcm9zc0ZhZGVyV2l0aE1hc3RlckxldmVsKHNvdXJjZTEsIHNvdXJjZTIpXG5cdFx0Y3VlQ3Jvc3NGYWRlci5zZXRGYWRlckxldmVsKDEpXG5cblx0XHRjb25zdCBtZXJnZXIgPSBhdWRpb1Rvb2xzLmNyZWF0ZVN0ZXJlb01lcmdlcihtYXN0ZXJDcm9zc0ZhZGVyLmdldE91dHB1dE5vZGUoKSwgY3VlQ3Jvc3NGYWRlci5nZXRPdXRwdXROb2RlKCkpXG5cblx0XHRhdWRpb1Rvb2xzLmNyZWF0ZURlc3RpbmF0aW9uKDQsIG1lcmdlcilcblxuXHRcdGluaXQoKVxuXG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiLy9AdHMtY2hlY2tcbihmdW5jdGlvbiAoKSB7XG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0hUTUxDYW52YXNFbGVtZW50fSBidWZmZXJDYW52YXNcblx0ICogQHBhcmFtIHsodGltZTogbnVtYmVyKSA9PiB2b2lkfSBvblRpbWVVcGRhdGVcblx0ICovXG5cdGZ1bmN0aW9uIGNyZWF0ZUJ1ZmZlckRpc3BsYXkoYnVmZmVyQ2FudmFzLCBvblRpbWVVcGRhdGUpIHtcblx0XHRjb25zdCB7IHdpZHRoLCBoZWlnaHQgfSA9IGJ1ZmZlckNhbnZhc1xuXHRcdGNvbnNvbGUubG9nKHsgd2lkdGgsIGhlaWdodCB9KVxuXHRcdGNvbnN0IGJ1ZmZlckNhbnZhc0N0eCA9IGJ1ZmZlckNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG5cblx0XHRpZiAodHlwZW9mIG9uVGltZVVwZGF0ZSA9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHRidWZmZXJDYW52YXMub25jbGljayA9IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnb25jbGljaycsIGV2Lm9mZnNldFgpXG5cdFx0XHRcdGNvbnN0IHRpbWUgPSBldi5vZmZzZXRYIC8gd2lkdGggKiBhdWRpb0J1ZmZlci5kdXJhdGlvblxuXHRcdFx0XHRvblRpbWVVcGRhdGUodGltZSlcblx0XHRcdH1cblx0XHR9XG5cblx0XHRjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKVxuXHRcdGNhbnZhcy53aWR0aCA9IHdpZHRoXG5cdFx0Y2FudmFzLmhlaWdodCA9IGhlaWdodFxuXHRcdGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG5cblx0XHQvKipAdHlwZSB7QXVkaW9CdWZmZXJ9ICovXG5cdFx0bGV0IGF1ZGlvQnVmZmVyID0gbnVsbFxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gbG9hZCh1cmwpIHtcblx0XHRcdGF1ZGlvQnVmZmVyID0gYXdhaXQgJCQubWVkaWEuZ2V0QXVkaW9CdWZmZXIodXJsKVxuXHRcdFx0Y29uc29sZS5sb2coJ2R1cmF0aW9uJywgYXVkaW9CdWZmZXIuZHVyYXRpb24pXG5cdFx0XHQkJC5tZWRpYS5kcmF3QXVkaW9CdWZmZXIod2lkdGgsIGhlaWdodCAtIDEwLCBjdHgsIGF1ZGlvQnVmZmVyLCAnYmxhY2snKVxuXHRcdFx0dXBkYXRlKDApXG5cdFx0XHRyZXR1cm4gYXVkaW9CdWZmZXJcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge251bWJlcn0gYnVmZmVyVGltZSBcblx0XHQgKi9cblx0XHRmdW5jdGlvbiB1cGRhdGUoYnVmZmVyVGltZSkge1xuXHRcdFx0aWYgKGF1ZGlvQnVmZmVyKSB7XG5cdFx0XHRcdGJ1ZmZlckNhbnZhc0N0eC5jbGVhclJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodClcblx0XHRcdFx0YnVmZmVyQ2FudmFzQ3R4LmRyYXdJbWFnZShjYW52YXMsIDAsIDUpXG5cdFx0XHRcdGNvbnN0IGJveFdpZHRoID0gd2lkdGggKiBidWZmZXJUaW1lIC8gYXVkaW9CdWZmZXIuZHVyYXRpb25cblx0XHRcdFx0YnVmZmVyQ2FudmFzQ3R4LmZpbGxTdHlsZSA9ICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMzMpJ1xuXHRcdFx0XHRidWZmZXJDYW52YXNDdHguZmlsbFJlY3QoMCwgMCwgYm94V2lkdGgsIGhlaWdodClcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0bG9hZCxcblx0XHRcdHVwZGF0ZVxuXHRcdH1cblx0fVxuXG5cblx0JCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2F1ZGlvcGxheWVyJywge1xuXG5cdFx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwiaW5mb1xcXCI+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cdFx0PHN0cm9uZyBibi10ZXh0PVxcXCJuYW1lXFxcIj48L3N0cm9uZz5cXG5cXG5cdFx0PGJ1dHRvbiBibi1zaG93PVxcXCJzaG93UGxheVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblBsYXlcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCIgdGl0bGU9XFxcIlBsYXlcXFwiIGJuLWljb249XFxcImZhIGZhLXBsYXlcXFwiPlxcblx0XHQ8L2J1dHRvbj5cXG5cXG5cdFx0PGJ1dHRvbiBibi1zaG93PVxcXCJwbGF5aW5nXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uUGF1c2VcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCIgdGl0bGU9XFxcIlBhdXNlXFxcIiBibi1pY29uPVxcXCJmYSBmYS1wYXVzZVxcXCI+XFxuXHRcdDwvYnV0dG9uPlxcblxcblxcblxcblx0PC9kaXY+XFxuXFxuXHQ8ZGl2IGNsYXNzPVxcXCJ0b29sYmFyMlxcXCI+XFxuXHRcdDxpIGNsYXNzPVxcXCJmYXMgZmEtbGcgZmEtdm9sdW1lLWRvd24gdzMtdGV4dC1ibHVlIHZvbHVtZVxcXCI+PC9pPlxcblx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuc2xpZGVyXFxcIiBibi1kYXRhPVxcXCJ7bWluOiAwLCBtYXg6MSwgc3RlcDogMC4wMSwgb3JpZW50YXRpb246IFxcJ3ZlcnRpY2FsXFwnfVxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiaW5wdXQ6IG9uVm9sdW1lQ2hhbmdlXFxcIiBibi12YWw9XFxcInZvbHVtZVxcXCIgY2xhc3M9XFxcInZvbHVsbWVTbGlkZXJcXFwiPjwvZGl2Plxcblx0PC9kaXY+XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwiYnVmZmVyQ29udGFpbmVyXFxcIiBibi1zaG93PVxcXCJzaG93QnVmZmVyXFxcIj5cXG5cdDxjYW52YXMgYm4tYmluZD1cXFwiYnVmZmVyQ2FudmFzXFxcIiBjbGFzcz1cXFwiYnVmZmVyQ2FudmFzXFxcIiB3aWR0aD1cXFwiNDcwXFxcIiBoZWlnaHQ9XFxcIjEwMFxcXCI+XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwic2xpZGVyXFxcIj5cXG5cdDxzcGFuIGJuLXRleHQ9XFxcImdldFRpbWVJbmZvXFxcIj48L3NwYW4+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuc2xpZGVyXFxcIiBibi1kYXRhPVxcXCJ7bWF4OiBkdXJhdGlvbn1cXFwiIGJuLWV2ZW50PVxcXCJpbnB1dDogb25TbGlkZXJDaGFuZ2VcXFwiIGJuLXZhbD1cXFwiY3VyVGltZVxcXCI+XFxuXHQ8L2Rpdj5cXG5cXG48L2Rpdj5cXG5cXG5cIixcblxuXHRcdGRlcHM6IFsnYnJlaXpib3QucGFnZXInLCAnQXVkaW9Ub29scyddLFxuXG5cdFx0cHJvcHM6IHtcblx0XHRcdHNob3dCdWZmZXI6IGZhbHNlXG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlclxuXHRcdCAqIEBwYXJhbSB7REpNaXguU2VydmljZS5BdWRpb1Rvb2xzLkludGVyZmFjZX0gYXVkaW9Ub29sc1xuXHRcdCAqL1xuXHRcdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHBhZ2VyLCBhdWRpb1Rvb2xzKSB7XG5cdFx0XHRjb25zdCB7IHNob3dCdWZmZXIgfSA9IHRoaXMucHJvcHNcblxuXHRcdFx0Y29uc3QgZ2V0VGltZSA9ICQkLm1lZGlhLmdldEZvcm1hdGVkVGltZVxuXG5cdFx0XHQvKipAdHlwZSB7QXVkaW9CdWZmZXJ9ICovXG5cdFx0XHRsZXQgYXVkaW9CdWZmZXIgPSBudWxsXG5cblx0XHRcdGxldCBzdGFydFRpbWUgPSAwXG5cdFx0XHRsZXQgZWxhcHNlZFRpbWUgPSAwXG5cblx0XHRcdC8qKkB0eXBlIHtBdWRpb0J1ZmZlclNvdXJjZU5vZGV9ICovXG5cdFx0XHRsZXQgYXVkaW9CdWZmZXJTb3VyY2VOb2RlID0gbnVsbFxuXG5cdFx0XHRjb25zdCBhdWRpb0N0eCA9IGF1ZGlvVG9vbHMuZ2V0QXVkaW9Db250ZXh0KClcblxuXHRcdFx0Y29uc3QgZ2Fpbk5vZGUgPSBhdWRpb0N0eC5jcmVhdGVHYWluKClcblx0XHRcdGdhaW5Ob2RlLmdhaW4udmFsdWUgPSAwLjVcblxuXHRcdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0bmFtZTogJ05vIFRyYWNrIGxvYWRlZCcsXG5cdFx0XHRcdFx0dm9sdW1lOiAwLjUsXG5cdFx0XHRcdFx0ZHVyYXRpb246IDAsXG5cdFx0XHRcdFx0Y3VyVGltZTogMCxcblx0XHRcdFx0XHRwbGF5aW5nOiBmYWxzZSxcblx0XHRcdFx0XHRsb2FkZWQ6IGZhbHNlLFxuXHRcdFx0XHRcdHNob3dCdWZmZXIsXG5cdFx0XHRcdFx0Z2V0VGltZUluZm86IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHJldHVybiBgJHtnZXRUaW1lKHRoaXMuY3VyVGltZSwgdHJ1ZSl9IC8gJHtnZXRUaW1lKHRoaXMuZHVyYXRpb24pfWBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHNob3dQbGF5OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5sb2FkZWQgJiYgIXRoaXMucGxheWluZ1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRldmVudHM6IHtcblx0XHRcdFx0XHRvblZvbHVtZUNoYW5nZTogZnVuY3Rpb24gKGV2LCB2YWx1ZSkge1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Wb2x1bWVDaGFuZ2UnLCB2YWx1ZSlcblx0XHRcdFx0XHRcdGdhaW5Ob2RlLmdhaW4udmFsdWUgPSB2YWx1ZVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvblBsYXk6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHBsYXkoKVxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvblBhdXNlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRwYXVzZSgpXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdG9uU2xpZGVyQ2hhbmdlOiBmdW5jdGlvbiAoZXYsIHZhbHVlKSB7XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblNsaWRlckNoYW5nZScsIHZhbHVlKVxuXHRcdFx0XHRcdFx0Ly9hdWRpby5jdXJyZW50VGltZSA9IHZhbHVlXG5cdFx0XHRcdFx0XHRyZXNldCh2YWx1ZSwgdHJ1ZSlcblx0XHRcdFx0XHR9LFxuXG5cblx0XHRcdFx0fVxuXHRcdFx0fSlcblxuXG5cblx0XHRcdC8qKkB0eXBlIHtIVE1MQ2FudmFzRWxlbWVudH0gKi9cblx0XHRcdGNvbnN0IGJ1ZmZlckNhbnZhcyA9IGN0cmwuc2NvcGUuYnVmZmVyQ2FudmFzLmdldCgwKVxuXG5cdFx0XHRjb25zdCBidWZmZXJEaXNwbGF5ID0gY3JlYXRlQnVmZmVyRGlzcGxheShidWZmZXJDYW52YXMsICh0aW1lKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKHsgdGltZSB9KVxuXHRcdFx0XHQvL2F1ZGlvLmN1cnJlbnRUaW1lID0gdGltZVxuXHRcdFx0fSlcblxuXHRcdFx0bGV0IHBhdXNlRmVlZGJhY2sgPSBudWxsXG5cblx0XHRcdGZ1bmN0aW9uIHBsYXkoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdwbGF5JywgZWxhcHNlZFRpbWUpXG5cdFx0XHRcdGdhaW5Ob2RlLmdhaW4udmFsdWUgPSBjdHJsLm1vZGVsLnZvbHVtZVxuXHRcdFx0XHRhdWRpb0J1ZmZlclNvdXJjZU5vZGUgPSBhdWRpb0N0eC5jcmVhdGVCdWZmZXJTb3VyY2UoKVxuXHRcdFx0XHRhdWRpb0J1ZmZlclNvdXJjZU5vZGUuYnVmZmVyID0gYXVkaW9CdWZmZXJcblx0XHRcdFx0YXVkaW9CdWZmZXJTb3VyY2VOb2RlLm9uZW5kZWQgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25lbmRlZCcsIGN0cmwubW9kZWwucGxheWluZylcblxuXHRcdFx0XHRcdGlmIChjdHJsLm1vZGVsLnBsYXlpbmcpIHtcblx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHBsYXlpbmc6IGZhbHNlIH0pXG5cdFx0XHRcdFx0XHRlbGFwc2VkVGltZSA9IGF1ZGlvQnVmZmVyLmR1cmF0aW9uXG5cdFx0XHRcdFx0XHRlbHQudHJpZ2dlcigncGF1c2UnKVx0XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKHBhdXNlRmVlZGJhY2sgIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0cGF1c2VGZWVkYmFjaygpXG5cdFx0XHRcdFx0XHRwYXVzZUZlZWRiYWNrID0gbnVsbFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRhdWRpb0J1ZmZlclNvdXJjZU5vZGUuY29ubmVjdChnYWluTm9kZSlcblx0XHRcdFx0c3RhcnRUaW1lID0gYXVkaW9DdHguY3VycmVudFRpbWVcblx0XHRcdFx0YXVkaW9CdWZmZXJTb3VyY2VOb2RlLnN0YXJ0KDAsIGVsYXBzZWRUaW1lKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoeyBwbGF5aW5nOiB0cnVlIH0pXG5cdFx0XHRcdGVsdC50cmlnZ2VyKCdwbGF5aW5nJylcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgRkFERSA9IDAuMDFcblxuXHRcdFx0ZnVuY3Rpb24gcGF1c2UoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdwYXVzZScpXG5cdFx0XHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHBsYXlpbmc6IGZhbHNlIH0pXG5cdFx0XHRcdFx0ZWxhcHNlZFRpbWUgKz0gIGF1ZGlvQ3R4LmN1cnJlbnRUaW1lIC0gc3RhcnRUaW1lXG5cdFx0XHRcdFx0YXVkaW9CdWZmZXJTb3VyY2VOb2RlLnN0b3AoKVxuXHRcdFx0XHRcdGF1ZGlvQnVmZmVyU291cmNlTm9kZSA9IG51bGxcblx0XHRcdFx0XHRlbHQudHJpZ2dlcigncGF1c2UnKVxuXHRcdFx0XHRcdHBhdXNlRmVlZGJhY2sgPSByZXNvbHZlXG5cdFxuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXG5cblx0XHRcdHRoaXMuc2VlayA9IGZ1bmN0aW9uICh0aWNrcykge1xuXHRcdFx0XHRpZiAoY3RybC5tb2RlbC5sb2FkZWQgJiYgIWN0cmwubW9kZWwucGxheWluZykge1xuXHRcdFx0XHRcdGVsYXBzZWRUaW1lICs9IHRpY2tzICogMTEgLyAzNjBcblx0XHRcdFx0XHRlbGFwc2VkVGltZSA9IE1hdGgubWF4KDAsIGVsYXBzZWRUaW1lKVx0XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0YXN5bmMgZnVuY3Rpb24gcmVzZXQodGltZSA9IDAsIHJlc3RhcnQgPSBmYWxzZSkge1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdyZXNldCcsIHsgdGltZSwgcmVzdGFydCB9KVxuXHRcdFx0XHRjb25zdCB7IHBsYXlpbmcgfSA9IGN0cmwubW9kZWxcblx0XHRcdFx0aWYgKHBsYXlpbmcpIHtcblx0XHRcdFx0XHRhd2FpdCBwYXVzZSgpXG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxhcHNlZFRpbWUgPSB0aW1lXG5cdFx0XHRcdGlmIChyZXN0YXJ0ICYmIHBsYXlpbmcpIHtcblx0XHRcdFx0XHRwbGF5KClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnJlc2V0ID0gcmVzZXRcblxuXHRcdFx0dGhpcy5zZXRJbmZvID0gYXN5bmMgZnVuY3Rpb24gKGluZm8pIHtcblx0XHRcdFx0bGV0IHsgbXAzLCBuYW1lLCB1cmwgfSA9IGluZm9cblx0XHRcdFx0bGV0IHsgYXJ0aXN0LCB0aXRsZSB9ID0gbXAzXG5cdFx0XHRcdGlmICh0aXRsZSAhPSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRuYW1lID0gYCR7YXJ0aXN0fSAtICR7dGl0bGV9YFxuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnNvbGUubG9nKCduYW1lJywgbmFtZSlcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtuYW1lOiAnTG9hZGluZy4uLid9KVxuXHRcdFx0XHRhdWRpb0J1ZmZlciA9IGF3YWl0ICQkLm1lZGlhLmdldEF1ZGlvQnVmZmVyKHVybClcblx0XHRcdFx0Y29uc3QgZHVyYXRpb24gPSBhdWRpb0J1ZmZlci5kdXJhdGlvblxuXHRcdFx0XHRjdHJsLnNldERhdGEoeyBuYW1lLCBkdXJhdGlvbiwgbG9hZGVkOiB0cnVlIH0pXG5cdFx0XHRcdHJldHVybiBhdWRpb0J1ZmZlclxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmdldEN1cnJlbnRUaW1lID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRsZXQgY3VyVGltZSA9IGVsYXBzZWRUaW1lXG5cdFx0XHRcdGlmIChjdHJsLm1vZGVsLnBsYXlpbmcpIHtcblx0XHRcdFx0XHRjdXJUaW1lICs9IGF1ZGlvQ3R4LmN1cnJlbnRUaW1lIC0gc3RhcnRUaW1lXG5cdFx0XHRcdH1cblx0XHRcdFx0Y3RybC5zZXREYXRhKHsgY3VyVGltZSB9KVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdnZXRDdXJyZW50VGltZScsIGN1clRpbWUpXG5cdFx0XHRcdHJldHVybiBjdXJUaW1lXG5cdFx0XHR9XG5cblxuXHRcdFx0dGhpcy5nZXRPdXRwdXROb2RlID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gZ2Fpbk5vZGVcblx0XHRcdH1cblxuXG5cdFx0XHR0aGlzLmlzUGxheWluZyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGN0cmwubW9kZWwucGxheWluZ1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnNldFZvbHVtZSA9IGZ1bmN0aW9uICh2b2x1bWUpIHtcblx0XHRcdFx0Z2Fpbk5vZGUuZ2Fpbi52YWx1ZSA9IHZvbHVtZVxuXHRcdFx0XHRjdHJsLnNldERhdGEoeyB2b2x1bWUgfSlcblxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmlzTG9hZGVkID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5sb2FkZWRcblx0XHRcdH1cblxuXHRcdFx0dGhpcy50b2dnbGVQbGF5ID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRpZiAoY3RybC5tb2RlbC5wbGF5aW5nKSB7XG5cdFx0XHRcdFx0cGF1c2UoKVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdHBsYXkoKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZ2V0QXVkaW9CdWZmZXIgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBhdWRpb0J1ZmZlclxuXHRcdFx0fVxuXHRcdH1cblxuXG5cdH0pO1xuXG59KSgpO1xuXG5cblxuIiwiLy9AdHMtY2hlY2tcblxuJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ0F1ZGlvVG9vbHMnLCB7XG5cbiAgICBpbml0OiBmdW5jdGlvbigpIHtcblxuICAgICAgICBjb25zdCBhdWRpb0N0eCA9IG5ldyBBdWRpb0NvbnRleHQoKVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldEF1ZGlvQ29udGV4dCgpIHtcbiAgICAgICAgICAgIHJldHVybiBhdWRpb0N0eFxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0Q3VycmVudFRpbWUoKSB7XG4gICAgICAgICAgICByZXR1cm4gYXVkaW9DdHguY3VycmVudFRpbWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcbiAgICAgICAgICogQHBhcmFtIHtBdWRpb05vZGV9IHNvdXJjZTEgXG4gICAgICAgICAqIEBwYXJhbSB7QXVkaW9Ob2RlfSBzb3VyY2UyIFxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gY3JlYXRlU3RlcmVvTWVyZ2VyKHNvdXJjZTEsIHNvdXJjZTIpIHtcbiAgICAgICAgICAgIGNvbnN0IHNwbGl0dGVyMSA9IGF1ZGlvQ3R4LmNyZWF0ZUNoYW5uZWxTcGxpdHRlcigyKVxuICAgICAgICAgICAgc291cmNlMS5jb25uZWN0KHNwbGl0dGVyMSlcbiAgICAgICAgICAgIGNvbnN0IHNwbGl0dGVyMiA9IGF1ZGlvQ3R4LmNyZWF0ZUNoYW5uZWxTcGxpdHRlcigyKVxuICAgICAgICAgICAgc291cmNlMi5jb25uZWN0KHNwbGl0dGVyMilcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgbWVyZ2VyID0gYXVkaW9DdHguY3JlYXRlQ2hhbm5lbE1lcmdlcig0KVxuICAgICAgICAgICAgc3BsaXR0ZXIxLmNvbm5lY3QobWVyZ2VyLCAwLCAwKVxuICAgICAgICAgICAgc3BsaXR0ZXIxLmNvbm5lY3QobWVyZ2VyLCAxLCAxKVxuICAgICAgICAgICAgc3BsaXR0ZXIyLmNvbm5lY3QobWVyZ2VyLCAwLCAyKVxuICAgICAgICAgICAgc3BsaXR0ZXIyLmNvbm5lY3QobWVyZ2VyLCAxLCAzKSAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBtZXJnZXJcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcbiAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IGNoYW5uZWxDb3VudCBcbiAgICAgICAgICogQHBhcmFtIHtBdWRpb05vZGV9IGlucHV0Tm9kZSBcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGNyZWF0ZURlc3RpbmF0aW9uKGNoYW5uZWxDb3VudCwgaW5wdXROb2RlKSB7XG4gICAgICAgICAgICBjb25zdCBkZXN0ID0gYXVkaW9DdHguY3JlYXRlTWVkaWFTdHJlYW1EZXN0aW5hdGlvbigpXG4gICAgICAgICAgICBkZXN0LmNoYW5uZWxDb3VudCA9IGNoYW5uZWxDb3VudFxuICAgICAgICAgICAgY29uc3QgYXVkaW8gPSBuZXcgQXVkaW8oKVxuICAgICAgICAgICAgLy9hd2FpdCBhdWRpby5zZXRTaW5rSWQoYXVkaW9EZXZpY2VbMF0uZGV2aWNlSWQpXG4gICAgICAgICAgICBhdWRpby5zcmNPYmplY3QgPSBkZXN0LnN0cmVhbVxuICAgICAgICAgICAgaW5wdXROb2RlLmNvbm5lY3QoZGVzdClcbiAgICAgICAgICAgIGF1ZGlvLnBsYXkoKSAgICAgICAgICAgIFxuICAgICAgICB9XG5cblxuICAgICAgICAvKipcbiAgICAgICAgICogXG4gICAgICAgICAqIEBwYXJhbSB7QXVkaW9Ob2RlfSBzb3VyY2UxIFxuICAgICAgICAgKiBAcGFyYW0ge0F1ZGlvTm9kZX0gc291cmNlMiBcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGNyZWF0ZUNyb3NzRmFkZXJXaXRoTWFzdGVyTGV2ZWwoc291cmNlMSwgc291cmNlMikge1xuICAgICAgICAgICAgY29uc3QgZ2FpbjEgPSBhdWRpb0N0eC5jcmVhdGVHYWluKClcbiAgICAgICAgICAgIGdhaW4xLmdhaW4udmFsdWUgPSAwLjVcbiAgICAgICAgICAgIHNvdXJjZTEuY29ubmVjdChnYWluMSlcblxuICAgICAgICAgICAgY29uc3QgZ2FpbjIgPSBhdWRpb0N0eC5jcmVhdGVHYWluKClcbiAgICAgICAgICAgIGdhaW4yLmdhaW4udmFsdWUgPSAwLjVcbiAgICAgICAgICAgIHNvdXJjZTIuY29ubmVjdChnYWluMilcblxuICAgICAgICAgICAgY29uc3QgbWFzdGVyR2FpbiA9IGF1ZGlvQ3R4LmNyZWF0ZUdhaW4oKVxuICAgICAgICAgICAgbWFzdGVyR2Fpbi5nYWluLnZhbHVlID0gMC41XG5cbiAgICAgICAgICAgIGdhaW4xLmNvbm5lY3QobWFzdGVyR2FpbilcbiAgICAgICAgICAgIGdhaW4yLmNvbm5lY3QobWFzdGVyR2FpbilcblxuXG4gICAgICAgICAgICBmdW5jdGlvbiBzZXRGYWRlckxldmVsKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgZ2FpbjIuZ2Fpbi52YWx1ZSA9IE1hdGguY29zKCgxLjAgLSB2YWx1ZSkgKiAwLjUgKiBNYXRoLlBJKVxuICAgICAgICAgICAgICAgIGdhaW4xLmdhaW4udmFsdWUgPSBNYXRoLmNvcyh2YWx1ZSAqIDAuNSAqIE1hdGguUEkpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHNldE1hc3RlckxldmVsKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgbWFzdGVyR2Fpbi5nYWluLnZhbHVlID0gdmFsdWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc2V0RmFkZXJMZXZlbCxcbiAgICAgICAgICAgICAgICBzZXRNYXN0ZXJMZXZlbCxcbiAgICAgICAgICAgICAgICBnZXRPdXRwdXROb2RlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1hc3RlckdhaW5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjcmVhdGVTdGVyZW9NZXJnZXIsXG4gICAgICAgICAgICBjcmVhdGVEZXN0aW5hdGlvbixcbiAgICAgICAgICAgIGNyZWF0ZUNyb3NzRmFkZXJXaXRoTWFzdGVyTGV2ZWwsXG4gICAgICAgICAgICBnZXRBdWRpb0NvbnRleHQsXG4gICAgICAgICAgICBnZXRDdXJyZW50VGltZVxuICAgICAgICB9XG4gICAgfVxufSk7XG4iLCIvL0B0cy1jaGVja1xuXG5cbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdNSURJQ3RybCcsIHtcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChjb25maWcpIHtcblxuICAgICAgICBjb25zdCBCdG5JbnRlbnNpdHkgPSB7XG4gICAgICAgICAgICBNQVg6IDB4N0YsXG4gICAgICAgICAgICBNSU46IDB4MDEsXG4gICAgICAgICAgICBPRkY6IDB4MDAsXG4gICAgICAgICAgICBPTjogMHgwMVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWlkaUlucHV0TWFwcGluZyA9IFtcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnTUFTVEVSX0xFVkVMJywgY21kOiAweEJGLCBub3RlOiAwWDBBIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0NVRV9MRVZFTCcsIGNtZDogMHhCRiwgbm90ZTogMFgwQyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdDUk9TU19GQURFUicsIGNtZDogMHhCRiwgbm90ZTogMFgwOCB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdMRVZFTCcsIGNtZDogMHhCMCwgbm90ZTogMFgxNiwgZGVjazogMSB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdQSVRDSCcsIGNtZDogMHhCMCwgbm90ZTogMFgxOSwgZGVjazogMSB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdMRVZFTCcsIGNtZDogMHhCMSwgbm90ZTogMFgxNiwgZGVjazogMiB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdQSVRDSCcsIGNtZDogMHhCMSwgbm90ZTogMFgxOSwgZGVjazogMiB9LFxuXG4gICAgICAgICAgICB7IGFjdGlvbjogJ1NZTkMnLCBjbWQ6IDB4OTAsIG5vdGU6IDBYMDIsIGRlY2s6IDEsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0NVRScsIGNtZDogMHg5MCwgbm90ZTogMFgwMSwgZGVjazogMSwgdHlwZTogJ0JUTicgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnUExBWScsIGNtZDogMHg5MCwgbm90ZTogMFgwMCwgZGVjazogMSwgdHlwZTogJ0JUTicgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnUEZMJywgY21kOiAweDkwLCBub3RlOiAwWDFCLCBkZWNrOiAxLCB0eXBlOiAnQlROMicgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnSk9HVE9VQ0gnLCBjbWQ6IDB4OTAsIG5vdGU6IDBYMDYsIGRlY2s6IDEgfSxcblxuICAgICAgICAgICAgeyBhY3Rpb246ICdTWU5DJywgY21kOiAweDkxLCBub3RlOiAwWDAyLCBkZWNrOiAyLCB0eXBlOiAnQlROJyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdDVUUnLCBjbWQ6IDB4OTEsIG5vdGU6IDBYMDEsIGRlY2s6IDIsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ1BMQVknLCBjbWQ6IDB4OTEsIG5vdGU6IDBYMDAsIGRlY2s6IDIsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ1BGTCcsIGNtZDogMHg5MSwgbm90ZTogMFgxQiwgZGVjazogMiwgdHlwZTogJ0JUTjInIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0pPR1RPVUNIJywgY21kOiAweDkxLCBub3RlOiAwWDA2LCBkZWNrOiAyIH0sXG5cbiAgICAgICAgICAgIHsgYWN0aW9uOiAnTE9BRCcsIGNtZDogMHg5Riwgbm90ZTogMFgwMiwgZGVjazogMSB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdMT0FEJywgY21kOiAweDlGLCBub3RlOiAwWDAzLCBkZWNrOiAyIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0VOVEVSJywgY21kOiAweDlGLCBub3RlOiAwWDA2IH0sXG5cbiAgICAgICAgICAgIHsgYWN0aW9uOiAnSk9HX1dIRUVMJywgY21kOiAweEIwLCBub3RlOiAwWDA2LCBkZWNrOiAxIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0pPR19XSEVFTCcsIGNtZDogMHhCMSwgbm90ZTogMFgwNiwgZGVjazogMiB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdCUk9XU0VfV0hFRUwnLCBjbWQ6IDB4QkYsIG5vdGU6IDBYMDAgfSxcblxuICAgICAgICAgICAgeyBhY3Rpb246ICdIT1RfQ1VFJywgY21kOiAweDk0LCBub3RlOiAwWDAxLCBkZWNrOiAxLCBrZXk6IDEsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0hPVF9DVUUnLCBjbWQ6IDB4OTQsIG5vdGU6IDBYMDIsIGRlY2s6IDEsIGtleTogMiwgdHlwZTogJ0JUTicgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnSE9UX0NVRScsIGNtZDogMHg5NCwgbm90ZTogMFgwMywgZGVjazogMSwga2V5OiAzLCB0eXBlOiAnQlROJyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdIT1RfQ1VFJywgY21kOiAweDk0LCBub3RlOiAwWDA0LCBkZWNrOiAxLCBrZXk6IDQsIHR5cGU6ICdCVE4nIH0sXG5cbiAgICAgICAgICAgIHsgYWN0aW9uOiAnSE9UX0NVRScsIGNtZDogMHg5NSwgbm90ZTogMFgwMSwgZGVjazogMiwga2V5OiAxLCB0eXBlOiAnQlROJyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdIT1RfQ1VFJywgY21kOiAweDk1LCBub3RlOiAwWDAyLCBkZWNrOiAyLCBrZXk6IDIsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0hPVF9DVUUnLCBjbWQ6IDB4OTUsIG5vdGU6IDBYMDMsIGRlY2s6IDIsIGtleTogMywgdHlwZTogJ0JUTicgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnSE9UX0NVRScsIGNtZDogMHg5NSwgbm90ZTogMFgwNCwgZGVjazogMiwga2V5OiA0LCB0eXBlOiAnQlROJyB9LFxuXG5cbiAgICAgICAgICAgIHsgYWN0aW9uOiAnTE9PUF9BVVRPJywgY21kOiAweDk0LCBub3RlOiAwWDExLCBkZWNrOiAxLCBrZXk6IDEsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0xPT1BfQVVUTycsIGNtZDogMHg5NCwgbm90ZTogMFgxMiwgZGVjazogMSwga2V5OiAyLCB0eXBlOiAnQlROJyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdMT09QX0FVVE8nLCBjbWQ6IDB4OTQsIG5vdGU6IDBYMTMsIGRlY2s6IDEsIGtleTogMywgdHlwZTogJ0JUTicgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnTE9PUF9BVVRPJywgY21kOiAweDk0LCBub3RlOiAwWDE0LCBkZWNrOiAxLCBrZXk6IDQsIHR5cGU6ICdCVE4nIH0sXG5cbiAgICAgICAgICAgIHsgYWN0aW9uOiAnTE9PUF9BVVRPJywgY21kOiAweDk1LCBub3RlOiAwWDExLCBkZWNrOiAyLCBrZXk6IDEsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0xPT1BfQVVUTycsIGNtZDogMHg5NSwgbm90ZTogMFgxMiwgZGVjazogMiwga2V5OiAyLCB0eXBlOiAnQlROJyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdMT09QX0FVVE8nLCBjbWQ6IDB4OTUsIG5vdGU6IDBYMTMsIGRlY2s6IDIsIGtleTogMywgdHlwZTogJ0JUTicgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnTE9PUF9BVVRPJywgY21kOiAweDk1LCBub3RlOiAwWDE0LCBkZWNrOiAyLCBrZXk6IDQsIHR5cGU6ICdCVE4nIH0sXG5cbiAgICAgICAgICAgIHsgYWN0aW9uOiAnTE9PUF9NQU5VQUwnLCBjbWQ6IDB4OTQsIG5vdGU6IDBYMjEsIGRlY2s6IDEsIGtleTogMSwgdHlwZTogJ0JUTicgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnTE9PUF9NQU5VQUwnLCBjbWQ6IDB4OTQsIG5vdGU6IDBYMjIsIGRlY2s6IDEsIGtleTogMiwgdHlwZTogJ0JUTicgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnTE9PUF9NQU5VQUwnLCBjbWQ6IDB4OTQsIG5vdGU6IDBYMjMsIGRlY2s6IDEsIGtleTogMywgdHlwZTogJ0JUTicgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnTE9PUF9NQU5VQUwnLCBjbWQ6IDB4OTQsIG5vdGU6IDBYMjQsIGRlY2s6IDEsIGtleTogNCwgdHlwZTogJ0JUTicgfSxcblxuICAgICAgICAgICAgeyBhY3Rpb246ICdMT09QX01BTlVBTCcsIGNtZDogMHg5NSwgbm90ZTogMFgyMSwgZGVjazogMiwga2V5OiAxLCB0eXBlOiAnQlROJyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdMT09QX01BTlVBTCcsIGNtZDogMHg5NSwgbm90ZTogMFgyMiwgZGVjazogMiwga2V5OiAyLCB0eXBlOiAnQlROJyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdMT09QX01BTlVBTCcsIGNtZDogMHg5NSwgbm90ZTogMFgyMywgZGVjazogMiwga2V5OiAzLCB0eXBlOiAnQlROJyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdMT09QX01BTlVBTCcsIGNtZDogMHg5NSwgbm90ZTogMFgyNCwgZGVjazogMiwga2V5OiA0LCB0eXBlOiAnQlROJyB9LFxuXG4gICAgICAgICAgICB7IGFjdGlvbjogJ1NBTVBMRVInLCBjbWQ6IDB4OTQsIG5vdGU6IDBYMzEsIGRlY2s6IDEsIGtleTogMSwgdHlwZTogJ0JUTicgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnU0FNUExFUicsIGNtZDogMHg5NCwgbm90ZTogMFgzMiwgZGVjazogMSwga2V5OiAyLCB0eXBlOiAnQlROJyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdTQU1QTEVSJywgY21kOiAweDk0LCBub3RlOiAwWDMzLCBkZWNrOiAxLCBrZXk6IDMsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ1NBTVBMRVInLCBjbWQ6IDB4OTQsIG5vdGU6IDBYMzQsIGRlY2s6IDEsIGtleTogNCwgdHlwZTogJ0JUTicgfSxcblxuICAgICAgICAgICAgeyBhY3Rpb246ICdTQU1QTEVSJywgY21kOiAweDk1LCBub3RlOiAwWDMxLCBkZWNrOiAyLCBrZXk6IDEsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ1NBTVBMRVInLCBjbWQ6IDB4OTUsIG5vdGU6IDBYMzIsIGRlY2s6IDIsIGtleTogMiwgdHlwZTogJ0JUTicgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnU0FNUExFUicsIGNtZDogMHg5NSwgbm90ZTogMFgzMywgZGVjazogMiwga2V5OiAzLCB0eXBlOiAnQlROJyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdTQU1QTEVSJywgY21kOiAweDk1LCBub3RlOiAwWDM0LCBkZWNrOiAyLCBrZXk6IDQsIHR5cGU6ICdCVE4nIH0sXG5cbiAgICAgICAgXVxuXG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0QWN0aW9uRGVzYyhkYXRhKSB7XG4gICAgICAgICAgICBjb25zdCBbY21kLCBub3RlXSA9IGRhdGFcbiAgICAgICAgICAgIGZvciAoY29uc3QgZSBvZiBtaWRpSW5wdXRNYXBwaW5nKSB7XG4gICAgICAgICAgICAgICAgaWYgKGUuY21kID09IGNtZCAmJiBlLm5vdGUgPT0gbm90ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBudWxsXG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBldmVudHMgPSBuZXcgRXZlbnRFbWl0dGVyMigpXG5cbiAgICAgICAgLyoqQHR5cGUge01JRElBY2Nlc3N9ICovXG4gICAgICAgIGxldCBtaWRpQWNjZXNzID0gbnVsbFxuXG4gICAgICAgIC8qKkB0eXBlIHtNSURJSW5wdXR9ICovXG4gICAgICAgIGxldCBtaWRpSW4gPSBudWxsXG4gICAgICAgIC8qKkB0eXBlIHtNSURJT3V0cHV0fSAqL1xuICAgICAgICBsZXQgbWlkaU91dCA9IG51bGxcblxuXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIHJlcXVlc3RNSURJQWNjZXNzKCkge1xuICAgICAgICAgICAgbWlkaUFjY2VzcyA9IGF3YWl0IG5hdmlnYXRvci5yZXF1ZXN0TUlESUFjY2VzcygpXG4gICAgICAgICAgICBjb25zdCBtaWRpSW5wdXRzID0gW11cbiAgICAgICAgICAgIGZvciAoY29uc3QgeyBuYW1lLCBpZCB9IG9mIG1pZGlBY2Nlc3MuaW5wdXRzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICAgICAgbWlkaUlucHV0cy5wdXNoKHsgbGFiZWw6IG5hbWUsIHZhbHVlOiBpZCB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbWlkaU91dHB1dHMgPSBbXVxuICAgICAgICAgICAgZm9yIChjb25zdCB7IG5hbWUsIGlkIH0gb2YgbWlkaUFjY2Vzcy5vdXRwdXRzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICAgICAgbWlkaU91dHB1dHMucHVzaCh7IGxhYmVsOiBuYW1lLCB2YWx1ZTogaWQgfSlcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHsgbWlkaUlucHV0cywgbWlkaU91dHB1dHMgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2VsZWN0TUlESUlucHV0KHNlbGVjdGVkSWQpIHtcbiAgICAgICAgICAgIGlmIChtaWRpSW4pIHtcbiAgICAgICAgICAgICAgICBtaWRpSW4ub25taWRpbWVzc2FnZSA9IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgaW5wdXQgb2YgbWlkaUFjY2Vzcy5pbnB1dHMudmFsdWVzKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5wdXQuaWQgPT0gc2VsZWN0ZWRJZCkge1xuICAgICAgICAgICAgICAgICAgICBtaWRpSW4gPSBpbnB1dFxuICAgICAgICAgICAgICAgICAgICBtaWRpSW4ub25taWRpbWVzc2FnZSA9IG9uTWlkaU1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSAgICAgICAgICAgIFxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2VsZWN0TUlESURldmljZShzZWxlY3RlZElkKSB7XG4gICAgICAgICAgICBpZiAobWlkaUluKSB7XG4gICAgICAgICAgICAgICAgbWlkaUluLm9ubWlkaW1lc3NhZ2UgPSBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGlucHV0IG9mIG1pZGlBY2Nlc3MuaW5wdXRzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlucHV0LmlkID09IHNlbGVjdGVkSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbWlkaUluID0gaW5wdXRcbiAgICAgICAgICAgICAgICAgICAgbWlkaUluLm9ubWlkaW1lc3NhZ2UgPSBvbk1pZGlNZXNzYWdlXG5cbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBvdXRwdXQgb2YgbWlkaUFjY2Vzcy5vdXRwdXRzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob3V0cHV0Lm5hbWUgPT0gaW5wdXQubmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pZGlPdXQgPSBvdXRwdXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNlbGVjdE1JRElPdXRwdXQoc2VsZWN0ZWRJZCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBvdXRwdXQgb2YgbWlkaUFjY2Vzcy5vdXRwdXRzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICAgICAgaWYgKG91dHB1dC5pZCA9PSBzZWxlY3RlZElkKSB7XG4gICAgICAgICAgICAgICAgICAgIG1pZGlPdXQgPSBvdXRwdXRcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gY2xlYXJBbGxCdXR0b25zKCkge1xuICAgICAgICAgICAgaWYgKG1pZGlPdXQgPT0gbnVsbClcbiAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIGZvciAoY29uc3QgeyBjbWQsIG5vdGUsIHR5cGUgfSBvZiBtaWRpSW5wdXRNYXBwaW5nKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGUgPT0gJ0JUTicgfHwgdHlwZSA9PSAnQlROMicpIHtcbiAgICAgICAgICAgICAgICAgICAgbWlkaU91dC5zZW5kKFtjbWQsIG5vdGUsIHR5cGUgPT0gJ0JUTicgPyBCdG5JbnRlbnNpdHkuTUlOIDogQnRuSW50ZW5zaXR5Lk9GRl0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2V0QnV0dG9uSW50ZW5zaXR5KGFjdGlvbiwgaW50ZW5zaXR5LCBkZWNrLCBrZXkpIHtcbiAgICAgICAgICAgIGlmIChtaWRpT3V0ID09IG51bGwpXG4gICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGUgb2YgbWlkaUlucHV0TWFwcGluZykge1xuICAgICAgICAgICAgICAgIGxldCByZXQgPSAoZS5hY3Rpb24gPT0gYWN0aW9uKVxuICAgICAgICAgICAgICAgIGlmIChkZWNrICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICByZXQgJj0gKGUuZGVjayA9PSBkZWNrKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoa2V5ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICByZXQgJj0gKGUua2V5ID09IGtleSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHJldCkge1xuICAgICAgICAgICAgICAgICAgICBtaWRpT3V0LnNlbmQoW2UuY21kLCBlLm5vdGUsIGludGVuc2l0eV0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBvbk1pZGlNZXNzYWdlKGV2KSB7XG4gICAgICAgICAgICBjb25zdCBbY21kLCBub3RlLCB2ZWxvY2l0eV0gPSBldi5kYXRhXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdvbk1pZGlNZXNzYWdlJywgY21kLnRvU3RyaW5nKDE2KSwgbm90ZS50b1N0cmluZygxNiksIHZlbG9jaXR5KVxuICAgICAgICAgICAgY29uc3QgZGVzYyA9IGdldEFjdGlvbkRlc2MoZXYuZGF0YSlcblxuICAgICAgICAgICAgaWYgKGRlc2MgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgYWN0aW9uLCBkZWNrLCBrZXkgfSA9IGRlc2NcbiAgICAgICAgICAgICAgICBldmVudHMuZW1pdChhY3Rpb24sIHsgZGVjaywga2V5LCB2ZWxvY2l0eSB9KVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2VsZWN0TUlESUlucHV0LFxuICAgICAgICAgICAgc2VsZWN0TUlESU91dHB1dCxcbiAgICAgICAgICAgIHNlbGVjdE1JRElEZXZpY2UsXG4gICAgICAgICAgICBjbGVhckFsbEJ1dHRvbnMsXG4gICAgICAgICAgICBzZXRCdXR0b25JbnRlbnNpdHksXG4gICAgICAgICAgICByZXF1ZXN0TUlESUFjY2VzcyxcbiAgICAgICAgICAgIG9uOiBldmVudHMub24uYmluZChldmVudHMpLFxuICAgICAgICAgICAgQnRuSW50ZW5zaXR5XG4gICAgICAgIH1cbiAgICB9XG59KTtcbiJdfQ==
