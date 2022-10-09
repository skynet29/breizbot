// @ts-check

$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: [
		'breizbot.pager',
		'MIDICtrl',
		'AudioTools',
		'breizbot.appData',
		'breizbot.files',
		'breizbot.friends',
		'breizbot.playlists'
	],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {DJMix.Service.MIDICtrl.Interface} midiCtrl
	 * @param {DJMix.Service.AudioTools.Interface} audioTools
	 * @param {Breizbot.Services.AppData.Interface} appData
	 * @param {Breizbot.Services.Files.Interface} srvFiles
	 * @param {Breizbot.Services.Friends.Interface} srvFriends
	 * @param {Breizbot.Services.Playlists.Interface} srvPlaylists
	 */
	init: async function (elt, pager, midiCtrl, audioTools, appData, srvFiles, srvFriends, srvPlaylists) {

		const map = $$.util.mapRange(0, 127, 0, 1)

		const mapRate = $$.util.mapRange(0, 127, 0.92, 1.08)

		const waitDlg = $$.ui.waitDialog('Loading samplers...')

		const RUNNING_DISPLAY_WIDTH = 1200
		const RUNNING_DISPLAY_HEIGHT = 80
		const SECONDS_OF_RUNNING_DISPLAY = 10.0
		const MAX_CANVAS_WIDTH = 32000

		let settings = appData.getData()
		console.log('settings', settings)

		const audioCtx = audioTools.getAudioContext()

		/**@type {Array<{audioBuffer: AudioBuffer, value: number, label: string}>} */
		let samplersInfo = []


		/**@type {$$.FormDialogController} */
		let sampleChoiceDlg = null

		/**@type {DJMix.Service.AudioTools.CrossFaderWithMasterLevel} */
		let masterCrossFader = null

		/**@type {AudioBufferSourceNode} */
		let sampleBufferSource = null

		const ctrl = $$.viewController(elt, {
			data: {
				genres: ['All'],
				selGenre: 'All',
				sampleInfo: new Array(4).fill(null),
				loadingSongs: false,
				samplers: [0, 1, 2, 3],
				files: [],
				getFiles: function () {
					let files = this.files
					if (this.selGenre != 'All') {
						files = files.filter((f) => f.genre == this.selGenre)
					}
					if (this.searchFilter != '') {
						const regex = new RegExp(`\w*${this.searchFilter}\w*`, 'i')
						files = files.filter((f) => regex.test(f.artist) || regex.test(f.title))
					}
					return files
				},
				searchFilter: '',
				audioCtx,
				source1: null,
				selectedInput: 'default',
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

				},

				getSampleTitle: function (scope) {
					const sampleInfo = scope.$i
					return (sampleInfo != null) ? sampleInfo.label : 'No selection'
				}
			},
			events: {
				onToggleAnalyser: function() {
					getAudioCtrl(1).toggleAnayser()
					getAudioCtrl(2).toggleAnayser()
				},
				onStopSample: function() {
					if (sampleBufferSource != null) {
						sampleBufferSource.stop()
						sampleBufferSource = null
					}
				},
				onPlaySample: function () {
					const idx = $(this).index()
					playSample(idx)
				},
				onSampleChoice: async function (ev) {
					ev.preventDefault()
					const idx = $(this).index()
					//console.log('onSampleChoice', idx)
					const data = await sampleChoiceDlg.show()
					//console.log('data', data)
					ctrl.model.sampleInfo[idx] = samplersInfo[data.value]
					ctrl.update()
				},
				onStopPreview: function () {
					previewAudio.pause()
				},
				onPreview: function (ev, data) {
					console.log('preview', data)
					previewAudio.src = data.url
					previewAudio.play()
				},
				onClearSearch: function () {
					//console.log('onClearSearch')
					ctrl.setData({ searchFilter: '' })
				},
				onLoadingSongs: function () {
					//console.log('onLoadingSongs')
					ctrl.setData({ loadingSongs: true, files: [] })
				},
				onFileChange: function (ev, data) {
					console.log('onFileChange', data)
					let genres = {}
					for (const file of data.files) {
						if (file.genre) {
							if (genres[file.genre] != undefined) {
								genres[file.genre] += 1
							}
							else {
								genres[file.genre] = 1
							}
							
						}
					}
					genres = Object.entries(genres).map(([genre, nb]) => {
						return {label: `${genre} (${nb})`, value: genre}
					})
					genres.unshift({label: `All (${data.files.length})`, value:'All'})
					ctrl.setData({ files: data.files, loadingSongs: false, genres, selGenre: 'All' })
				},
				onSettings: function () {
					pager.pushPage('settings', {
						title: 'Settings',
						props: {
							data: settings
						},
						onReturn: async function (data) {
							console.log('settings', data)
							settings = data
							await appData.saveData(settings)
							laodSamplers()
						}
					})
				},
				onMasterVolumeChange: function (ev, value) {
					//console.log('onMasterVolumeChange', value)
					masterCrossFader.setMasterLevel(value)
				},
				onCueVolumeChange: function (ev, value) {
					cueCrossFader.setMasterLevel(value)
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
					selectMidiDevice(selectedId)
				}
			}
		})

		function playSample(idx) {
			//console.log('playSample', idx)
			const sampleInfo = ctrl.model.sampleInfo[idx]
			if (sampleInfo != null) {
				if (sampleBufferSource != null) {
					sampleBufferSource.stop()
				}
				sampleBufferSource = audioCtx.createBufferSource()
				sampleBufferSource.buffer = sampleInfo.audioBuffer
				sampleBufferSource.connect(masterCrossFader.getOutputNode())
				sampleBufferSource.start()
			}
			else {
				$.notify('No sample selected', 'error')
			}

		}



		async function laodSamplers() {
			if (settings.samplersFolder) {
				waitDlg.show()
				const files = await srvFiles.list(settings.samplersFolder, {
					filterExtension: 'mp3',
					filesOnly: true
				})
				//console.log('files', files)
				samplersInfo = []
				for (const file of files) {
					const url = srvFiles.fileUrl(settings.samplersFolder + file.name)
					const audioBuffer = await $$.media.getAudioBuffer(url)
					samplersInfo.push({
						audioBuffer,
						value: samplersInfo.length,
						label: file.name.replace('.mp3', '')
					})
				}

				sampleChoiceDlg = $$.formDialogController({
					title: 'Samples',
					template: { gulp_inject: './controls/sampleChoiceDlg.html' },
					data: {
						samplersInfo
					}
				})
				waitDlg.hide()
			}
		}

		function selectMidiDevice(selectedId) {
			midiCtrl.selectMIDIDevice(selectedId)
			midiCtrl.clearAllButtons()
			midiCtrl.setButtonIntensity('PFL', 1, 2)
		}

		const colors = ['red', 'green']

		async function loadTrack(deck) {
			console.log('loadTrack', deck)
			const audio = 'audio' + deck
			if (ctrl.model[audio] == true) {
				$.notify('A track is already loading', 'error')
				return
			}

			/**@type {DJMix.Control.AudioPlayer.Interface} */
			const player = ctrl.scope[audio]

			if (player.isPlaying()) {
				$.notify('Please stop playback before loading a track', 'error')
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
				const { audioBuffer, tempo } = await ctrl.scope[audio].setInfo(selFile)

				const width = RUNNING_DISPLAY_WIDTH / 2 * audioBuffer.duration
				hotcueContainer.style.width = width + 'px'
				hotcueContainer.style.height = RUNNING_DISPLAY_HEIGHT + 'px'

				createHotCue(deck, 1, 0)

				drawRunningBuffer(audioBuffer, deck, tempo)
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
			// const audioBuffer = getAudioCtrl(deck).getAudioBuffer()
			// const sampleIdx = Math.trunc(time * audioBuffer.sampleRate)
			// const value = audioBuffer.getChannelData(0)[sampleIdx]
			// console.log(`sample[${deck}, ${sampleIdx}] = ${value}`)
		}

		const hotcueColors = ['red', 'green', 'blue', 'orange']


		function getOffset(time) {
			return RUNNING_DISPLAY_WIDTH / SECONDS_OF_RUNNING_DISPLAY * time
		}

		/**
		 * 
		 * @param {number} offset 
		 * @returns {number}
		 */
		function getTimeFromOffset(offset) {
			return offset * SECONDS_OF_RUNNING_DISPLAY / RUNNING_DISPLAY_WIDTH
		}

		/**
		 * 
		 * @param {number} deck 
		 * @param {number} hotcue 
		 * @param {number} time 
		 */
		function createHotCue(deck, hotcue, time) {
			console.log('createHotCue', { deck, hotcue, time })

			deleteHotCue(deck, hotcue)
			const hotcueContainer = hotcueContainers[deck - 1]
			const div = document.createElement('div')
			div.classList.add('hotcue')

			const width = getOffset(time)
			div.style.left = width + 'px'
			div.style.backgroundColor = hotcueColors[hotcue - 1]
			div.style.height = RUNNING_DISPLAY_HEIGHT + 'px'
			hotcueContainer.appendChild(div)

			getAudioCtrl(deck).addHotcue(hotcue, time, div)

		}

		function deleteHotCue(deck, hotcue) {
			const audioCtrl = getAudioCtrl(deck)
			const info = audioCtrl.getHotcue(hotcue)
			if (info) {
				audioCtrl.deleteHotcue(hotcue)
				hotcueContainers[deck - 1].removeChild(info.div)
			}
		}

		function removeLoop(deck) {
			const hotcueContainer = hotcueContainers[deck - 1]
			$(hotcueContainer).find('.loop').remove()
		}

		function createLoop(deck, startTime, duration) {
			console.log('createLoop', { deck, startTime, duration })
			const hotcueContainer = hotcueContainers[deck - 1]
			$(hotcueContainer).find('.loop').remove()

			const div = document.createElement('div')
			div.classList.add('loop')

			const width = getOffset(startTime)
			div.style.left = width + 'px'
			div.style.width = (duration == 0) ? '2px' : getOffset(duration) + 'px'
			div.style.height = RUNNING_DISPLAY_HEIGHT + 'px'
			hotcueContainer.appendChild(div)

		}

		/**
		 * 
		 * @param {number} deck 
		 * @returns {DJMix.Control.AudioPlayer.Interface}
		 */
		function getAudioCtrl(deck) {
			return ctrl.scope['audio' + deck]
		}

		midiCtrl.on('MIDI_STATECHANGE', (ev) => {
			console.log('midiStateChange', ev)
			ctrl.setData({ midiInputs: midiCtrl.getMIDIInputs() })
		})

		midiCtrl.on('PLAY', ({ deck }) => {
			getAudioCtrl(deck).togglePlay()
		})

		midiCtrl.on('LOAD', async ({ deck }) => {
			loadTrack(deck)
		})

		midiCtrl.on('CROSS_FADER', async ({ velocity }) => {
			const crossFader = map(velocity)
			ctrl.setData({ crossFader })
			masterCrossFader.setFaderLevel(crossFader)
		})

		midiCtrl.on('SYNC', ({ deck }) => {
			const otherDeck = (deck == 1) ? 2 : 1
			const audioCtrl = getAudioCtrl(deck)
			const otherAudioCtrl = getAudioCtrl(otherDeck)
			const targetBpm = otherAudioCtrl.getBpm() * otherAudioCtrl.getPlaybackRate()

			const rate = targetBpm / audioCtrl.getBpm()
			audioCtrl.setPlaybackRate(rate)
			updateDisplayRate(deck, rate)
			//otherAudioCtrl.setPlaybackRate(1)
			midiCtrl.setButtonIntensity('SYNC', 127, deck)
			midiCtrl.setButtonIntensity('SYNC', 1, otherDeck)
		})

		function updateDisplayRate(deck, rate) {
			const runningBuffer = runningBuffers[deck - 1]
			const transform = `scale(${1 / rate}, 1)`
			for (const cv of runningBuffer.querySelectorAll('canvas')) {
				cv.style.transform = transform
			}

			const hotcueContainer = hotcueContainers[deck - 1]
			hotcueContainer.style.transform = transform
		}

		midiCtrl.on('PITCH', ({ deck, velocity }) => {
			const rate = mapRate(velocity)
			midiCtrl.setButtonIntensity('SYNC', 1, 1)
			midiCtrl.setButtonIntensity('SYNC', 1, 2)
			updateDisplayRate(deck, rate)
			getAudioCtrl(deck).setPlaybackRate(rate)
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


		midiCtrl.on('JOG_WHEEL', ({ deck, velocity }) => {
			//console.log('JOG_WHEEL', {deck, velocity})
			let offset = SECONDS_OF_RUNNING_DISPLAY / RUNNING_DISPLAY_WIDTH
			if (velocity == 127) {
				offset *= -1
			}
			getAudioCtrl(deck).seek(offset)
		})

		midiCtrl.on('JOGTOUCH_RELEASE', ({ deck }) => {
			getAudioCtrl(deck).jogTouch(false)
		})

		midiCtrl.on('JOGTOUCH_PRESS', ({ deck }) => {
			getAudioCtrl(deck).jogTouch(true)
		})

		midiCtrl.on('CUE', ({ deck }) => {
			const audioCtrl = getAudioCtrl(deck)

			if (audioCtrl.isPlaying()) {
				audioCtrl.jumpToHotcue(1, false)

			}
			else {
				const time = audioCtrl.getCurrentTime()
				createHotCue(deck, 1, time)
			}
		})

		midiCtrl.on('LOOP_AUTO', ({ deck, key }) => {
			const audioCtrl = getAudioCtrl(deck)
			let startTime = audioCtrl.getCurrentTime()
			const duration = 60 / audioCtrl.getBpm() * (1 << (key - 1))
			startTime = audioCtrl.autoLoopActivate(key, startTime, duration)
			if (startTime == 0) {
				removeLoop(deck)
			}
			else {
				createLoop(deck, startTime, duration)
			}
		})

		midiCtrl.on('SAMPLER', ({ deck, key }) => {
			playSample(key - 1)
		})

		midiCtrl.on('LOOP_MANUAL', ({ deck, key }) => {
			const audioCtrl = getAudioCtrl(deck)
			if (key == 1) {
				const startTime = audioCtrl.getCurrentTime()
				audioCtrl.setStartLoopTime(startTime)
				createLoop(deck, startTime, 0)
			}
			else if (key == 2) {
				const startTime = audioCtrl.getStartLoopTime()
				const endTime = audioCtrl.getCurrentTime()
				audioCtrl.setEndLoopTime(endTime)
				createLoop(deck, startTime, endTime - startTime)
			}
			else if (key == 3) {
				audioCtrl.clearLoop()
				removeLoop(deck)
			}
		})

		midiCtrl.on('HOT_CUE', ({ deck, key }) => {
			//console.log('HOT_CUE', { deck, key })
			const audioCtrl = getAudioCtrl(deck)
			if (key == 1) {
				audioCtrl.toggleHotcueDeleteMode()
			}
			else {

				if (audioCtrl.isHotcueDeleteMode()) {
					deleteHotCue(deck, key)
				}
				else {
					const info = audioCtrl.getHotcue(key)

					if (info == undefined) {
						const time = audioCtrl.getCurrentTime()
						createHotCue(deck, key, time)
					}
					else {
						audioCtrl.jumpToHotcue(key, true)
					}
				}
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

			//console.log('playlists', playlists)
			ctrl.setData(info)
			if (info.midiInputs.length > 1) {
				const selectedInput = info.midiInputs[1].value
				ctrl.setData({ selectedInput })
				selectMidiDevice(selectedInput)
			}
			laodSamplers()
		}



		/**@type {DJMix.Control.FileList.Interface} */
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
		 * @returns 
		 */
		function createCanvas(runningBuffer) {
			console.log('createCanvas')
			const canvas = document.createElement('canvas')
			canvas.width = MAX_CANVAS_WIDTH
			canvas.height = RUNNING_DISPLAY_HEIGHT
			runningBuffer.appendChild(canvas)
			const ctx = canvas.getContext('2d')
			ctx.clearRect(0, 0, MAX_CANVAS_WIDTH, RUNNING_DISPLAY_HEIGHT)

			return ctx
		}

		/**
		 * 
		 * @param {AudioBuffer} audioBuffer 
		 * @param {number} deck 
		 * @param {Breizbot.Services.BeatDetector.BeatInfo} beatInfo
		 */
		function drawRunningBuffer(audioBuffer, deck, beatInfo) {

			console.log('bufferLength', audioBuffer.length)
			const beatInterval = Math.trunc(getOffset(60 / beatInfo.bpm))
			console.log('beatInterval', beatInterval)
			const beatOffset = Math.trunc(getOffset(beatInfo.offset))
			console.log('beatOffset', beatOffset)
			console.log('duration', audioBuffer.duration)

			const runningBuffer = runningBuffers[deck - 1]
			const color = colors[deck - 1]

			const width = Math.floor(RUNNING_DISPLAY_WIDTH * audioBuffer.duration / SECONDS_OF_RUNNING_DISPLAY)
			console.log('width', width)

			const data = audioBuffer.getChannelData(0)
			const step = Math.floor(SECONDS_OF_RUNNING_DISPLAY * audioBuffer.sampleRate / RUNNING_DISPLAY_WIDTH)
			console.log('step', step)
			const amp = RUNNING_DISPLAY_HEIGHT / 2

			let ctx = createCanvas(runningBuffer)
			for (let i = 0, k = 0; i < width; i++, k++) {
				if (k == MAX_CANVAS_WIDTH) {
					ctx = createCanvas(runningBuffer)
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

				ctx.fillStyle = color
				ctx.fillRect(k, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));

				if ((Math.abs(i - beatOffset) % beatInterval) == 0) {
					ctx.fillStyle = 'black'
					ctx.fillRect(k, 0, 1, RUNNING_DISPLAY_HEIGHT)
				}
			}

		}

		function updateDisplay() {
			if (audio1.isLoaded()) {
				updateTime(audio1.getRealTime(), 1)
			}
			if (audio2.isLoaded()) {
				updateTime(audio2.getRealTime(), 2)
			}
			requestAnimationFrame(updateDisplay)
		}

		updateDisplay()

		const source1 = audio1.getOutputNode()
		const source2 = audio2.getOutputNode()

		const previewAudio = new Audio()
		previewAudio.volume = 1
		const previewSource = audioCtx.createMediaElementSource(previewAudio)

		ctrl.setData({ source1, source2 })

		masterCrossFader = audioTools.createCrossFaderWithMasterLevel(source1, source2)

		const cueCrossFader = audioTools.createCrossFaderWithMasterLevel(source1, source2)
		cueCrossFader.setFaderLevel(1)

		previewSource.connect(cueCrossFader.getOutputNode())

		const merger = audioTools.createStereoMerger(masterCrossFader.getOutputNode(), cueCrossFader.getOutputNode())

		const dest = audioTools.createDestination(4, merger)


		init()

	}


});




