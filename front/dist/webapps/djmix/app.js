// @ts-check

$$.control.registerControl('rootPage', {

	template: "<div class=\"top\">\n    <div class=\"midi\">\n        <div>MIDI Device</div>\n        <div bn-control=\"brainjs.combobox\" bn-data=\"{items: midiInputs}\" bn-val=\"selectedInput\"\n            bn-event=\"comboboxchange: onMidiInputChange\">\n        </div>\n\n    </div>\n    <div class=\"balance\">\n        <label>Left</label>\n        <div bn-control=\"brainjs.slider\" bn-data=\"{min: 0, max: 1, step: 0.01, showRange: false}\"\n            bn-event=\"input: onCrossFaderChange\" bn-val=\"crossFader\"></div>\n        <label>Right</label>\n    </div>\n    <div>\n        <button class=\"w3-button w3-blue\" bn-event=\"click: onLoad\" data-audio=\"1\">LOAD 1\n            <i class=\"fa fa-spinner fa-pulse\" bn-show=\"audio1\"></i>\n        </button>\n        <button class=\"w3-button w3-blue\" bn-event=\"click: onLoad\" data-audio=\"2\">LOAD 2\n            <i class=\"fa fa-spinner fa-pulse\" bn-show=\"audio2\"></i>\n        </button>\n        <button class=\"w3-button w3-blue\" bn-icon=\"fas fa-cog\" title=\"Settings\" bn-event=\"click: onSettings\"></button>\n\n    </div>\n\n</div>\n<div class=\"visualizer\">\n    <div class=\"runningBufferContainer\" bn-style=\"runningBufferContainerStyle\">\n        <div class=\"runningBuffer\" bn-bind=\"runningBuffer1\"></div>\n        <div class=\"zeroTime\" bn-style=\"zeroTimeStyle\"></div>\n        <div class=\"hotcueContainer\" bn-style=\"hotcueContainerStyle\" bn-bind=\"hotcueContainer1\"></div>\n    </div>\n</div>\n<div class=\"visualizer\">\n    <div class=\"runningBufferContainer\" bn-style=\"runningBufferContainerStyle\">\n        <div class=\"runningBuffer\" bn-bind=\"runningBuffer2\"></div>\n        <div class=\"zeroTime\" bn-style=\"zeroTimeStyle\"></div>\n        <div class=\"hotcueContainer\" bn-bind=\"hotcueContainer2\"></div>\n    </div>\n</div>\n\n<div class=\"center\">\n    <div bn-control=\"audioplayer\" bn-iface=\"audio1\" data-deck=\"1\"></div>\n    <div class=\"mixer\">\n        <div bn-control=\"brainjs.audiopeakmeter\" bn-data=\"{audioCtx, sourceNode: source1}\"></div>\n        <div class=\"toolbar2\">\n            <span>MASTER</span>\n            <div bn-control=\"brainjs.slider\" bn-data=\"{min: 0, max:1, step: 0.01, orientation: \'vertical\'}\"\n                bn-event=\"input: onMasterVolumeChange\" bn-val=\"masterVolume\" class=\"volulmeSlider\"></div>\n        </div>\n        <div class=\"toolbar2\">\n            <span>CUE</span>\n            <div bn-control=\"brainjs.slider\" bn-data=\"{min: 0, max:1, step: 0.01, orientation: \'vertical\'}\"\n                bn-event=\"input: onCueVolumeChange\" bn-val=\"cueVolume\" class=\"volulmeSlider\"></div>\n        </div>\n        <div bn-control=\"brainjs.audiopeakmeter\" bn-data=\"{audioCtx, sourceNode: source2}\"></div>\n    </div>\n\n    <div bn-control=\"audioplayer\" bn-iface=\"audio2\" data-deck=\"2\"></div>\n</div>\n\n<div class=\"bottom\">\n    <div class=\"left\">\n        <form bn-event=\"submit: onSearch\">\n            <input type=\"text\" placeholder=\"Search...\" name=\"value\">\n            <button type=\"button\" bn-icon=\"fas fa-times\" bn-event=\"click: onClearSearch\"></button>\n        </form>\n        <div bn-control=\"tree\" bn-event=\"filechange: onFileChange, loading: onLoadingSongs\"></div>\n    </div>\n    <div class=\"laodingPanel\" bn-show=\"loadingSongs\">\n        <i class=\"fa fa-spinner fa-pulse\" ></i>\n        <span>Loading...</span>\n    </div>\n    <div bn-control=\"filelist\" bn-data=\"{files: getFiles}\" bn-iface=\"filelist\" bn-show=\"!loadingSongs\"></div>\n</div>\n\n",

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

		const RUNNING_DISPLAY_WIDTH = 1300
		const RUNNING_DISPLAY_HEIGHT = 80
		const SECONDS_OF_RUNNING_DISPLAY = 10.0
		const MAX_CANVAS_WIDTH = 32000

		let settings = appData.getData()
		console.log('settings', settings)

		const audioCtx = audioTools.getAudioContext()


		const ctrl = $$.viewController(elt, {
			data: {
				loadingSongs: false,
				files: [],
				getFiles: function() {
					if (this.searchFilter == '') {
						return this.files
					}
					const regex = new RegExp(`\w*${this.searchFilter}\w*`, 'i')
					return this.files.filter((f) => regex.test(f.artist) || regex.test(f.title))
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

				}
			},
			events: {
				onClearSearch: function() {
					//console.log('onClearSearch')
					$(this).closest('form').setFormData({value: ''})
					ctrl.setData({searchFilter: ''})
				},
				onLoadingSongs: function() {
					//console.log('onLoadingSongs')
					ctrl.setData({loadingSongs: true, files: []})
				},
				onSearch: function(ev) {
					ev.preventDefault()
					const data = $(this).getFormData()
					//console.log('onSearch', data)
					ctrl.setData({searchFilter: data.value})
				},
				onFileChange: function(ev, data) {
					//console.log('onFileChange', data)
					ctrl.setData({files: data.files, loadingSongs: false})
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
					masterCrossFader.setMasterLevel(value)
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

		async function laodSamplers() {
			if (settings.samplersFolder) {
				waitDlg.show()
				const files = await srvFiles.list(settings.samplersFolder, {
					filterExtension: 'mp3',
					filesOnly: true
				})
				console.log('files', files)
				const samplersInfo = []
				for (const file of files) {
					const url = srvFiles.fileUrl(settings.samplersFolder + file.name)
					const audioBuffer = await $$.media.getAudioBuffer(url)
					samplersInfo.push({
						audioBuffer,
						value: samplersInfo.length,
						label: file.name.replace('.mp3', '')
					})
				}
				getAudioCtrl(1).setSamplers(samplersInfo)
				getAudioCtrl(2).setSamplers(samplersInfo)
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

		midiCtrl.on('SYNC', ({deck}) => {
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
			getAudioCtrl(deck).playSample(key)
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

		ctrl.setData({ source1, source2 })

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


	function sortFiles(files) {
		files.sort((a, b) => {
			return a.artist.localeCompare(b.artist)
		})
	}

	function sortFilesByGenre(files) {
		files.sort((a, b) => {
			const genre1 = a.genre || 'WWWW'
			const genre2 = b.genre || 'WWWW'
			let ret = genre1.localeCompare(genre2)
			if (ret == 0) {
				ret = a.artist.localeCompare(b.artist)
			}
			return ret
		})
	}


	$$.control.registerControl('filelist', {
		deps: ['breizbot.files'],
		props: {
			files: []
		},

		template: "<div class=\"scrollPanel\">\n	<table class=\"w3-table-all w3-hoverable w3-small\">\n		<thead>\n			<tr>\n				<th class=\"sortedCol\" bn-event=\"click: onSortArtist\">\n					<i class=\"fas fa-sort-down\" bn-show=\"isSortedByArtist\"></i>\n					<span>Arist</span>\n				</th>\n				<th>Title</th>\n				<th class=\"sortedCol\" bn-event=\"click: onSortGenre\">\n					<i class=\"fas fa-sort-down\" bn-show=\"isSortedByGenre\"></i>\n					<span>Genre</span>\n				</th>\n				<th>Duration</th>\n				<th>BPM</th>\n			</tr>\n		</thead>\n		<tbody bn-each=\"files\" bn-iter=\"f\" bn-lazzy=\"10\" bn-bind=\"files\" bn-event=\"click.item: onItemClick\">\n			<tr class=\"item\">\n				<td bn-text=\"$scope.f.artist\"></td>\n				<td bn-text=\"$scope.f.title\"></td>\n				<td bn-text=\"$scope.f.genre\"></td>\n				<td bn-text=\"getDuration\"></td>\n				<td bn-text=\"$scope.f.bpm\"></td>\n			</tr>\n		</tbody>\n	</table>\n\n</div>",

		/**
		 * 
		 * @param {*} elt 
		 * @param {Breizbot.Services.Files.Interface} srvFiles 
		 */
		init: function (elt, srvFiles) {


			let {
				files
			} = this.props

			//sortFiles(files)

			const ctrl = $$.viewController(elt, {

				data: {
					files,
					sortField: '',

					isSortedByArtist: function() {
						return this.sortField == 'artist'
					},
					isSortedByGenre: function() {
						return this.sortField == 'genre'
					},

					getDuration: function (scope) {
						const { length } = scope.f
						return (length) ? $$.media.getFormatedTime(length) : ''
					}
				},
				events: {

					onSortArtist: function() {
						sortFiles(ctrl.model.files)
						ctrl.model.sortField = 'artist'
						ctrl.update()

					},

					onSortGenre: function() {
						sortFilesByGenre(ctrl.model.files)
						ctrl.model.sortField = 'genre'
						ctrl.update()

					},

					onItemClick: function (ev) {
						ev.stopPropagation()

						const idx = $(this).index()
						//console.log('idx', idx)
						const info = ctrl.model.files[idx]
						//console.log('info', info)
						$(this).closest('tbody').find('.active').removeClass('active')
						$(this).addClass('active')

						const data = {
							fileName: info.name,
							rootDir: ctrl.model.rootDir,
							isImage: info.isImage,
							mp3: info.mp3
						}

						elt.trigger('fileclick', data)
					}

				}
			})

			/**@type {JQuery<HTMLElement>} */
			const fileElt = ctrl.scope.files

			this.setData = function (data) {
				//console.log('setData', data)
				if (data.files) {
					//sortFiles(data.files)
					ctrl.setData({ files: data.files, sortField: '' })
					fileElt.find('.item').eq(0).addClass('active')
				}

			}

			this.selUp = function () {
				const selElt = fileElt.find('.active')
				const idx = selElt.index()
				//console.log('selUp', idx)
				if (idx > 0) {
					selElt.removeClass('active')
					const items = fileElt.find('.item')
					items.eq(idx - 1).addClass('active')
					if (idx - 1 > 0) {
						items.eq(idx - 2).get(0).scrollIntoViewIfNeeded()
					}
					else {
						items.eq(idx - 1).get(0).scrollIntoViewIfNeeded()
					}
					//selElt.get(0).scrollIntoView()
				}
			}

			this.selDown = function () {
				const selElt = fileElt.find('.active')
				const idx = selElt.index()
				//console.log('selDown', idx)
				if (idx < ctrl.model.files.length - 1) {
					selElt.removeClass('active')
					fileElt.find('.item').eq(idx + 1).addClass('active').get(0).scrollIntoViewIfNeeded(false)
				}
			}

			this.getSelFile = function () {
				const idx = fileElt.find('.active').index()
				//console.log('idx', idx)
				return (idx < 0) ? null : ctrl.model.files[idx]

			}

		}
	});

})();

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

		template: "<div class=\"toolbar\">\n\n	<strong bn-text=\"name\"></strong>\n	<div bn-show=\"loaded\">BPM: <strong bn-text=\"getBpm\"></strong></div>\n\n\n	<div>\n		<button bn-show=\"showPlay\" bn-event=\"click: onPlay\" class=\"w3-btn w3-blue w3-padding-small\" title=\"Play\" bn-icon=\"fa fa-play\">\n		</button>\n\n		<button bn-show=\"playing\" bn-event=\"click: onPause\" class=\"w3-btn w3-blue w3-padding-small\" title=\"Pause\" bn-icon=\"fa fa-pause\">\n		</button>\n\n	</div>\n\n</div>\n\n\n</div>\n\n<div class=\"bufferContainer\" bn-show=\"showBuffer\">\n	<canvas bn-bind=\"bufferCanvas\" class=\"bufferCanvas\" width=\"470\" height=\"100\">\n</div>\n\n<div class=\"content\">\n	<div class=\"samplers\">\n		<div class=\"samplerPlayer\">\n			<button class=\"w3-button w3-blue w3-padding-small\" bn-icon=\"fa fa-play\"\n				bn-event=\"click: onPlaySampler\"></button>\n			<div bn-control=\"brainjs.combobox\" bn-data=\"{items: samplers}\"></div>\n		</div>\n		<div class=\"samplerPlayer\">\n			<button class=\"w3-button w3-blue w3-padding-small\" bn-icon=\"fa fa-play\"\n				bn-event=\"click: onPlaySampler\"></button>\n			<div bn-control=\"brainjs.combobox\" bn-data=\"{items: samplers}\"></div>\n		</div>\n		<div class=\"samplerPlayer\">\n			<button class=\"w3-button w3-blue w3-padding-small\" bn-icon=\"fa fa-play\"\n				bn-event=\"click: onPlaySampler\"></button>\n			<div bn-control=\"brainjs.combobox\" bn-data=\"{items: samplers}\"></div>\n		</div>\n		<div class=\"samplerPlayer\">\n			<button class=\"w3-button w3-blue w3-padding-small\" bn-icon=\"fa fa-play\"\n				bn-event=\"click: onPlaySampler\"></button>\n			<div bn-control=\"brainjs.combobox\" bn-data=\"{items: samplers}\"></div>\n		</div>\n	</div>\n	<div class=\"toolbar2\">\n		<span>PITCH &#177 8%</span>\n		<div bn-control=\"brainjs.slider\" bn-data=\"{min: 0.92, max:1.08, step: 0.01, orientation: \'vertical\', showRange: false}\"\n			bn-event=\"input: onPitchChange\" bn-val=\"pitch\" class=\"volulmeSlider\"></div>\n	</div>\n\n	<div class=\"toolbar2\">\n		<span>LEVEL</span>\n		<div bn-control=\"brainjs.slider\" bn-data=\"{min: 0, max:1, step: 0.01, orientation: \'vertical\'}\"\n			bn-event=\"input: onVolumeChange\" bn-val=\"volume\" class=\"volulmeSlider\"></div>\n	</div>\n</div>\n\n<div class=\"slider\">\n	<span bn-text=\"getTimeInfo\"></span>\n	<div bn-control=\"brainjs.slider\" bn-data=\"{max: duration}\" bn-event=\"input: onSliderChange\" bn-val=\"curTime\">\n	</div>\n\n</div>",

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
				//console.log('setInnfo', info)
				const  { artist, title, url } = info
				const name = `${artist} - ${title}`
				console.log('name', name)
				ctrl.setData({ name: 'Loading...' })
				const audioBuffer = await $$.media.getAudioBuffer(url, (data) => {
					//console.log(data)
					const percent = Math.trunc(data.percentComplete * 100)
					ctrl.setData({ name:  `Loading (${percent} %)` })
				})
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
				ctrl.setData({ name: 'Analysing...' })
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

			this.getPlaybackRate = function() {
				return ctrl.model.rate
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




// @ts-check

$$.control.registerControl('tree', {

	template: "<div \n    bn-control=\"brainjs.tree\" \n    bn-data=\"{source: treeInfo, options: treeOptions}\"\n    bn-event=\"treeclick: onTreeItemSelected\"\n></div>        \n",

	deps: ['breizbot.files', 'breizbot.friends', 'breizbot.playlists'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Files.Interface} srvFiles
	 * @param {Breizbot.Services.Friends.Interface} srvFriends
	 * @param {Breizbot.Services.Playlists.Interface} srvPlaylists
	 */
	init: function (elt, srvFiles, srvFriends, srvPlaylists) {

		const treeInfo = [
			{ title: 'Home Files', icon: 'fa fa-home w3-text-blue', lazy: true, data: { path: '/' } },
			{ title: 'Files Shared', folder: true, children: [], icon: 'fa fa-share-alt w3-text-blue' },
			{ title: 'Playlists', folder: true, children: [], icon: 'fas fa-compact-disc w3-text-blue' }
		]

		function concatPath(path, fileName) {
			let ret = path
			if (!path.endsWith('/')) {
				ret += '/'
			}
			ret += fileName
			return ret
		}

		const treeOptions = {
			lazyLoad: function (ev, data) {
				const node = data.node
				//console.log('lazyload', node.data)
				data.result = new Promise(async (resolve) => {
					const { path, friendUser } = node.data
					const folders = await srvFiles.list(path, { filterExtension: 'mp3', folderOnly: true }, friendUser)
					//console.log('folders', folders)
					const results = folders.map((f) => {
						return {
							title: f.name,
							data: {
								path: concatPath(path, f.name),
								friendUser
							},
							lazy: true,
							folder: true
						}
					})
					resolve(results)
				})
			}
		}

		const ctrl = $$.viewController(elt, {
			data: {
				treeInfo,
				treeOptions,
			},
			events: {
				onTreeItemSelected: async function (ev, node) {
					//console.log('onTreeItemSelected', node.data)
					const { path, friendUser, playlistName } = node.data
					if (Object.keys(node.data).length == 0) {
						elt.trigger('filechange', { files: [] })
						return
					}


					if (playlistName) {
						elt.trigger('loading')
						const files = await srvPlaylists.getPlaylistSongs(playlistName)
						console.log('files', files)
						const formatedfiles = files
							.filter((f) => f.mp3 && f.mp3.artist)
							.map((f) => {
								const { artist, bpm, title, length, genre } = f.mp3
								const { fileName, friendUser, rootDir } = f.fileInfo
								return {
									url: srvFiles.fileUrl(concatPath(rootDir, fileName), friendUser),
									artist,
									bpm,
									title,
									length,
									genre
								}
							})
						elt.trigger('filechange', { files: formatedfiles })
					}
					else {
						elt.trigger('loading')
						const files = await srvFiles.list(path, {
							filterExtension: 'mp3',
							filesOnly: true,
							getMP3Info: true
						}, friendUser)

						//console.log('files', files)
						const formatedfiles = files
							.filter((f) => f.mp3 && f.mp3.artist)
							.map((f) => {
								const { artist, bpm, title, length, genre } = f.mp3
								return {
									url: srvFiles.fileUrl(concatPath(path, f.name), friendUser),
									artist,
									bpm,
									title,
									length,
									genre
								}
							})

						elt.trigger('filechange', { files: formatedfiles })
					}
				}
			}
		})

		async function init() {
			const friends = await srvFriends.getFriends()
			for (const { friendUserName: title } of friends) {
				ctrl.model.treeInfo[1].children.push({
					title,
					icon: 'fa fa-user w3-text-blue',
					data: { friendUser: title, path: '/' },
					lazy: true,
				})
			}
			//console.log('friends', friends)
			const playlists = await srvPlaylists.getPlaylist()
			for (const playlistName of playlists) {
				ctrl.model.treeInfo[2].children.push({
					title: playlistName,
					icon: 'fa fa-music w3-text-blue',
					data: { playlistName }
				})
			}

			ctrl.update()

		}

		init()

	}


});





// @ts-check

$$.control.registerControl('settings', {

    template: "<div>\n    <form bn-event=\"submit: onSubmit\" bn-form=\"data\">\n        <label>Samplers Folder</label>\n        <div>\n            <input type=\"text\" required name=\"samplersFolder\">\n            <button type=\"button\" class=\"w3-button w3-blue\" bn-icon=\"fa fa-folder-open\" bn-event=\"click: onChooseFolder\"></button>    \n        </div>\n        \n        <input type=\"submit\" hidden bn-bind=\"submit\">\n    </form>\n</div>\n",

    deps: ['breizbot.pager'],

    props: {
        data: {}
    },

    /**
     * 
     * @param {Breizbot.Services.Pager.Interface} pager 
     */
    init: function (elt, pager) {

        const { data } = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                data
            },
            events: {
                onChooseFolder: function() {
                    pager.pushPage('breizbot.files', {
                        title: 'Choose Folder',
                        props: {
                            filterExtension: 'mp3'
                        },
                        onReturn: function(folderPath) {
                            console.log('onReturn', folderPath)
                            ctrl.model.data.samplersFolder = folderPath
                            ctrl.update()
                        },
                        buttons: {
                            apply: {
                                icon: 'fas fa-check',
                                title: 'Apply',
                                onClick: function() {
                                    console.log('onClick', this)
                                    pager.popPage(this.getRootDir())
                                }
                            }
                        }
                    })
                },
                onSubmit: function (ev) {
                    ev.preventDefault()
                    pager.popPage($(this).getFormData())

                }
            }
        })

        this.getButtons = function () {
            return {
                apply: {
                    title: 'Apply',
                    icon: 'fas fa-check',
                    onClick: function () {
                        ctrl.scope.submit.click()
                    }
                }
            }
        }
    }
})
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
            { action: 'PITCH', cmd: 0xB0, note: 0X09, deck: 1 },
            { action: 'LEVEL', cmd: 0xB1, note: 0X16, deck: 2 },
            { action: 'PITCH', cmd: 0xB1, note: 0X09, deck: 2 },

            { action: 'SYNC', cmd: 0x90, note: 0X02, deck: 1, type: 'BTN' },
            { action: 'CUE', cmd: 0x90, note: 0X01, deck: 1, type: 'BTN' },
            { action: 'PLAY', cmd: 0x90, note: 0X00, deck: 1, type: 'BTN' },
            { action: 'PFL', cmd: 0x90, note: 0X1B, deck: 1, type: 'BTN2' },
            { action: 'JOGTOUCH_RELEASE', cmd: 0x80, note: 0X06, deck: 1 },
            { action: 'JOGTOUCH_PRESS', cmd: 0x90, note: 0X06, deck: 1 },

            { action: 'SYNC', cmd: 0x91, note: 0X02, deck: 2, type: 'BTN' },
            { action: 'CUE', cmd: 0x91, note: 0X01, deck: 2, type: 'BTN' },
            { action: 'PLAY', cmd: 0x91, note: 0X00, deck: 2, type: 'BTN' },
            { action: 'PFL', cmd: 0x91, note: 0X1B, deck: 2, type: 'BTN2' },
            { action: 'JOGTOUCH_RELEASE', cmd: 0x81, note: 0X06, deck: 2 },
            { action: 'JOGTOUCH_PRESS', cmd: 0x91, note: 0X06, deck: 2 },

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


        function getActionDesc(cmd, note) {
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
            /**
             * 
             * @param {MIDIConnectionEvent} ev 
             */
            midiAccess.onstatechange = function(ev) {
                if (ev.port.type == 'input') {
                    events.emit('MIDI_STATECHANGE', ev.port)
                }
            }

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

        function getMIDIInputs() {
            const midiInputs = []
            for (const { name, id } of midiAccess.inputs.values()) {
                midiInputs.push({ label: name, value: id })
            }
            return midiInputs             
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
            //console.log('setButtonIntensity', {action, intensity, deck, key})
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
            const desc = getActionDesc(cmd, note)

            if (desc != null) {
                const { action, deck, key, event } = desc
                //console.log('onMidiMessage', {action, deck, key, event})
                if (event != 'UP') {
                    events.emit(action, { deck, key, velocity })
                }
            }

        }

        return {
            selectMIDIInput,
            selectMIDIOutput,
            selectMIDIDevice,
            clearAllButtons,
            setButtonIntensity,
            requestMIDIAccess,
            getMIDIInputs,
            on: events.on.bind(events),
            BtnIntensity
        }
    }
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJjb250cm9scy9maWxlbGlzdC5qcyIsImNvbnRyb2xzL3BsYXllci5qcyIsImNvbnRyb2xzL3RyZWUuanMiLCJwYWdlcy9zZXR0aW5ncy5qcyIsInNlcnZpY2VzL2F1ZGlvdG9vbHMuanMiLCJzZXJ2aWNlcy9taWRpY3RybC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcG5CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hhQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEB0cy1jaGVja1xuXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncm9vdFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9wXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwibWlkaVxcXCI+XFxuICAgICAgICA8ZGl2Pk1JREkgRGV2aWNlPC9kaXY+XFxuICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogbWlkaUlucHV0c31cXFwiIGJuLXZhbD1cXFwic2VsZWN0ZWRJbnB1dFxcXCJcXG4gICAgICAgICAgICBibi1ldmVudD1cXFwiY29tYm9ib3hjaGFuZ2U6IG9uTWlkaUlucHV0Q2hhbmdlXFxcIj5cXG4gICAgICAgIDwvZGl2PlxcblxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiYmFsYW5jZVxcXCI+XFxuICAgICAgICA8bGFiZWw+TGVmdDwvbGFiZWw+XFxuICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuc2xpZGVyXFxcIiBibi1kYXRhPVxcXCJ7bWluOiAwLCBtYXg6IDEsIHN0ZXA6IDAuMDEsIHNob3dSYW5nZTogZmFsc2V9XFxcIlxcbiAgICAgICAgICAgIGJuLWV2ZW50PVxcXCJpbnB1dDogb25Dcm9zc0ZhZGVyQ2hhbmdlXFxcIiBibi12YWw9XFxcImNyb3NzRmFkZXJcXFwiPjwvZGl2PlxcbiAgICAgICAgPGxhYmVsPlJpZ2h0PC9sYWJlbD5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXY+XFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtYmx1ZVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkxvYWRcXFwiIGRhdGEtYXVkaW89XFxcIjFcXFwiPkxPQUQgMVxcbiAgICAgICAgICAgIDxpIGNsYXNzPVxcXCJmYSBmYS1zcGlubmVyIGZhLXB1bHNlXFxcIiBibi1zaG93PVxcXCJhdWRpbzFcXFwiPjwvaT5cXG4gICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLWJsdWVcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25Mb2FkXFxcIiBkYXRhLWF1ZGlvPVxcXCIyXFxcIj5MT0FEIDJcXG4gICAgICAgICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtc3Bpbm5lciBmYS1wdWxzZVxcXCIgYm4tc2hvdz1cXFwiYXVkaW8yXFxcIj48L2k+XFxuICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgIDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1ibHVlXFxcIiBibi1pY29uPVxcXCJmYXMgZmEtY29nXFxcIiB0aXRsZT1cXFwiU2V0dGluZ3NcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25TZXR0aW5nc1xcXCI+PC9idXR0b24+XFxuXFxuICAgIDwvZGl2PlxcblxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcInZpc3VhbGl6ZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJydW5uaW5nQnVmZmVyQ29udGFpbmVyXFxcIiBibi1zdHlsZT1cXFwicnVubmluZ0J1ZmZlckNvbnRhaW5lclN0eWxlXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInJ1bm5pbmdCdWZmZXJcXFwiIGJuLWJpbmQ9XFxcInJ1bm5pbmdCdWZmZXIxXFxcIj48L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInplcm9UaW1lXFxcIiBibi1zdHlsZT1cXFwiemVyb1RpbWVTdHlsZVxcXCI+PC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJob3RjdWVDb250YWluZXJcXFwiIGJuLXN0eWxlPVxcXCJob3RjdWVDb250YWluZXJTdHlsZVxcXCIgYm4tYmluZD1cXFwiaG90Y3VlQ29udGFpbmVyMVxcXCI+PC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcInZpc3VhbGl6ZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJydW5uaW5nQnVmZmVyQ29udGFpbmVyXFxcIiBibi1zdHlsZT1cXFwicnVubmluZ0J1ZmZlckNvbnRhaW5lclN0eWxlXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInJ1bm5pbmdCdWZmZXJcXFwiIGJuLWJpbmQ9XFxcInJ1bm5pbmdCdWZmZXIyXFxcIj48L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInplcm9UaW1lXFxcIiBibi1zdHlsZT1cXFwiemVyb1RpbWVTdHlsZVxcXCI+PC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJob3RjdWVDb250YWluZXJcXFwiIGJuLWJpbmQ9XFxcImhvdGN1ZUNvbnRhaW5lcjJcXFwiPjwvZGl2PlxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJjZW50ZXJcXFwiPlxcbiAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImF1ZGlvcGxheWVyXFxcIiBibi1pZmFjZT1cXFwiYXVkaW8xXFxcIiBkYXRhLWRlY2s9XFxcIjFcXFwiPjwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJtaXhlclxcXCI+XFxuICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuYXVkaW9wZWFrbWV0ZXJcXFwiIGJuLWRhdGE9XFxcInthdWRpb0N0eCwgc291cmNlTm9kZTogc291cmNlMX1cXFwiPjwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwidG9vbGJhcjJcXFwiPlxcbiAgICAgICAgICAgIDxzcGFuPk1BU1RFUjwvc3Bhbj5cXG4gICAgICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuc2xpZGVyXFxcIiBibi1kYXRhPVxcXCJ7bWluOiAwLCBtYXg6MSwgc3RlcDogMC4wMSwgb3JpZW50YXRpb246IFxcJ3ZlcnRpY2FsXFwnfVxcXCJcXG4gICAgICAgICAgICAgICAgYm4tZXZlbnQ9XFxcImlucHV0OiBvbk1hc3RlclZvbHVtZUNoYW5nZVxcXCIgYm4tdmFsPVxcXCJtYXN0ZXJWb2x1bWVcXFwiIGNsYXNzPVxcXCJ2b2x1bG1lU2xpZGVyXFxcIj48L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwidG9vbGJhcjJcXFwiPlxcbiAgICAgICAgICAgIDxzcGFuPkNVRTwvc3Bhbj5cXG4gICAgICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuc2xpZGVyXFxcIiBibi1kYXRhPVxcXCJ7bWluOiAwLCBtYXg6MSwgc3RlcDogMC4wMSwgb3JpZW50YXRpb246IFxcJ3ZlcnRpY2FsXFwnfVxcXCJcXG4gICAgICAgICAgICAgICAgYm4tZXZlbnQ9XFxcImlucHV0OiBvbkN1ZVZvbHVtZUNoYW5nZVxcXCIgYm4tdmFsPVxcXCJjdWVWb2x1bWVcXFwiIGNsYXNzPVxcXCJ2b2x1bG1lU2xpZGVyXFxcIj48L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmF1ZGlvcGVha21ldGVyXFxcIiBibi1kYXRhPVxcXCJ7YXVkaW9DdHgsIHNvdXJjZU5vZGU6IHNvdXJjZTJ9XFxcIj48L2Rpdj5cXG4gICAgPC9kaXY+XFxuXFxuICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYXVkaW9wbGF5ZXJcXFwiIGJuLWlmYWNlPVxcXCJhdWRpbzJcXFwiIGRhdGEtZGVjaz1cXFwiMlxcXCI+PC9kaXY+XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwiYm90dG9tXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwibGVmdFxcXCI+XFxuICAgICAgICA8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblNlYXJjaFxcXCI+XFxuICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHBsYWNlaG9sZGVyPVxcXCJTZWFyY2guLi5cXFwiIG5hbWU9XFxcInZhbHVlXFxcIj5cXG4gICAgICAgICAgICA8YnV0dG9uIHR5cGU9XFxcImJ1dHRvblxcXCIgYm4taWNvbj1cXFwiZmFzIGZhLXRpbWVzXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uQ2xlYXJTZWFyY2hcXFwiPjwvYnV0dG9uPlxcbiAgICAgICAgPC9mb3JtPlxcbiAgICAgICAgPGRpdiBibi1jb250cm9sPVxcXCJ0cmVlXFxcIiBibi1ldmVudD1cXFwiZmlsZWNoYW5nZTogb25GaWxlQ2hhbmdlLCBsb2FkaW5nOiBvbkxvYWRpbmdTb25nc1xcXCI+PC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJsYW9kaW5nUGFuZWxcXFwiIGJuLXNob3c9XFxcImxvYWRpbmdTb25nc1xcXCI+XFxuICAgICAgICA8aSBjbGFzcz1cXFwiZmEgZmEtc3Bpbm5lciBmYS1wdWxzZVxcXCIgPjwvaT5cXG4gICAgICAgIDxzcGFuPkxvYWRpbmcuLi48L3NwYW4+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImZpbGVsaXN0XFxcIiBibi1kYXRhPVxcXCJ7ZmlsZXM6IGdldEZpbGVzfVxcXCIgYm4taWZhY2U9XFxcImZpbGVsaXN0XFxcIiBibi1zaG93PVxcXCIhbG9hZGluZ1NvbmdzXFxcIj48L2Rpdj5cXG48L2Rpdj5cXG5cXG5cIixcblxuXHRkZXBzOiBbXG5cdFx0J2JyZWl6Ym90LnBhZ2VyJyxcblx0XHQnTUlESUN0cmwnLFxuXHRcdCdBdWRpb1Rvb2xzJyxcblx0XHQnYnJlaXpib3QuYXBwRGF0YScsXG5cdFx0J2JyZWl6Ym90LmZpbGVzJyxcblx0XHQnYnJlaXpib3QuZnJpZW5kcycsXG5cdFx0J2JyZWl6Ym90LnBsYXlsaXN0cydcblx0XSxcblxuXHRwcm9wczoge1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyIFxuXHQgKiBAcGFyYW0ge0RKTWl4LlNlcnZpY2UuTUlESUN0cmwuSW50ZXJmYWNlfSBtaWRpQ3RybFxuXHQgKiBAcGFyYW0ge0RKTWl4LlNlcnZpY2UuQXVkaW9Ub29scy5JbnRlcmZhY2V9IGF1ZGlvVG9vbHNcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5BcHBEYXRhLkludGVyZmFjZX0gYXBwRGF0YVxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkZpbGVzLkludGVyZmFjZX0gc3J2RmlsZXNcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5GcmllbmRzLkludGVyZmFjZX0gc3J2RnJpZW5kc1xuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBsYXlsaXN0cy5JbnRlcmZhY2V9IHNydlBsYXlsaXN0c1xuXHQgKi9cblx0aW5pdDogYXN5bmMgZnVuY3Rpb24gKGVsdCwgcGFnZXIsIG1pZGlDdHJsLCBhdWRpb1Rvb2xzLCBhcHBEYXRhLCBzcnZGaWxlcywgc3J2RnJpZW5kcywgc3J2UGxheWxpc3RzKSB7XG5cblx0XHRjb25zdCBtYXAgPSAkJC51dGlsLm1hcFJhbmdlKDAsIDEyNywgMCwgMSlcblxuXHRcdGNvbnN0IG1hcFJhdGUgPSAkJC51dGlsLm1hcFJhbmdlKDAsIDEyNywgMC45MiwgMS4wOClcblxuXHRcdGNvbnN0IHdhaXREbGcgPSAkJC51aS53YWl0RGlhbG9nKCdMb2FkaW5nIHNhbXBsZXJzLi4uJylcblxuXHRcdGNvbnN0IFJVTk5JTkdfRElTUExBWV9XSURUSCA9IDEzMDBcblx0XHRjb25zdCBSVU5OSU5HX0RJU1BMQVlfSEVJR0hUID0gODBcblx0XHRjb25zdCBTRUNPTkRTX09GX1JVTk5JTkdfRElTUExBWSA9IDEwLjBcblx0XHRjb25zdCBNQVhfQ0FOVkFTX1dJRFRIID0gMzIwMDBcblxuXHRcdGxldCBzZXR0aW5ncyA9IGFwcERhdGEuZ2V0RGF0YSgpXG5cdFx0Y29uc29sZS5sb2coJ3NldHRpbmdzJywgc2V0dGluZ3MpXG5cblx0XHRjb25zdCBhdWRpb0N0eCA9IGF1ZGlvVG9vbHMuZ2V0QXVkaW9Db250ZXh0KClcblxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRsb2FkaW5nU29uZ3M6IGZhbHNlLFxuXHRcdFx0XHRmaWxlczogW10sXG5cdFx0XHRcdGdldEZpbGVzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRpZiAodGhpcy5zZWFyY2hGaWx0ZXIgPT0gJycpIHtcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmZpbGVzXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cChgXFx3KiR7dGhpcy5zZWFyY2hGaWx0ZXJ9XFx3KmAsICdpJylcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5maWxlcy5maWx0ZXIoKGYpID0+IHJlZ2V4LnRlc3QoZi5hcnRpc3QpIHx8IHJlZ2V4LnRlc3QoZi50aXRsZSkpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNlYXJjaEZpbHRlcjogJycsXG5cdFx0XHRcdGF1ZGlvQ3R4LFxuXHRcdFx0XHRzb3VyY2UxOiBudWxsLFxuXHRcdFx0XHRzZWxlY3RlZElucHV0OiAnZGVmYXVsdCcsXG5cdFx0XHRcdGF1ZGlvMTogZmFsc2UsXG5cdFx0XHRcdGF1ZGlvMjogZmFsc2UsXG5cdFx0XHRcdGN1clBGTDogMSxcblx0XHRcdFx0bWlkaUlucHV0czogW10sXG5cdFx0XHRcdG1pZGlPdXRwdXRzOiBbXSxcblx0XHRcdFx0Y3Jvc3NGYWRlcjogMC41LFxuXHRcdFx0XHRtYXN0ZXJWb2x1bWU6IDAuNSxcblx0XHRcdFx0Y3VlVm9sdW1lOiAwLjUsXG5cdFx0XHRcdHJ1bm5pbmdCdWZmZXJDb250YWluZXJTdHlsZToge1xuXHRcdFx0XHRcdHdpZHRoOiBSVU5OSU5HX0RJU1BMQVlfV0lEVEggKyAncHgnLFxuXHRcdFx0XHRcdGhlaWdodDogUlVOTklOR19ESVNQTEFZX0hFSUdIVCArICdweCdcblx0XHRcdFx0fSxcblx0XHRcdFx0emVyb1RpbWVTdHlsZToge1xuXHRcdFx0XHRcdGxlZnQ6IFJVTk5JTkdfRElTUExBWV9XSURUSCAvIDIsXG5cdFx0XHRcdFx0aGVpZ2h0OiBSVU5OSU5HX0RJU1BMQVlfSEVJR0hUXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGhvdGN1ZUNvbnRhaW5lclN0eWxlOiB7XG5cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkNsZWFyU2VhcmNoOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkNsZWFyU2VhcmNoJylcblx0XHRcdFx0XHQkKHRoaXMpLmNsb3Nlc3QoJ2Zvcm0nKS5zZXRGb3JtRGF0YSh7dmFsdWU6ICcnfSlcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3NlYXJjaEZpbHRlcjogJyd9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkxvYWRpbmdTb25nczogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Mb2FkaW5nU29uZ3MnKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7bG9hZGluZ1NvbmdzOiB0cnVlLCBmaWxlczogW119KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblNlYXJjaDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRcdFx0Y29uc3QgZGF0YSA9ICQodGhpcykuZ2V0Rm9ybURhdGEoKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uU2VhcmNoJywgZGF0YSlcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3NlYXJjaEZpbHRlcjogZGF0YS52YWx1ZX0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uRmlsZUNoYW5nZTogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkZpbGVDaGFuZ2UnLCBkYXRhKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7ZmlsZXM6IGRhdGEuZmlsZXMsIGxvYWRpbmdTb25nczogZmFsc2V9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblNldHRpbmdzOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ3NldHRpbmdzJywge1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdTZXR0aW5ncycsXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRkYXRhOiBzZXR0aW5nc1xuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdG9uUmV0dXJuOiBhc3luYyBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnc2V0dGluZ3MnLCBkYXRhKVxuXHRcdFx0XHRcdFx0XHRzZXR0aW5ncyA9IGRhdGFcblx0XHRcdFx0XHRcdFx0YXdhaXQgYXBwRGF0YS5zYXZlRGF0YShzZXR0aW5ncylcblx0XHRcdFx0XHRcdFx0bGFvZFNhbXBsZXJzKClcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbk1hc3RlclZvbHVtZUNoYW5nZTogZnVuY3Rpb24gKGV2LCB2YWx1ZSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uTWFzdGVyVm9sdW1lQ2hhbmdlJywgdmFsdWUpXG5cdFx0XHRcdFx0bWFzdGVyQ3Jvc3NGYWRlci5zZXRNYXN0ZXJMZXZlbCh2YWx1ZSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25DdWVWb2x1bWVDaGFuZ2U6IGZ1bmN0aW9uIChldiwgdmFsdWUpIHtcblx0XHRcdFx0XHRtYXN0ZXJDcm9zc0ZhZGVyLnNldE1hc3RlckxldmVsKHZhbHVlKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNyb3NzRmFkZXJDaGFuZ2U6IGZ1bmN0aW9uIChldiwgdmFsdWUpIHtcblx0XHRcdFx0XHRtYXN0ZXJDcm9zc0ZhZGVyLnNldEZhZGVyTGV2ZWwodmFsdWUpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTG9hZDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IGRlY2sgPSAkKHRoaXMpLmRhdGEoJ2F1ZGlvJylcblx0XHRcdFx0XHRsb2FkVHJhY2soZGVjaylcblx0XHRcdFx0fSxcblx0XHRcdFx0b25NaWRpSW5wdXRDaGFuZ2U6IGZ1bmN0aW9uIChldikge1xuXHRcdFx0XHRcdGNvbnN0IHNlbGVjdGVkSWQgPSAkKHRoaXMpLmdldFZhbHVlKClcblx0XHRcdFx0XHRzZWxlY3RNaWRpRGV2aWNlKHNlbGVjdGVkSWQpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gbGFvZFNhbXBsZXJzKCkge1xuXHRcdFx0aWYgKHNldHRpbmdzLnNhbXBsZXJzRm9sZGVyKSB7XG5cdFx0XHRcdHdhaXREbGcuc2hvdygpXG5cdFx0XHRcdGNvbnN0IGZpbGVzID0gYXdhaXQgc3J2RmlsZXMubGlzdChzZXR0aW5ncy5zYW1wbGVyc0ZvbGRlciwge1xuXHRcdFx0XHRcdGZpbHRlckV4dGVuc2lvbjogJ21wMycsXG5cdFx0XHRcdFx0ZmlsZXNPbmx5OiB0cnVlXG5cdFx0XHRcdH0pXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdmaWxlcycsIGZpbGVzKVxuXHRcdFx0XHRjb25zdCBzYW1wbGVyc0luZm8gPSBbXVxuXHRcdFx0XHRmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcblx0XHRcdFx0XHRjb25zdCB1cmwgPSBzcnZGaWxlcy5maWxlVXJsKHNldHRpbmdzLnNhbXBsZXJzRm9sZGVyICsgZmlsZS5uYW1lKVxuXHRcdFx0XHRcdGNvbnN0IGF1ZGlvQnVmZmVyID0gYXdhaXQgJCQubWVkaWEuZ2V0QXVkaW9CdWZmZXIodXJsKVxuXHRcdFx0XHRcdHNhbXBsZXJzSW5mby5wdXNoKHtcblx0XHRcdFx0XHRcdGF1ZGlvQnVmZmVyLFxuXHRcdFx0XHRcdFx0dmFsdWU6IHNhbXBsZXJzSW5mby5sZW5ndGgsXG5cdFx0XHRcdFx0XHRsYWJlbDogZmlsZS5uYW1lLnJlcGxhY2UoJy5tcDMnLCAnJylcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cdFx0XHRcdGdldEF1ZGlvQ3RybCgxKS5zZXRTYW1wbGVycyhzYW1wbGVyc0luZm8pXG5cdFx0XHRcdGdldEF1ZGlvQ3RybCgyKS5zZXRTYW1wbGVycyhzYW1wbGVyc0luZm8pXG5cdFx0XHRcdHdhaXREbGcuaGlkZSgpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc2VsZWN0TWlkaURldmljZShzZWxlY3RlZElkKSB7XG5cdFx0XHRtaWRpQ3RybC5zZWxlY3RNSURJRGV2aWNlKHNlbGVjdGVkSWQpXG5cdFx0XHRtaWRpQ3RybC5jbGVhckFsbEJ1dHRvbnMoKVxuXHRcdFx0bWlkaUN0cmwuc2V0QnV0dG9uSW50ZW5zaXR5KCdQRkwnLCAxLCAyKVxuXHRcdH1cblxuXHRcdGNvbnN0IGNvbG9ycyA9IFsncmVkJywgJ2dyZWVuJ11cblxuXHRcdGFzeW5jIGZ1bmN0aW9uIGxvYWRUcmFjayhkZWNrKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnbG9hZFRyYWNrJywgZGVjaylcblx0XHRcdGNvbnN0IGF1ZGlvID0gJ2F1ZGlvJyArIGRlY2tcblx0XHRcdGlmIChjdHJsLm1vZGVsW2F1ZGlvXSA9PSB0cnVlKSB7XG5cdFx0XHRcdCQubm90aWZ5KCdBIHRyYWNrIGlzIGFscmVhZHkgbG9hZGluZycsICdlcnJvcicpXG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXG5cdFx0XHQvKipAdHlwZSB7REpNaXguQ29udHJvbC5BdWRpb1BsYXllci5JbnRlcmZhY2V9ICovXG5cdFx0XHRjb25zdCBwbGF5ZXIgPSBjdHJsLnNjb3BlW2F1ZGlvXVxuXG5cdFx0XHRpZiAocGxheWVyLmlzUGxheWluZygpKSB7XG5cdFx0XHRcdCQubm90aWZ5KCdQbGVhc2Ugc3RvcCBwbGF5YmFjayBiZWZvcmUgbG9hZGluZyBhIHRyYWNrJywgJ2Vycm9yJylcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zdCBzZWxGaWxlID0gZmlsZUxpc3QuZ2V0U2VsRmlsZSgpXG5cdFx0XHRpZiAoc2VsRmlsZSkge1xuXHRcdFx0XHRjb25zdCBydW5uaW5nQnVmZmVyID0gcnVubmluZ0J1ZmZlcnNbZGVjayAtIDFdXG5cdFx0XHRcdHJ1bm5pbmdCdWZmZXIuaW5uZXJIVE1MID0gJycgLy8gcmVtb3ZlIGFsbCBjaGlsZHJlblxuXHRcdFx0XHRjb25zdCBob3RjdWVDb250YWluZXIgPSBob3RjdWVDb250YWluZXJzW2RlY2sgLSAxXVxuXHRcdFx0XHRob3RjdWVDb250YWluZXIuaW5uZXJIVE1MID0gJycgLy8gcmVtb3ZlIGFsbCBjaGlsZHJlblxuXG5cdFx0XHRcdGN0cmwubW9kZWxbYXVkaW9dID0gdHJ1ZVxuXHRcdFx0XHRjdHJsLnVwZGF0ZSgpXG5cdFx0XHRcdGNvbnN0IHsgYXVkaW9CdWZmZXIsIHRlbXBvIH0gPSBhd2FpdCBjdHJsLnNjb3BlW2F1ZGlvXS5zZXRJbmZvKHNlbEZpbGUpXG5cblx0XHRcdFx0Y29uc3Qgd2lkdGggPSBSVU5OSU5HX0RJU1BMQVlfV0lEVEggLyAyICogYXVkaW9CdWZmZXIuZHVyYXRpb25cblx0XHRcdFx0aG90Y3VlQ29udGFpbmVyLnN0eWxlLndpZHRoID0gd2lkdGggKyAncHgnXG5cdFx0XHRcdGhvdGN1ZUNvbnRhaW5lci5zdHlsZS5oZWlnaHQgPSBSVU5OSU5HX0RJU1BMQVlfSEVJR0hUICsgJ3B4J1xuXG5cdFx0XHRcdGNyZWF0ZUhvdEN1ZShkZWNrLCAxLCAwKVxuXG5cdFx0XHRcdGRyYXdSdW5uaW5nQnVmZmVyKGF1ZGlvQnVmZmVyLCBkZWNrLCB0ZW1wbylcblx0XHRcdFx0Y3RybC5tb2RlbFthdWRpb10gPSBmYWxzZVxuXHRcdFx0XHR1cGRhdGVUaW1lKDAsIGRlY2spXG5cdFx0XHRcdGN0cmwudXBkYXRlKClcblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lIFxuXHRcdCAqIEBwYXJhbSB7bnVtYmVyfSBkZWNrIFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIHVwZGF0ZVRpbWUodGltZSwgZGVjaykge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygndXBkYXRlVGltZScsIHRpbWUpXG5cdFx0XHRjb25zdCBydW5uaW5nQnVmZmVyID0gcnVubmluZ0J1ZmZlcnNbZGVjayAtIDFdXG5cdFx0XHRjb25zdCBob3RjdWVDb250YWluZXIgPSBob3RjdWVDb250YWluZXJzW2RlY2sgLSAxXVxuXHRcdFx0Y29uc3QgbGVmdCA9IChSVU5OSU5HX0RJU1BMQVlfV0lEVEggLyBTRUNPTkRTX09GX1JVTk5JTkdfRElTUExBWSkgKiAoU0VDT05EU19PRl9SVU5OSU5HX0RJU1BMQVkgLyAyIC0gdGltZSlcblx0XHRcdHJ1bm5pbmdCdWZmZXIuc3R5bGUubGVmdCA9IGxlZnQgKyAncHgnXG5cdFx0XHRob3RjdWVDb250YWluZXIuc3R5bGUubGVmdCA9IGxlZnQgKyAncHgnXG5cdFx0XHQvLyBjb25zdCBhdWRpb0J1ZmZlciA9IGdldEF1ZGlvQ3RybChkZWNrKS5nZXRBdWRpb0J1ZmZlcigpXG5cdFx0XHQvLyBjb25zdCBzYW1wbGVJZHggPSBNYXRoLnRydW5jKHRpbWUgKiBhdWRpb0J1ZmZlci5zYW1wbGVSYXRlKVxuXHRcdFx0Ly8gY29uc3QgdmFsdWUgPSBhdWRpb0J1ZmZlci5nZXRDaGFubmVsRGF0YSgwKVtzYW1wbGVJZHhdXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhgc2FtcGxlWyR7ZGVja30sICR7c2FtcGxlSWR4fV0gPSAke3ZhbHVlfWApXG5cdFx0fVxuXG5cdFx0Y29uc3QgaG90Y3VlQ29sb3JzID0gWydyZWQnLCAnZ3JlZW4nLCAnYmx1ZScsICdvcmFuZ2UnXVxuXG5cblx0XHRmdW5jdGlvbiBnZXRPZmZzZXQodGltZSkge1xuXHRcdFx0cmV0dXJuIFJVTk5JTkdfRElTUExBWV9XSURUSCAvIFNFQ09ORFNfT0ZfUlVOTklOR19ESVNQTEFZICogdGltZVxuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7bnVtYmVyfSBvZmZzZXQgXG5cdFx0ICogQHJldHVybnMge251bWJlcn1cblx0XHQgKi9cblx0XHRmdW5jdGlvbiBnZXRUaW1lRnJvbU9mZnNldChvZmZzZXQpIHtcblx0XHRcdHJldHVybiBvZmZzZXQgKiBTRUNPTkRTX09GX1JVTk5JTkdfRElTUExBWSAvIFJVTk5JTkdfRElTUExBWV9XSURUSFxuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7bnVtYmVyfSBkZWNrIFxuXHRcdCAqIEBwYXJhbSB7bnVtYmVyfSBob3RjdWUgXG5cdFx0ICogQHBhcmFtIHtudW1iZXJ9IHRpbWUgXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gY3JlYXRlSG90Q3VlKGRlY2ssIGhvdGN1ZSwgdGltZSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2NyZWF0ZUhvdEN1ZScsIHsgZGVjaywgaG90Y3VlLCB0aW1lIH0pXG5cblx0XHRcdGRlbGV0ZUhvdEN1ZShkZWNrLCBob3RjdWUpXG5cdFx0XHRjb25zdCBob3RjdWVDb250YWluZXIgPSBob3RjdWVDb250YWluZXJzW2RlY2sgLSAxXVxuXHRcdFx0Y29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jylcblx0XHRcdGRpdi5jbGFzc0xpc3QuYWRkKCdob3RjdWUnKVxuXG5cdFx0XHRjb25zdCB3aWR0aCA9IGdldE9mZnNldCh0aW1lKVxuXHRcdFx0ZGl2LnN0eWxlLmxlZnQgPSB3aWR0aCArICdweCdcblx0XHRcdGRpdi5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBob3RjdWVDb2xvcnNbaG90Y3VlIC0gMV1cblx0XHRcdGRpdi5zdHlsZS5oZWlnaHQgPSBSVU5OSU5HX0RJU1BMQVlfSEVJR0hUICsgJ3B4J1xuXHRcdFx0aG90Y3VlQ29udGFpbmVyLmFwcGVuZENoaWxkKGRpdilcblxuXHRcdFx0Z2V0QXVkaW9DdHJsKGRlY2spLmFkZEhvdGN1ZShob3RjdWUsIHRpbWUsIGRpdilcblxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGRlbGV0ZUhvdEN1ZShkZWNrLCBob3RjdWUpIHtcblx0XHRcdGNvbnN0IGF1ZGlvQ3RybCA9IGdldEF1ZGlvQ3RybChkZWNrKVxuXHRcdFx0Y29uc3QgaW5mbyA9IGF1ZGlvQ3RybC5nZXRIb3RjdWUoaG90Y3VlKVxuXHRcdFx0aWYgKGluZm8pIHtcblx0XHRcdFx0YXVkaW9DdHJsLmRlbGV0ZUhvdGN1ZShob3RjdWUpXG5cdFx0XHRcdGhvdGN1ZUNvbnRhaW5lcnNbZGVjayAtIDFdLnJlbW92ZUNoaWxkKGluZm8uZGl2KVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJlbW92ZUxvb3AoZGVjaykge1xuXHRcdFx0Y29uc3QgaG90Y3VlQ29udGFpbmVyID0gaG90Y3VlQ29udGFpbmVyc1tkZWNrIC0gMV1cblx0XHRcdCQoaG90Y3VlQ29udGFpbmVyKS5maW5kKCcubG9vcCcpLnJlbW92ZSgpXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gY3JlYXRlTG9vcChkZWNrLCBzdGFydFRpbWUsIGR1cmF0aW9uKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnY3JlYXRlTG9vcCcsIHsgZGVjaywgc3RhcnRUaW1lLCBkdXJhdGlvbiB9KVxuXHRcdFx0Y29uc3QgaG90Y3VlQ29udGFpbmVyID0gaG90Y3VlQ29udGFpbmVyc1tkZWNrIC0gMV1cblx0XHRcdCQoaG90Y3VlQ29udGFpbmVyKS5maW5kKCcubG9vcCcpLnJlbW92ZSgpXG5cblx0XHRcdGNvbnN0IGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG5cdFx0XHRkaXYuY2xhc3NMaXN0LmFkZCgnbG9vcCcpXG5cblx0XHRcdGNvbnN0IHdpZHRoID0gZ2V0T2Zmc2V0KHN0YXJ0VGltZSlcblx0XHRcdGRpdi5zdHlsZS5sZWZ0ID0gd2lkdGggKyAncHgnXG5cdFx0XHRkaXYuc3R5bGUud2lkdGggPSAoZHVyYXRpb24gPT0gMCkgPyAnMnB4JyA6IGdldE9mZnNldChkdXJhdGlvbikgKyAncHgnXG5cdFx0XHRkaXYuc3R5bGUuaGVpZ2h0ID0gUlVOTklOR19ESVNQTEFZX0hFSUdIVCArICdweCdcblx0XHRcdGhvdGN1ZUNvbnRhaW5lci5hcHBlbmRDaGlsZChkaXYpXG5cblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge251bWJlcn0gZGVjayBcblx0XHQgKiBAcmV0dXJucyB7REpNaXguQ29udHJvbC5BdWRpb1BsYXllci5JbnRlcmZhY2V9XG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gZ2V0QXVkaW9DdHJsKGRlY2spIHtcblx0XHRcdHJldHVybiBjdHJsLnNjb3BlWydhdWRpbycgKyBkZWNrXVxuXHRcdH1cblxuXHRcdG1pZGlDdHJsLm9uKCdNSURJX1NUQVRFQ0hBTkdFJywgKGV2KSA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZygnbWlkaVN0YXRlQ2hhbmdlJywgZXYpXG5cdFx0XHRjdHJsLnNldERhdGEoeyBtaWRpSW5wdXRzOiBtaWRpQ3RybC5nZXRNSURJSW5wdXRzKCkgfSlcblx0XHR9KVxuXG5cdFx0bWlkaUN0cmwub24oJ1BMQVknLCAoeyBkZWNrIH0pID0+IHtcblx0XHRcdGdldEF1ZGlvQ3RybChkZWNrKS50b2dnbGVQbGF5KClcblx0XHR9KVxuXG5cdFx0bWlkaUN0cmwub24oJ0xPQUQnLCBhc3luYyAoeyBkZWNrIH0pID0+IHtcblx0XHRcdGxvYWRUcmFjayhkZWNrKVxuXHRcdH0pXG5cblx0XHRtaWRpQ3RybC5vbignQ1JPU1NfRkFERVInLCBhc3luYyAoeyB2ZWxvY2l0eSB9KSA9PiB7XG5cdFx0XHRjb25zdCBjcm9zc0ZhZGVyID0gbWFwKHZlbG9jaXR5KVxuXHRcdFx0Y3RybC5zZXREYXRhKHsgY3Jvc3NGYWRlciB9KVxuXHRcdFx0bWFzdGVyQ3Jvc3NGYWRlci5zZXRGYWRlckxldmVsKGNyb3NzRmFkZXIpXG5cdFx0fSlcblxuXHRcdG1pZGlDdHJsLm9uKCdTWU5DJywgKHtkZWNrfSkgPT4ge1xuXHRcdFx0Y29uc3Qgb3RoZXJEZWNrID0gKGRlY2sgPT0gMSkgPyAyIDogMVxuXHRcdFx0Y29uc3QgYXVkaW9DdHJsID0gZ2V0QXVkaW9DdHJsKGRlY2spXG5cdFx0XHRjb25zdCBvdGhlckF1ZGlvQ3RybCA9IGdldEF1ZGlvQ3RybChvdGhlckRlY2spXG5cdFx0XHRjb25zdCB0YXJnZXRCcG0gPSBvdGhlckF1ZGlvQ3RybC5nZXRCcG0oKSAqIG90aGVyQXVkaW9DdHJsLmdldFBsYXliYWNrUmF0ZSgpXG5cblx0XHRcdGNvbnN0IHJhdGUgPSB0YXJnZXRCcG0gLyBhdWRpb0N0cmwuZ2V0QnBtKClcblx0XHRcdGF1ZGlvQ3RybC5zZXRQbGF5YmFja1JhdGUocmF0ZSlcblx0XHRcdHVwZGF0ZURpc3BsYXlSYXRlKGRlY2ssIHJhdGUpXG5cdFx0XHQvL290aGVyQXVkaW9DdHJsLnNldFBsYXliYWNrUmF0ZSgxKVxuXHRcdFx0bWlkaUN0cmwuc2V0QnV0dG9uSW50ZW5zaXR5KCdTWU5DJywgMTI3LCBkZWNrKVxuXHRcdFx0bWlkaUN0cmwuc2V0QnV0dG9uSW50ZW5zaXR5KCdTWU5DJywgMSwgb3RoZXJEZWNrKVxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiB1cGRhdGVEaXNwbGF5UmF0ZShkZWNrLCByYXRlKSB7XG5cdFx0XHRjb25zdCBydW5uaW5nQnVmZmVyID0gcnVubmluZ0J1ZmZlcnNbZGVjayAtIDFdXG5cdFx0XHRjb25zdCB0cmFuc2Zvcm0gPSBgc2NhbGUoJHsxIC8gcmF0ZX0sIDEpYFxuXHRcdFx0Zm9yIChjb25zdCBjdiBvZiBydW5uaW5nQnVmZmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJ2NhbnZhcycpKSB7XG5cdFx0XHRcdGN2LnN0eWxlLnRyYW5zZm9ybSA9IHRyYW5zZm9ybVxuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBob3RjdWVDb250YWluZXIgPSBob3RjdWVDb250YWluZXJzW2RlY2sgLSAxXVxuXHRcdFx0aG90Y3VlQ29udGFpbmVyLnN0eWxlLnRyYW5zZm9ybSA9IHRyYW5zZm9ybVxuXHRcdH1cblxuXHRcdG1pZGlDdHJsLm9uKCdQSVRDSCcsICh7IGRlY2ssIHZlbG9jaXR5IH0pID0+IHtcblx0XHRcdGNvbnN0IHJhdGUgPSBtYXBSYXRlKHZlbG9jaXR5KVxuXHRcdFx0bWlkaUN0cmwuc2V0QnV0dG9uSW50ZW5zaXR5KCdTWU5DJywgMSwgMSlcblx0XHRcdG1pZGlDdHJsLnNldEJ1dHRvbkludGVuc2l0eSgnU1lOQycsIDEsIDIpXG5cdFx0XHR1cGRhdGVEaXNwbGF5UmF0ZShkZWNrLCByYXRlKVxuXHRcdFx0Z2V0QXVkaW9DdHJsKGRlY2spLnNldFBsYXliYWNrUmF0ZShyYXRlKVxuXHRcdH0pXG5cblx0XHRtaWRpQ3RybC5vbignTEVWRUwnLCBhc3luYyAoeyBkZWNrLCB2ZWxvY2l0eSB9KSA9PiB7XG5cdFx0XHRjb25zdCB2b2x1bWUgPSBtYXAodmVsb2NpdHkpXG5cdFx0XHRnZXRBdWRpb0N0cmwoZGVjaykuc2V0Vm9sdW1lKHZvbHVtZSlcblx0XHR9KVxuXG5cdFx0bWlkaUN0cmwub24oJ0JST1dTRV9XSEVFTCcsIGFzeW5jICh7IHZlbG9jaXR5IH0pID0+IHtcblx0XHRcdGlmICh2ZWxvY2l0eSA9PSAxKSB7XG5cdFx0XHRcdGZpbGVMaXN0LnNlbERvd24oKVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGZpbGVMaXN0LnNlbFVwKClcblx0XHRcdH1cblx0XHR9KVxuXG5cblx0XHRtaWRpQ3RybC5vbignSk9HX1dIRUVMJywgKHsgZGVjaywgdmVsb2NpdHkgfSkgPT4ge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnSk9HX1dIRUVMJywge2RlY2ssIHZlbG9jaXR5fSlcblx0XHRcdGxldCBvZmZzZXQgPSBTRUNPTkRTX09GX1JVTk5JTkdfRElTUExBWSAvIFJVTk5JTkdfRElTUExBWV9XSURUSFxuXHRcdFx0aWYgKHZlbG9jaXR5ID09IDEyNykge1xuXHRcdFx0XHRvZmZzZXQgKj0gLTFcblx0XHRcdH1cblx0XHRcdGdldEF1ZGlvQ3RybChkZWNrKS5zZWVrKG9mZnNldClcblx0XHR9KVxuXG5cdFx0bWlkaUN0cmwub24oJ0pPR1RPVUNIX1JFTEVBU0UnLCAoeyBkZWNrIH0pID0+IHtcblx0XHRcdGdldEF1ZGlvQ3RybChkZWNrKS5qb2dUb3VjaChmYWxzZSlcblx0XHR9KVxuXG5cdFx0bWlkaUN0cmwub24oJ0pPR1RPVUNIX1BSRVNTJywgKHsgZGVjayB9KSA9PiB7XG5cdFx0XHRnZXRBdWRpb0N0cmwoZGVjaykuam9nVG91Y2godHJ1ZSlcblx0XHR9KVxuXG5cdFx0bWlkaUN0cmwub24oJ0NVRScsICh7IGRlY2sgfSkgPT4ge1xuXHRcdFx0Y29uc3QgYXVkaW9DdHJsID0gZ2V0QXVkaW9DdHJsKGRlY2spXG5cblx0XHRcdGlmIChhdWRpb0N0cmwuaXNQbGF5aW5nKCkpIHtcblx0XHRcdFx0YXVkaW9DdHJsLmp1bXBUb0hvdGN1ZSgxLCBmYWxzZSlcblxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGNvbnN0IHRpbWUgPSBhdWRpb0N0cmwuZ2V0Q3VycmVudFRpbWUoKVxuXHRcdFx0XHRjcmVhdGVIb3RDdWUoZGVjaywgMSwgdGltZSlcblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0bWlkaUN0cmwub24oJ0xPT1BfQVVUTycsICh7IGRlY2ssIGtleSB9KSA9PiB7XG5cdFx0XHRjb25zdCBhdWRpb0N0cmwgPSBnZXRBdWRpb0N0cmwoZGVjaylcblx0XHRcdGxldCBzdGFydFRpbWUgPSBhdWRpb0N0cmwuZ2V0Q3VycmVudFRpbWUoKVxuXHRcdFx0Y29uc3QgZHVyYXRpb24gPSA2MCAvIGF1ZGlvQ3RybC5nZXRCcG0oKSAqICgxIDw8IChrZXkgLSAxKSlcblx0XHRcdHN0YXJ0VGltZSA9IGF1ZGlvQ3RybC5hdXRvTG9vcEFjdGl2YXRlKGtleSwgc3RhcnRUaW1lLCBkdXJhdGlvbilcblx0XHRcdGlmIChzdGFydFRpbWUgPT0gMCkge1xuXHRcdFx0XHRyZW1vdmVMb29wKGRlY2spXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Y3JlYXRlTG9vcChkZWNrLCBzdGFydFRpbWUsIGR1cmF0aW9uKVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRtaWRpQ3RybC5vbignU0FNUExFUicsICh7IGRlY2ssIGtleSB9KSA9PiB7XG5cdFx0XHRnZXRBdWRpb0N0cmwoZGVjaykucGxheVNhbXBsZShrZXkpXG5cdFx0fSlcblxuXHRcdG1pZGlDdHJsLm9uKCdMT09QX01BTlVBTCcsICh7IGRlY2ssIGtleSB9KSA9PiB7XG5cdFx0XHRjb25zdCBhdWRpb0N0cmwgPSBnZXRBdWRpb0N0cmwoZGVjaylcblx0XHRcdGlmIChrZXkgPT0gMSkge1xuXHRcdFx0XHRjb25zdCBzdGFydFRpbWUgPSBhdWRpb0N0cmwuZ2V0Q3VycmVudFRpbWUoKVxuXHRcdFx0XHRhdWRpb0N0cmwuc2V0U3RhcnRMb29wVGltZShzdGFydFRpbWUpXG5cdFx0XHRcdGNyZWF0ZUxvb3AoZGVjaywgc3RhcnRUaW1lLCAwKVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoa2V5ID09IDIpIHtcblx0XHRcdFx0Y29uc3Qgc3RhcnRUaW1lID0gYXVkaW9DdHJsLmdldFN0YXJ0TG9vcFRpbWUoKVxuXHRcdFx0XHRjb25zdCBlbmRUaW1lID0gYXVkaW9DdHJsLmdldEN1cnJlbnRUaW1lKClcblx0XHRcdFx0YXVkaW9DdHJsLnNldEVuZExvb3BUaW1lKGVuZFRpbWUpXG5cdFx0XHRcdGNyZWF0ZUxvb3AoZGVjaywgc3RhcnRUaW1lLCBlbmRUaW1lIC0gc3RhcnRUaW1lKVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoa2V5ID09IDMpIHtcblx0XHRcdFx0YXVkaW9DdHJsLmNsZWFyTG9vcCgpXG5cdFx0XHRcdHJlbW92ZUxvb3AoZGVjaylcblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0bWlkaUN0cmwub24oJ0hPVF9DVUUnLCAoeyBkZWNrLCBrZXkgfSkgPT4ge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnSE9UX0NVRScsIHsgZGVjaywga2V5IH0pXG5cdFx0XHRjb25zdCBhdWRpb0N0cmwgPSBnZXRBdWRpb0N0cmwoZGVjaylcblx0XHRcdGlmIChrZXkgPT0gMSkge1xuXHRcdFx0XHRhdWRpb0N0cmwudG9nZ2xlSG90Y3VlRGVsZXRlTW9kZSgpXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblxuXHRcdFx0XHRpZiAoYXVkaW9DdHJsLmlzSG90Y3VlRGVsZXRlTW9kZSgpKSB7XG5cdFx0XHRcdFx0ZGVsZXRlSG90Q3VlKGRlY2ssIGtleSlcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gYXVkaW9DdHJsLmdldEhvdGN1ZShrZXkpXG5cblx0XHRcdFx0XHRpZiAoaW5mbyA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHRpbWUgPSBhdWRpb0N0cmwuZ2V0Q3VycmVudFRpbWUoKVxuXHRcdFx0XHRcdFx0Y3JlYXRlSG90Q3VlKGRlY2ssIGtleSwgdGltZSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRhdWRpb0N0cmwuanVtcFRvSG90Y3VlKGtleSwgdHJ1ZSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cblx0XHRtaWRpQ3RybC5vbignUEZMJywgKHsgZGVjayB9KSA9PiB7XG5cdFx0XHRpZiAoZGVjayA9PSAxKSB7XG5cdFx0XHRcdGN1ZUNyb3NzRmFkZXIuc2V0RmFkZXJMZXZlbCgwKVxuXHRcdFx0XHRtaWRpQ3RybC5zZXRCdXR0b25JbnRlbnNpdHkoJ1BGTCcsIDEsIDEpXG5cdFx0XHRcdG1pZGlDdHJsLnNldEJ1dHRvbkludGVuc2l0eSgnUEZMJywgMCwgMilcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRjdWVDcm9zc0ZhZGVyLnNldEZhZGVyTGV2ZWwoMSlcblx0XHRcdFx0bWlkaUN0cmwuc2V0QnV0dG9uSW50ZW5zaXR5KCdQRkwnLCAwLCAxKVxuXHRcdFx0XHRtaWRpQ3RybC5zZXRCdXR0b25JbnRlbnNpdHkoJ1BGTCcsIDEsIDIpXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdG1pZGlDdHJsLm9uKCdNQVNURVJfTEVWRUwnLCAoeyB2ZWxvY2l0eSB9KSA9PiB7XG5cdFx0XHRjb25zdCBtYXN0ZXJWb2x1bWUgPSBtYXAodmVsb2NpdHkpXG5cdFx0XHRtYXN0ZXJDcm9zc0ZhZGVyLnNldE1hc3RlckxldmVsKG1hc3RlclZvbHVtZSlcblx0XHRcdGN0cmwuc2V0RGF0YSh7IG1hc3RlclZvbHVtZSB9KVxuXHRcdH0pXG5cblx0XHRtaWRpQ3RybC5vbignQ1VFX0xFVkVMJywgKHsgdmVsb2NpdHkgfSkgPT4ge1xuXHRcdFx0Y29uc3QgY3VlVm9sdW1lID0gbWFwKHZlbG9jaXR5KVxuXHRcdFx0Y3VlQ3Jvc3NGYWRlci5zZXRNYXN0ZXJMZXZlbChjdWVWb2x1bWUpXG5cdFx0XHRjdHJsLnNldERhdGEoeyBjdWVWb2x1bWUgfSlcblx0XHR9KVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gaW5pdCgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdpbml0Jylcblx0XHRcdGNvbnN0IGluZm8gPSBhd2FpdCBtaWRpQ3RybC5yZXF1ZXN0TUlESUFjY2VzcygpXG5cblx0XHRcdC8vY29uc29sZS5sb2coJ3BsYXlsaXN0cycsIHBsYXlsaXN0cylcblx0XHRcdGN0cmwuc2V0RGF0YShpbmZvKVxuXHRcdFx0aWYgKGluZm8ubWlkaUlucHV0cy5sZW5ndGggPiAxKSB7XG5cdFx0XHRcdGNvbnN0IHNlbGVjdGVkSW5wdXQgPSBpbmZvLm1pZGlJbnB1dHNbMV0udmFsdWVcblx0XHRcdFx0Y3RybC5zZXREYXRhKHsgc2VsZWN0ZWRJbnB1dCB9KVxuXHRcdFx0XHRzZWxlY3RNaWRpRGV2aWNlKHNlbGVjdGVkSW5wdXQpXG5cdFx0XHR9XG5cdFx0XHRsYW9kU2FtcGxlcnMoKVxuXHRcdH1cblxuXG5cblx0XHQvKipAdHlwZSB7REpNaXguQ29udHJvbC5GaWxlTGlzdC5JbnRlcmZhY2V9ICovXG5cdFx0Y29uc3QgZmlsZUxpc3QgPSBjdHJsLnNjb3BlLmZpbGVsaXN0XG5cblx0XHQvKipAdHlwZSB7REpNaXguQ29udHJvbC5BdWRpb1BsYXllci5JbnRlcmZhY2V9ICovXG5cdFx0Y29uc3QgYXVkaW8xID0gY3RybC5zY29wZS5hdWRpbzFcblxuXHRcdC8qKkB0eXBlIHtESk1peC5Db250cm9sLkF1ZGlvUGxheWVyLkludGVyZmFjZX0gKi9cblx0XHRjb25zdCBhdWRpbzIgPSBjdHJsLnNjb3BlLmF1ZGlvMlxuXG5cdFx0LyoqQHR5cGUge0FycmF5PEhUTUxFbGVtZW50Pn0gKi9cblx0XHRjb25zdCBydW5uaW5nQnVmZmVycyA9IFtjdHJsLnNjb3BlLnJ1bm5pbmdCdWZmZXIxLmdldCgwKSwgY3RybC5zY29wZS5ydW5uaW5nQnVmZmVyMi5nZXQoMCldXG5cblx0XHQvKipAdHlwZSB7QXJyYXk8SFRNTEVsZW1lbnQ+fSAqL1xuXHRcdGNvbnN0IGhvdGN1ZUNvbnRhaW5lcnMgPSBbY3RybC5zY29wZS5ob3RjdWVDb250YWluZXIxLmdldCgwKSwgY3RybC5zY29wZS5ob3RjdWVDb250YWluZXIyLmdldCgwKV1cblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IHJ1bm5pbmdCdWZmZXIgXG5cdFx0ICogQHJldHVybnMgXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gY3JlYXRlQ2FudmFzKHJ1bm5pbmdCdWZmZXIpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdjcmVhdGVDYW52YXMnKVxuXHRcdFx0Y29uc3QgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJylcblx0XHRcdGNhbnZhcy53aWR0aCA9IE1BWF9DQU5WQVNfV0lEVEhcblx0XHRcdGNhbnZhcy5oZWlnaHQgPSBSVU5OSU5HX0RJU1BMQVlfSEVJR0hUXG5cdFx0XHRydW5uaW5nQnVmZmVyLmFwcGVuZENoaWxkKGNhbnZhcylcblx0XHRcdGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG5cdFx0XHRjdHguY2xlYXJSZWN0KDAsIDAsIE1BWF9DQU5WQVNfV0lEVEgsIFJVTk5JTkdfRElTUExBWV9IRUlHSFQpXG5cblx0XHRcdHJldHVybiBjdHhcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge0F1ZGlvQnVmZmVyfSBhdWRpb0J1ZmZlciBcblx0XHQgKiBAcGFyYW0ge251bWJlcn0gZGVjayBcblx0XHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkJlYXREZXRlY3Rvci5CZWF0SW5mb30gYmVhdEluZm9cblx0XHQgKi9cblx0XHRmdW5jdGlvbiBkcmF3UnVubmluZ0J1ZmZlcihhdWRpb0J1ZmZlciwgZGVjaywgYmVhdEluZm8pIHtcblxuXHRcdFx0Y29uc29sZS5sb2coJ2J1ZmZlckxlbmd0aCcsIGF1ZGlvQnVmZmVyLmxlbmd0aClcblx0XHRcdGNvbnN0IGJlYXRJbnRlcnZhbCA9IE1hdGgudHJ1bmMoZ2V0T2Zmc2V0KDYwIC8gYmVhdEluZm8uYnBtKSlcblx0XHRcdGNvbnNvbGUubG9nKCdiZWF0SW50ZXJ2YWwnLCBiZWF0SW50ZXJ2YWwpXG5cdFx0XHRjb25zdCBiZWF0T2Zmc2V0ID0gTWF0aC50cnVuYyhnZXRPZmZzZXQoYmVhdEluZm8ub2Zmc2V0KSlcblx0XHRcdGNvbnNvbGUubG9nKCdiZWF0T2Zmc2V0JywgYmVhdE9mZnNldClcblx0XHRcdGNvbnNvbGUubG9nKCdkdXJhdGlvbicsIGF1ZGlvQnVmZmVyLmR1cmF0aW9uKVxuXG5cdFx0XHRjb25zdCBydW5uaW5nQnVmZmVyID0gcnVubmluZ0J1ZmZlcnNbZGVjayAtIDFdXG5cdFx0XHRjb25zdCBjb2xvciA9IGNvbG9yc1tkZWNrIC0gMV1cblxuXHRcdFx0Y29uc3Qgd2lkdGggPSBNYXRoLmZsb29yKFJVTk5JTkdfRElTUExBWV9XSURUSCAqIGF1ZGlvQnVmZmVyLmR1cmF0aW9uIC8gU0VDT05EU19PRl9SVU5OSU5HX0RJU1BMQVkpXG5cdFx0XHRjb25zb2xlLmxvZygnd2lkdGgnLCB3aWR0aClcblxuXHRcdFx0Y29uc3QgZGF0YSA9IGF1ZGlvQnVmZmVyLmdldENoYW5uZWxEYXRhKDApXG5cdFx0XHRjb25zdCBzdGVwID0gTWF0aC5mbG9vcihTRUNPTkRTX09GX1JVTk5JTkdfRElTUExBWSAqIGF1ZGlvQnVmZmVyLnNhbXBsZVJhdGUgLyBSVU5OSU5HX0RJU1BMQVlfV0lEVEgpXG5cdFx0XHRjb25zb2xlLmxvZygnc3RlcCcsIHN0ZXApXG5cdFx0XHRjb25zdCBhbXAgPSBSVU5OSU5HX0RJU1BMQVlfSEVJR0hUIC8gMlxuXG5cdFx0XHRsZXQgY3R4ID0gY3JlYXRlQ2FudmFzKHJ1bm5pbmdCdWZmZXIpXG5cdFx0XHRmb3IgKGxldCBpID0gMCwgayA9IDA7IGkgPCB3aWR0aDsgaSsrLCBrKyspIHtcblx0XHRcdFx0aWYgKGsgPT0gTUFYX0NBTlZBU19XSURUSCkge1xuXHRcdFx0XHRcdGN0eCA9IGNyZWF0ZUNhbnZhcyhydW5uaW5nQnVmZmVyKVxuXHRcdFx0XHRcdGsgPSAwXG5cdFx0XHRcdH1cblx0XHRcdFx0bGV0IG1pbiA9IDEuMFxuXHRcdFx0XHRsZXQgbWF4ID0gLTEuMFxuXHRcdFx0XHRmb3IgKGxldCBqID0gMDsgaiA8IHN0ZXA7IGorKykge1xuXHRcdFx0XHRcdGNvbnN0IGRhdG51bSA9IGRhdGFbKGkgKiBzdGVwKSArIGpdXG5cdFx0XHRcdFx0aWYgKGRhdG51bSA8IG1pbilcblx0XHRcdFx0XHRcdG1pbiA9IGRhdG51bVxuXHRcdFx0XHRcdGlmIChkYXRudW0gPiBtYXgpXG5cdFx0XHRcdFx0XHRtYXggPSBkYXRudW1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGN0eC5maWxsU3R5bGUgPSBjb2xvclxuXHRcdFx0XHRjdHguZmlsbFJlY3QoaywgKDEgKyBtaW4pICogYW1wLCAxLCBNYXRoLm1heCgxLCAobWF4IC0gbWluKSAqIGFtcCkpO1xuXG5cdFx0XHRcdGlmICgoTWF0aC5hYnMoaSAtIGJlYXRPZmZzZXQpICUgYmVhdEludGVydmFsKSA9PSAwKSB7XG5cdFx0XHRcdFx0Y3R4LmZpbGxTdHlsZSA9ICdibGFjaydcblx0XHRcdFx0XHRjdHguZmlsbFJlY3QoaywgMCwgMSwgUlVOTklOR19ESVNQTEFZX0hFSUdIVClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlRGlzcGxheSgpIHtcblx0XHRcdGlmIChhdWRpbzEuaXNMb2FkZWQoKSkge1xuXHRcdFx0XHR1cGRhdGVUaW1lKGF1ZGlvMS5nZXRSZWFsVGltZSgpLCAxKVxuXHRcdFx0fVxuXHRcdFx0aWYgKGF1ZGlvMi5pc0xvYWRlZCgpKSB7XG5cdFx0XHRcdHVwZGF0ZVRpbWUoYXVkaW8yLmdldFJlYWxUaW1lKCksIDIpXG5cdFx0XHR9XG5cdFx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlRGlzcGxheSlcblx0XHR9XG5cblx0XHR1cGRhdGVEaXNwbGF5KClcblxuXHRcdGNvbnN0IHNvdXJjZTEgPSBhdWRpbzEuZ2V0T3V0cHV0Tm9kZSgpXG5cdFx0Y29uc3Qgc291cmNlMiA9IGF1ZGlvMi5nZXRPdXRwdXROb2RlKClcblxuXHRcdGN0cmwuc2V0RGF0YSh7IHNvdXJjZTEsIHNvdXJjZTIgfSlcblxuXHRcdGNvbnN0IG1hc3RlckNyb3NzRmFkZXIgPSBhdWRpb1Rvb2xzLmNyZWF0ZUNyb3NzRmFkZXJXaXRoTWFzdGVyTGV2ZWwoc291cmNlMSwgc291cmNlMilcblxuXHRcdGNvbnN0IGN1ZUNyb3NzRmFkZXIgPSBhdWRpb1Rvb2xzLmNyZWF0ZUNyb3NzRmFkZXJXaXRoTWFzdGVyTGV2ZWwoc291cmNlMSwgc291cmNlMilcblx0XHRjdWVDcm9zc0ZhZGVyLnNldEZhZGVyTGV2ZWwoMSlcblxuXHRcdGNvbnN0IG1lcmdlciA9IGF1ZGlvVG9vbHMuY3JlYXRlU3RlcmVvTWVyZ2VyKG1hc3RlckNyb3NzRmFkZXIuZ2V0T3V0cHV0Tm9kZSgpLCBjdWVDcm9zc0ZhZGVyLmdldE91dHB1dE5vZGUoKSlcblxuXHRcdGF1ZGlvVG9vbHMuY3JlYXRlRGVzdGluYXRpb24oNCwgbWVyZ2VyKVxuXG5cdFx0aW5pdCgpXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIvL0B0cy1jaGVja1xuKGZ1bmN0aW9uICgpIHtcblxuXG5cdGZ1bmN0aW9uIHNvcnRGaWxlcyhmaWxlcykge1xuXHRcdGZpbGVzLnNvcnQoKGEsIGIpID0+IHtcblx0XHRcdHJldHVybiBhLmFydGlzdC5sb2NhbGVDb21wYXJlKGIuYXJ0aXN0KVxuXHRcdH0pXG5cdH1cblxuXHRmdW5jdGlvbiBzb3J0RmlsZXNCeUdlbnJlKGZpbGVzKSB7XG5cdFx0ZmlsZXMuc29ydCgoYSwgYikgPT4ge1xuXHRcdFx0Y29uc3QgZ2VucmUxID0gYS5nZW5yZSB8fCAnV1dXVydcblx0XHRcdGNvbnN0IGdlbnJlMiA9IGIuZ2VucmUgfHwgJ1dXV1cnXG5cdFx0XHRsZXQgcmV0ID0gZ2VucmUxLmxvY2FsZUNvbXBhcmUoZ2VucmUyKVxuXHRcdFx0aWYgKHJldCA9PSAwKSB7XG5cdFx0XHRcdHJldCA9IGEuYXJ0aXN0LmxvY2FsZUNvbXBhcmUoYi5hcnRpc3QpXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmV0XG5cdFx0fSlcblx0fVxuXG5cblx0JCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2ZpbGVsaXN0Jywge1xuXHRcdGRlcHM6IFsnYnJlaXpib3QuZmlsZXMnXSxcblx0XHRwcm9wczoge1xuXHRcdFx0ZmlsZXM6IFtdXG5cdFx0fSxcblxuXHRcdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cdDx0YWJsZSBjbGFzcz1cXFwidzMtdGFibGUtYWxsIHczLWhvdmVyYWJsZSB3My1zbWFsbFxcXCI+XFxuXHRcdDx0aGVhZD5cXG5cdFx0XHQ8dHI+XFxuXHRcdFx0XHQ8dGggY2xhc3M9XFxcInNvcnRlZENvbFxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblNvcnRBcnRpc3RcXFwiPlxcblx0XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmFzIGZhLXNvcnQtZG93blxcXCIgYm4tc2hvdz1cXFwiaXNTb3J0ZWRCeUFydGlzdFxcXCI+PC9pPlxcblx0XHRcdFx0XHQ8c3Bhbj5BcmlzdDwvc3Bhbj5cXG5cdFx0XHRcdDwvdGg+XFxuXHRcdFx0XHQ8dGg+VGl0bGU8L3RoPlxcblx0XHRcdFx0PHRoIGNsYXNzPVxcXCJzb3J0ZWRDb2xcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25Tb3J0R2VucmVcXFwiPlxcblx0XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmFzIGZhLXNvcnQtZG93blxcXCIgYm4tc2hvdz1cXFwiaXNTb3J0ZWRCeUdlbnJlXFxcIj48L2k+XFxuXHRcdFx0XHRcdDxzcGFuPkdlbnJlPC9zcGFuPlxcblx0XHRcdFx0PC90aD5cXG5cdFx0XHRcdDx0aD5EdXJhdGlvbjwvdGg+XFxuXHRcdFx0XHQ8dGg+QlBNPC90aD5cXG5cdFx0XHQ8L3RyPlxcblx0XHQ8L3RoZWFkPlxcblx0XHQ8dGJvZHkgYm4tZWFjaD1cXFwiZmlsZXNcXFwiIGJuLWl0ZXI9XFxcImZcXFwiIGJuLWxhenp5PVxcXCIxMFxcXCIgYm4tYmluZD1cXFwiZmlsZXNcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5pdGVtOiBvbkl0ZW1DbGlja1xcXCI+XFxuXHRcdFx0PHRyIGNsYXNzPVxcXCJpdGVtXFxcIj5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuZi5hcnRpc3RcXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLmYudGl0bGVcXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLmYuZ2VucmVcXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiZ2V0RHVyYXRpb25cXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLmYuYnBtXFxcIj48L3RkPlxcblx0XHRcdDwvdHI+XFxuXHRcdDwvdGJvZHk+XFxuXHQ8L3RhYmxlPlxcblxcbjwvZGl2PlwiLFxuXG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIHsqfSBlbHQgXG5cdFx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5GaWxlcy5JbnRlcmZhY2V9IHNydkZpbGVzIFxuXHRcdCAqL1xuXHRcdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHNydkZpbGVzKSB7XG5cblxuXHRcdFx0bGV0IHtcblx0XHRcdFx0ZmlsZXNcblx0XHRcdH0gPSB0aGlzLnByb3BzXG5cblx0XHRcdC8vc29ydEZpbGVzKGZpbGVzKVxuXG5cdFx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGZpbGVzLFxuXHRcdFx0XHRcdHNvcnRGaWVsZDogJycsXG5cblx0XHRcdFx0XHRpc1NvcnRlZEJ5QXJ0aXN0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLnNvcnRGaWVsZCA9PSAnYXJ0aXN0J1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aXNTb3J0ZWRCeUdlbnJlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLnNvcnRGaWVsZCA9PSAnZ2VucmUnXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdGdldER1cmF0aW9uOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHsgbGVuZ3RoIH0gPSBzY29wZS5mXG5cdFx0XHRcdFx0XHRyZXR1cm4gKGxlbmd0aCkgPyAkJC5tZWRpYS5nZXRGb3JtYXRlZFRpbWUobGVuZ3RoKSA6ICcnXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRldmVudHM6IHtcblxuXHRcdFx0XHRcdG9uU29ydEFydGlzdDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRzb3J0RmlsZXMoY3RybC5tb2RlbC5maWxlcylcblx0XHRcdFx0XHRcdGN0cmwubW9kZWwuc29ydEZpZWxkID0gJ2FydGlzdCdcblx0XHRcdFx0XHRcdGN0cmwudXBkYXRlKClcblxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvblNvcnRHZW5yZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRzb3J0RmlsZXNCeUdlbnJlKGN0cmwubW9kZWwuZmlsZXMpXG5cdFx0XHRcdFx0XHRjdHJsLm1vZGVsLnNvcnRGaWVsZCA9ICdnZW5yZSdcblx0XHRcdFx0XHRcdGN0cmwudXBkYXRlKClcblxuXHRcdFx0XHRcdH0sXG5cblx0XHRcdFx0XHRvbkl0ZW1DbGljazogZnVuY3Rpb24gKGV2KSB7XG5cdFx0XHRcdFx0XHRldi5zdG9wUHJvcGFnYXRpb24oKVxuXG5cdFx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmluZGV4KClcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2lkeCcsIGlkeClcblx0XHRcdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmZpbGVzW2lkeF1cblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2luZm8nLCBpbmZvKVxuXHRcdFx0XHRcdFx0JCh0aGlzKS5jbG9zZXN0KCd0Ym9keScpLmZpbmQoJy5hY3RpdmUnKS5yZW1vdmVDbGFzcygnYWN0aXZlJylcblx0XHRcdFx0XHRcdCQodGhpcykuYWRkQ2xhc3MoJ2FjdGl2ZScpXG5cblx0XHRcdFx0XHRcdGNvbnN0IGRhdGEgPSB7XG5cdFx0XHRcdFx0XHRcdGZpbGVOYW1lOiBpbmZvLm5hbWUsXG5cdFx0XHRcdFx0XHRcdHJvb3REaXI6IGN0cmwubW9kZWwucm9vdERpcixcblx0XHRcdFx0XHRcdFx0aXNJbWFnZTogaW5mby5pc0ltYWdlLFxuXHRcdFx0XHRcdFx0XHRtcDM6IGluZm8ubXAzXG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGVsdC50cmlnZ2VyKCdmaWxlY2xpY2snLCBkYXRhKVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXG5cdFx0XHQvKipAdHlwZSB7SlF1ZXJ5PEhUTUxFbGVtZW50Pn0gKi9cblx0XHRcdGNvbnN0IGZpbGVFbHQgPSBjdHJsLnNjb3BlLmZpbGVzXG5cblx0XHRcdHRoaXMuc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ3NldERhdGEnLCBkYXRhKVxuXHRcdFx0XHRpZiAoZGF0YS5maWxlcykge1xuXHRcdFx0XHRcdC8vc29ydEZpbGVzKGRhdGEuZmlsZXMpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgZmlsZXM6IGRhdGEuZmlsZXMsIHNvcnRGaWVsZDogJycgfSlcblx0XHRcdFx0XHRmaWxlRWx0LmZpbmQoJy5pdGVtJykuZXEoMCkuYWRkQ2xhc3MoJ2FjdGl2ZScpXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnNlbFVwID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRjb25zdCBzZWxFbHQgPSBmaWxlRWx0LmZpbmQoJy5hY3RpdmUnKVxuXHRcdFx0XHRjb25zdCBpZHggPSBzZWxFbHQuaW5kZXgoKVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdzZWxVcCcsIGlkeClcblx0XHRcdFx0aWYgKGlkeCA+IDApIHtcblx0XHRcdFx0XHRzZWxFbHQucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpXG5cdFx0XHRcdFx0Y29uc3QgaXRlbXMgPSBmaWxlRWx0LmZpbmQoJy5pdGVtJylcblx0XHRcdFx0XHRpdGVtcy5lcShpZHggLSAxKS5hZGRDbGFzcygnYWN0aXZlJylcblx0XHRcdFx0XHRpZiAoaWR4IC0gMSA+IDApIHtcblx0XHRcdFx0XHRcdGl0ZW1zLmVxKGlkeCAtIDIpLmdldCgwKS5zY3JvbGxJbnRvVmlld0lmTmVlZGVkKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRpdGVtcy5lcShpZHggLSAxKS5nZXQoMCkuc2Nyb2xsSW50b1ZpZXdJZk5lZWRlZCgpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vc2VsRWx0LmdldCgwKS5zY3JvbGxJbnRvVmlldygpXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zZWxEb3duID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRjb25zdCBzZWxFbHQgPSBmaWxlRWx0LmZpbmQoJy5hY3RpdmUnKVxuXHRcdFx0XHRjb25zdCBpZHggPSBzZWxFbHQuaW5kZXgoKVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdzZWxEb3duJywgaWR4KVxuXHRcdFx0XHRpZiAoaWR4IDwgY3RybC5tb2RlbC5maWxlcy5sZW5ndGggLSAxKSB7XG5cdFx0XHRcdFx0c2VsRWx0LnJlbW92ZUNsYXNzKCdhY3RpdmUnKVxuXHRcdFx0XHRcdGZpbGVFbHQuZmluZCgnLml0ZW0nKS5lcShpZHggKyAxKS5hZGRDbGFzcygnYWN0aXZlJykuZ2V0KDApLnNjcm9sbEludG9WaWV3SWZOZWVkZWQoZmFsc2UpXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5nZXRTZWxGaWxlID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRjb25zdCBpZHggPSBmaWxlRWx0LmZpbmQoJy5hY3RpdmUnKS5pbmRleCgpXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2lkeCcsIGlkeClcblx0XHRcdFx0cmV0dXJuIChpZHggPCAwKSA/IG51bGwgOiBjdHJsLm1vZGVsLmZpbGVzW2lkeF1cblxuXHRcdFx0fVxuXG5cdFx0fVxuXHR9KTtcblxufSkoKTtcbiIsIi8vQHRzLWNoZWNrXG4oZnVuY3Rpb24gKCkge1xuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtIVE1MQ2FudmFzRWxlbWVudH0gYnVmZmVyQ2FudmFzXG5cdCAqIEBwYXJhbSB7KHRpbWU6IG51bWJlcikgPT4gdm9pZH0gb25UaW1lVXBkYXRlXG5cdCAqL1xuXHRmdW5jdGlvbiBjcmVhdGVCdWZmZXJEaXNwbGF5KGJ1ZmZlckNhbnZhcywgb25UaW1lVXBkYXRlKSB7XG5cdFx0Y29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSBidWZmZXJDYW52YXNcblx0XHRjb25zb2xlLmxvZyh7IHdpZHRoLCBoZWlnaHQgfSlcblx0XHRjb25zdCBidWZmZXJDYW52YXNDdHggPSBidWZmZXJDYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuXG5cdFx0aWYgKHR5cGVvZiBvblRpbWVVcGRhdGUgPT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0YnVmZmVyQ2FudmFzLm9uY2xpY2sgPSBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ29uY2xpY2snLCBldi5vZmZzZXRYKVxuXHRcdFx0XHRjb25zdCB0aW1lID0gZXYub2Zmc2V0WCAvIHdpZHRoICogYXVkaW9CdWZmZXIuZHVyYXRpb25cblx0XHRcdFx0b25UaW1lVXBkYXRlKHRpbWUpXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Y29uc3QgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJylcblx0XHRjYW52YXMud2lkdGggPSB3aWR0aFxuXHRcdGNhbnZhcy5oZWlnaHQgPSBoZWlnaHRcblx0XHRjb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuXG5cdFx0LyoqQHR5cGUge0F1ZGlvQnVmZmVyfSAqL1xuXHRcdGxldCBhdWRpb0J1ZmZlciA9IG51bGxcblxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gbG9hZCh1cmwpIHtcblx0XHRcdGF1ZGlvQnVmZmVyID0gYXdhaXQgJCQubWVkaWEuZ2V0QXVkaW9CdWZmZXIodXJsKVxuXHRcdFx0Y29uc29sZS5sb2coJ2R1cmF0aW9uJywgYXVkaW9CdWZmZXIuZHVyYXRpb24pXG5cdFx0XHQkJC5tZWRpYS5kcmF3QXVkaW9CdWZmZXIod2lkdGgsIGhlaWdodCAtIDEwLCBjdHgsIGF1ZGlvQnVmZmVyLCAnYmxhY2snKVxuXHRcdFx0dXBkYXRlKDApXG5cdFx0XHRyZXR1cm4gYXVkaW9CdWZmZXJcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge251bWJlcn0gYnVmZmVyVGltZSBcblx0XHQgKi9cblx0XHRmdW5jdGlvbiB1cGRhdGUoYnVmZmVyVGltZSkge1xuXHRcdFx0aWYgKGF1ZGlvQnVmZmVyKSB7XG5cdFx0XHRcdGJ1ZmZlckNhbnZhc0N0eC5jbGVhclJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodClcblx0XHRcdFx0YnVmZmVyQ2FudmFzQ3R4LmRyYXdJbWFnZShjYW52YXMsIDAsIDUpXG5cdFx0XHRcdGNvbnN0IGJveFdpZHRoID0gd2lkdGggKiBidWZmZXJUaW1lIC8gYXVkaW9CdWZmZXIuZHVyYXRpb25cblx0XHRcdFx0YnVmZmVyQ2FudmFzQ3R4LmZpbGxTdHlsZSA9ICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMzMpJ1xuXHRcdFx0XHRidWZmZXJDYW52YXNDdHguZmlsbFJlY3QoMCwgMCwgYm94V2lkdGgsIGhlaWdodClcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0bG9hZCxcblx0XHRcdHVwZGF0ZVxuXHRcdH1cblx0fVxuXG5cblx0JCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2F1ZGlvcGxheWVyJywge1xuXG5cdFx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXFxuXHQ8c3Ryb25nIGJuLXRleHQ9XFxcIm5hbWVcXFwiPjwvc3Ryb25nPlxcblx0PGRpdiBibi1zaG93PVxcXCJsb2FkZWRcXFwiPkJQTTogPHN0cm9uZyBibi10ZXh0PVxcXCJnZXRCcG1cXFwiPjwvc3Ryb25nPjwvZGl2Plxcblxcblxcblx0PGRpdj5cXG5cdFx0PGJ1dHRvbiBibi1zaG93PVxcXCJzaG93UGxheVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblBsYXlcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZSB3My1wYWRkaW5nLXNtYWxsXFxcIiB0aXRsZT1cXFwiUGxheVxcXCIgYm4taWNvbj1cXFwiZmEgZmEtcGxheVxcXCI+XFxuXHRcdDwvYnV0dG9uPlxcblxcblx0XHQ8YnV0dG9uIGJuLXNob3c9XFxcInBsYXlpbmdcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25QYXVzZVxcXCIgY2xhc3M9XFxcInczLWJ0biB3My1ibHVlIHczLXBhZGRpbmctc21hbGxcXFwiIHRpdGxlPVxcXCJQYXVzZVxcXCIgYm4taWNvbj1cXFwiZmEgZmEtcGF1c2VcXFwiPlxcblx0XHQ8L2J1dHRvbj5cXG5cXG5cdDwvZGl2PlxcblxcbjwvZGl2PlxcblxcblxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcImJ1ZmZlckNvbnRhaW5lclxcXCIgYm4tc2hvdz1cXFwic2hvd0J1ZmZlclxcXCI+XFxuXHQ8Y2FudmFzIGJuLWJpbmQ9XFxcImJ1ZmZlckNhbnZhc1xcXCIgY2xhc3M9XFxcImJ1ZmZlckNhbnZhc1xcXCIgd2lkdGg9XFxcIjQ3MFxcXCIgaGVpZ2h0PVxcXCIxMDBcXFwiPlxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcImNvbnRlbnRcXFwiPlxcblx0PGRpdiBjbGFzcz1cXFwic2FtcGxlcnNcXFwiPlxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJzYW1wbGVyUGxheWVyXFxcIj5cXG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtYmx1ZSB3My1wYWRkaW5nLXNtYWxsXFxcIiBibi1pY29uPVxcXCJmYSBmYS1wbGF5XFxcIlxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvblBsYXlTYW1wbGVyXFxcIj48L2J1dHRvbj5cXG5cdFx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogc2FtcGxlcnN9XFxcIj48L2Rpdj5cXG5cdFx0PC9kaXY+XFxuXHRcdDxkaXYgY2xhc3M9XFxcInNhbXBsZXJQbGF5ZXJcXFwiPlxcblx0XHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1ibHVlIHczLXBhZGRpbmctc21hbGxcXFwiIGJuLWljb249XFxcImZhIGZhLXBsYXlcXFwiXFxuXHRcdFx0XHRibi1ldmVudD1cXFwiY2xpY2s6IG9uUGxheVNhbXBsZXJcXFwiPjwvYnV0dG9uPlxcblx0XHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBzYW1wbGVyc31cXFwiPjwvZGl2Plxcblx0XHQ8L2Rpdj5cXG5cdFx0PGRpdiBjbGFzcz1cXFwic2FtcGxlclBsYXllclxcXCI+XFxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLWJsdWUgdzMtcGFkZGluZy1zbWFsbFxcXCIgYm4taWNvbj1cXFwiZmEgZmEtcGxheVxcXCJcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25QbGF5U2FtcGxlclxcXCI+PC9idXR0b24+XFxuXHRcdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IHNhbXBsZXJzfVxcXCI+PC9kaXY+XFxuXHRcdDwvZGl2Plxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJzYW1wbGVyUGxheWVyXFxcIj5cXG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtYmx1ZSB3My1wYWRkaW5nLXNtYWxsXFxcIiBibi1pY29uPVxcXCJmYSBmYS1wbGF5XFxcIlxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcImNsaWNrOiBvblBsYXlTYW1wbGVyXFxcIj48L2J1dHRvbj5cXG5cdFx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogc2FtcGxlcnN9XFxcIj48L2Rpdj5cXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgY2xhc3M9XFxcInRvb2xiYXIyXFxcIj5cXG5cdFx0PHNwYW4+UElUQ0ggJiMxNzcgOCU8L3NwYW4+XFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5zbGlkZXJcXFwiIGJuLWRhdGE9XFxcInttaW46IDAuOTIsIG1heDoxLjA4LCBzdGVwOiAwLjAxLCBvcmllbnRhdGlvbjogXFwndmVydGljYWxcXCcsIHNob3dSYW5nZTogZmFsc2V9XFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJpbnB1dDogb25QaXRjaENoYW5nZVxcXCIgYm4tdmFsPVxcXCJwaXRjaFxcXCIgY2xhc3M9XFxcInZvbHVsbWVTbGlkZXJcXFwiPjwvZGl2Plxcblx0PC9kaXY+XFxuXFxuXHQ8ZGl2IGNsYXNzPVxcXCJ0b29sYmFyMlxcXCI+XFxuXHRcdDxzcGFuPkxFVkVMPC9zcGFuPlxcblx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuc2xpZGVyXFxcIiBibi1kYXRhPVxcXCJ7bWluOiAwLCBtYXg6MSwgc3RlcDogMC4wMSwgb3JpZW50YXRpb246IFxcJ3ZlcnRpY2FsXFwnfVxcXCJcXG5cdFx0XHRibi1ldmVudD1cXFwiaW5wdXQ6IG9uVm9sdW1lQ2hhbmdlXFxcIiBibi12YWw9XFxcInZvbHVtZVxcXCIgY2xhc3M9XFxcInZvbHVsbWVTbGlkZXJcXFwiPjwvZGl2Plxcblx0PC9kaXY+XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwic2xpZGVyXFxcIj5cXG5cdDxzcGFuIGJuLXRleHQ9XFxcImdldFRpbWVJbmZvXFxcIj48L3NwYW4+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuc2xpZGVyXFxcIiBibi1kYXRhPVxcXCJ7bWF4OiBkdXJhdGlvbn1cXFwiIGJuLWV2ZW50PVxcXCJpbnB1dDogb25TbGlkZXJDaGFuZ2VcXFwiIGJuLXZhbD1cXFwiY3VyVGltZVxcXCI+XFxuXHQ8L2Rpdj5cXG5cXG48L2Rpdj5cIixcblxuXHRcdGRlcHM6IFsnYnJlaXpib3QucGFnZXInLCAnQXVkaW9Ub29scycsICdNSURJQ3RybCcsICdicmVpemJvdC5iZWF0ZGV0ZWN0b3InXSxcblxuXHRcdHByb3BzOiB7XG5cdFx0XHRzaG93QnVmZmVyOiBmYWxzZSxcblx0XHRcdGRlY2s6IDFcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyXG5cdFx0ICogQHBhcmFtIHtESk1peC5TZXJ2aWNlLkF1ZGlvVG9vbHMuSW50ZXJmYWNlfSBhdWRpb1Rvb2xzXG5cdFx0ICogQHBhcmFtIHtESk1peC5TZXJ2aWNlLk1JRElDdHJsLkludGVyZmFjZX0gbWlkaUN0cmxcblx0XHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkJlYXREZXRlY3Rvci5JbnRlcmZhY2V9IGJlYXRkZXRlY3RvclxuXHRcdCAqL1xuXHRcdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHBhZ2VyLCBhdWRpb1Rvb2xzLCBtaWRpQ3RybCwgYmVhdGRldGVjdG9yKSB7XG5cdFx0XHRjb25zb2xlLmxvZygncHJvcHMnLCB0aGlzLnByb3BzKVxuXG5cdFx0XHRjb25zdCB7IHNob3dCdWZmZXIsIGRlY2sgfSA9IHRoaXMucHJvcHNcblxuXHRcdFx0Y29uc3QgZ2V0VGltZSA9ICQkLm1lZGlhLmdldEZvcm1hdGVkVGltZVxuXG5cdFx0XHQvKipAdHlwZSB7JCQubWVkaWEuQXVkaW9QbGF5ZXJJbnRlcmZhY2V9ICovXG5cdFx0XHRsZXQgcGxheWVyID0gbnVsbFxuXG5cblx0XHRcdGNvbnN0IGF1ZGlvQ3R4ID0gYXVkaW9Ub29scy5nZXRBdWRpb0NvbnRleHQoKVxuXG5cdFx0XHRjb25zdCBnYWluTm9kZSA9IGF1ZGlvQ3R4LmNyZWF0ZUdhaW4oKVxuXHRcdFx0Ly9zb3VyY2VOb2RlLmNvbm5lY3QoZ2Fpbk5vZGUpXG5cblx0XHRcdGNvbnN0IG1hcFJhdGUgPSAkJC51dGlsLm1hcFJhbmdlKDAuOTIsIDEuMDgsIDEuMDgsIDAuOTIpXG5cblx0XHRcdGxldCBob3RjdWVzID0ge31cblx0XHRcdGxldCBpc0hvdGN1ZURlbGV0ZU1vZGUgPSBmYWxzZVxuXG5cdFx0XHRsZXQgYXV0b0xvb3AgPSAwXG5cdFx0XHRsZXQgbG9vcFN0YXJ0VGltZSA9IDBcblx0XHRcdGxldCBsb29wRW5kVGltZSA9IDBcblx0XHRcdGxldCBqb2dUb3VjaFByZXNzZWQgPSBmYWxzZVxuXG5cdFx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRzYW1wbGVyczogW10sXG5cdFx0XHRcdFx0dGVtcG86IDAsXG5cdFx0XHRcdFx0bmFtZTogJ05vIFRyYWNrIGxvYWRlZCcsXG5cdFx0XHRcdFx0dm9sdW1lOiAwLjUsXG5cdFx0XHRcdFx0cmF0ZTogMSxcblx0XHRcdFx0XHRwaXRjaDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIG1hcFJhdGUodGhpcy5yYXRlKVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZHVyYXRpb246IDAsXG5cdFx0XHRcdFx0Y3VyVGltZTogMCxcblx0XHRcdFx0XHRwbGF5aW5nOiBmYWxzZSxcblx0XHRcdFx0XHRsb2FkZWQ6IGZhbHNlLFxuXHRcdFx0XHRcdHNob3dCdWZmZXIsXG5cdFx0XHRcdFx0YnBtOiAwLFxuXHRcdFx0XHRcdGdldEJwbTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuICh0aGlzLmJwbSAqIHRoaXMucmF0ZSkudG9GaXhlZCgxKVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0Z2V0VGltZUluZm86IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHJldHVybiBgJHtnZXRUaW1lKHRoaXMuY3VyVGltZSwgdHJ1ZSl9IC8gJHtnZXRUaW1lKHRoaXMuZHVyYXRpb24pfWBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHNob3dQbGF5OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5sb2FkZWQgJiYgIXRoaXMucGxheWluZ1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRldmVudHM6IHtcblx0XHRcdFx0XHRvblBsYXlTYW1wbGVyOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBjb21ibyA9ICQodGhpcykuY2xvc2VzdCgnLnNhbXBsZXJQbGF5ZXInKS5maW5kKCcuYnJhaW5qcy1jb21ib2JveCcpXG5cdFx0XHRcdFx0XHRjb25zdCB2YWx1ZSA9IGNvbWJvLmdldFZhbHVlKClcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblBsYXlTYW1wbGVyJywgdmFsdWUpXG5cdFx0XHRcdFx0XHRwbGF5U2FtcGxlcih2YWx1ZSlcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdG9uVm9sdW1lQ2hhbmdlOiBmdW5jdGlvbiAoZXYsIHZhbHVlKSB7XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblZvbHVtZUNoYW5nZScsIHZhbHVlKVxuXHRcdFx0XHRcdFx0Z2Fpbk5vZGUuZ2Fpbi52YWx1ZSA9IHZhbHVlXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdG9uUGxheTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0cGxheSgpXG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdG9uUGF1c2U6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdHBhdXNlKClcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0b25TbGlkZXJDaGFuZ2U6IGZ1bmN0aW9uIChldiwgdmFsdWUpIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uU2xpZGVyQ2hhbmdlJywgdmFsdWUpXG5cdFx0XHRcdFx0XHQvL2F1ZGlvLmN1cnJlbnRUaW1lID0gdmFsdWVcblx0XHRcdFx0XHRcdHBsYXllci5zZWVrKHZhbHVlLCBwbGF5ZXIuaXNQbGF5aW5nKCkpXG5cdFx0XHRcdFx0fSxcblxuXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cblx0XHRcdGdhaW5Ob2RlLmdhaW4udmFsdWUgPSBjdHJsLm1vZGVsLnZvbHVtZVxuXG5cblx0XHRcdC8qKkB0eXBlIHtIVE1MQ2FudmFzRWxlbWVudH0gKi9cblx0XHRcdGNvbnN0IGJ1ZmZlckNhbnZhcyA9IGN0cmwuc2NvcGUuYnVmZmVyQ2FudmFzLmdldCgwKVxuXG5cdFx0XHRjb25zdCBidWZmZXJEaXNwbGF5ID0gY3JlYXRlQnVmZmVyRGlzcGxheShidWZmZXJDYW52YXMsICh0aW1lKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKHsgdGltZSB9KVxuXHRcdFx0XHQvL2F1ZGlvLmN1cnJlbnRUaW1lID0gdGltZVxuXHRcdFx0fSlcblxuXG5cdFx0XHRmdW5jdGlvbiBwbGF5U2FtcGxlcihpZCkge1xuXHRcdFx0XHRjb25zdCB7IHNhbXBsZXJzIH0gPSBjdHJsLm1vZGVsXG5cdFx0XHRcdGlmIChpZCA8IHNhbXBsZXJzLmxlbmd0aCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ3BsYXlTYW1wbGVyJywgaWQpXG5cdFx0XHRcdFx0Y29uc3Qgc2FtcGxlQnVmZmVyU291cmNlID0gYXVkaW9DdHguY3JlYXRlQnVmZmVyU291cmNlKClcblx0XHRcdFx0XHRzYW1wbGVCdWZmZXJTb3VyY2UuYnVmZmVyID0gc2FtcGxlcnNbaWRdLmF1ZGlvQnVmZmVyXG5cdFx0XHRcdFx0c2FtcGxlQnVmZmVyU291cmNlLmNvbm5lY3QoZ2Fpbk5vZGUpXG5cdFx0XHRcdFx0c2FtcGxlQnVmZmVyU291cmNlLnN0YXJ0KClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnBsYXlTYW1wbGUgPSBmdW5jdGlvbiAoa2V5KSB7XG5cdFx0XHRcdGNvbnN0IGNvbWJvID0gZWx0LmZpbmQoJy5zYW1wbGVyUGxheWVyJykuZXEoa2V5IC0gMSkuZmluZCgnLmJyYWluanMtY29tYm9ib3gnKVxuXHRcdFx0XHRjb25zdCB2YWx1ZSA9IGNvbWJvLmdldFZhbHVlKClcblx0XHRcdFx0cGxheVNhbXBsZXIodmFsdWUpXG5cdFx0XHR9XG5cblx0XHRcdGZ1bmN0aW9uIHBsYXkoKSB7XG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ3BsYXknLCB7IGRlY2sgfSlcblx0XHRcdFx0aWYgKCFjdHJsLm1vZGVsLmxvYWRlZClcblx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0Ly9hdWRpby5wbGF5KClcblx0XHRcdFx0cGxheWVyLnBsYXkoKVxuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBwYXVzZSgpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygncGF1c2UnKVxuXHRcdFx0XHQvL2F1ZGlvLnBhdXNlKClcblx0XHRcdFx0cGxheWVyLnBhdXNlKClcblxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnNldFNhbXBsZXJzID0gZnVuY3Rpb24gKHNhbXBsZXJzKSB7XG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHNhbXBsZXJzIH0pXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc2VlayA9IGZ1bmN0aW9uIChvZmZzZXQpIHtcblx0XHRcdFx0aWYgKHBsYXllciAmJiBqb2dUb3VjaFByZXNzZWQpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdzZWVrJywgZWxhcHNlZFRpbWUpXG5cdFx0XHRcdFx0cGxheWVyLnNlZWtPZmZzZXQob2Zmc2V0KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuam9nVG91Y2ggPSBmdW5jdGlvbihpc1ByZXNzZWQpIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnam9nVG91Y2gnLCBpc1ByZXNzZWQpXG5cblx0XHRcdFx0aWYgKCFpc1ByZXNzZWQgJiYgcGxheWVyKSB7XG5cdFx0XHRcdFx0cGxheWVyLnNlZWtFbmQoKVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0am9nVG91Y2hQcmVzc2VkID0gaXNQcmVzc2VkXG5cdFx0XHR9XG5cblxuXHRcdFx0YXN5bmMgZnVuY3Rpb24gcmVzZXQodGltZSA9IDAsIHJlc3RhcnQgPSBmYWxzZSkge1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdyZXNldCcsIHsgdGltZSwgcmVzdGFydCB9KVxuXHRcdFx0XHRwbGF5ZXIuc2Vlayh0aW1lLCByZXN0YXJ0KVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnJlc2V0ID0gcmVzZXRcblxuXHRcdFx0dGhpcy5zZXRJbmZvID0gYXN5bmMgZnVuY3Rpb24gKGluZm8pIHtcblx0XHRcdFx0Ly9jb25zb2xlLmxvZygnc2V0SW5uZm8nLCBpbmZvKVxuXHRcdFx0XHRjb25zdCAgeyBhcnRpc3QsIHRpdGxlLCB1cmwgfSA9IGluZm9cblx0XHRcdFx0Y29uc3QgbmFtZSA9IGAke2FydGlzdH0gLSAke3RpdGxlfWBcblx0XHRcdFx0Y29uc29sZS5sb2coJ25hbWUnLCBuYW1lKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoeyBuYW1lOiAnTG9hZGluZy4uLicgfSlcblx0XHRcdFx0Y29uc3QgYXVkaW9CdWZmZXIgPSBhd2FpdCAkJC5tZWRpYS5nZXRBdWRpb0J1ZmZlcih1cmwsIChkYXRhKSA9PiB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZyhkYXRhKVxuXHRcdFx0XHRcdGNvbnN0IHBlcmNlbnQgPSBNYXRoLnRydW5jKGRhdGEucGVyY2VudENvbXBsZXRlICogMTAwKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IG5hbWU6ICBgTG9hZGluZyAoJHtwZXJjZW50fSAlKWAgfSlcblx0XHRcdFx0fSlcblx0XHRcdFx0cGxheWVyID0gJCQubWVkaWEuY3JlYXRlQXVkaW9QbGF5ZXIoYXVkaW9DdHgsIGF1ZGlvQnVmZmVyLCBnYWluTm9kZSlcblx0XHRcdFx0cGxheWVyLnNldFBsYXliYWNrUmF0ZShjdHJsLm1vZGVsLnJhdGUpXG5cblx0XHRcdFx0cGxheWVyLm9uKCdwbGF5aW5nJywgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29ucGxheWluZycsIHtkZWNrfSlcblx0XHRcdFx0XHRtaWRpQ3RybC5zZXRCdXR0b25JbnRlbnNpdHkoJ1BMQVknLCAxMjcsIGRlY2spXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgcGxheWluZzogdHJ1ZSB9KVxuXHRcdFx0XHR9KVxuXG5cdFx0XHRcdHBsYXllci5vbigncGF1c2UnLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25wYXVzZScsIHtkZWNrfSlcblx0XHRcdFx0XHRtaWRpQ3RybC5zZXRCdXR0b25JbnRlbnNpdHkoJ1BMQVknLCAxLCBkZWNrKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHBsYXlpbmc6IGZhbHNlIH0pXG5cdFx0XHRcdH0pXG5cblx0XHRcdFx0cGxheWVyLm9uKCdlbmRlZCcsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnZW5kZWQnLCB7IGRlY2sgfSlcblx0XHRcdFx0XHRtaWRpQ3RybC5zZXRCdXR0b25JbnRlbnNpdHkoJ1BMQVknLCAxLCBkZWNrKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHBsYXlpbmc6IGZhbHNlIH0pXG5cdFx0XHRcdH0pXG5cblx0XHRcdFx0Ly8gYXVkaW8uc3JjID0gdXJsXG5cdFx0XHRcdC8vIGF1ZGlvLnZvbHVtZSA9IGN0cmwubW9kZWwudm9sdW1lXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7IG5hbWU6ICdBbmFseXNpbmcuLi4nIH0pXG5cdFx0XHRcdGNvbnN0IHRlbXBvID0gYXdhaXQgYmVhdGRldGVjdG9yLmNvbXB1dGVCZWF0RGV0ZWN0aW9uKGF1ZGlvQnVmZmVyKVxuXHRcdFx0XHRjb25zb2xlLmxvZygndGVtcG8nLCB0ZW1wbylcblx0XHRcdFx0aG90Y3VlcyA9IHt9XG5cblx0XHRcdFx0Y29uc3QgZHVyYXRpb24gPSBhdWRpb0J1ZmZlci5kdXJhdGlvblxuXHRcdFx0XHRjdHJsLnNldERhdGEoeyBuYW1lLCBkdXJhdGlvbiwgbG9hZGVkOiB0cnVlLCBicG06IHBhcnNlRmxvYXQodGVtcG8udGVtcG8udG9GaXhlZCgxKSkgfSlcblx0XHRcdFx0cmV0dXJuIHsgYXVkaW9CdWZmZXIsIHRlbXBvIH1cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5nZXRDdXJyZW50VGltZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Ly9yZXR1cm4gYXVkaW8uY3VycmVudFRpbWVcblx0XHRcdFx0cmV0dXJuIHBsYXllci5nZXRDdXJyZW50VGltZSgpXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZ2V0UmVhbFRpbWUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGxldCBjdXJUaW1lID0gcGxheWVyLmdldEN1cnJlbnRUaW1lKClcblx0XHRcdFx0aWYgKGF1dG9Mb29wICE9IDAgJiYgY3VyVGltZSA+PSBsb29wRW5kVGltZSkge1xuXHRcdFx0XHRcdGN1clRpbWUgPSBsb29wU3RhcnRUaW1lXG5cdFx0XHRcdFx0cGxheWVyLnNlZWsoY3VyVGltZSwgdHJ1ZSlcblx0XHRcdFx0fVxuXHRcdFx0XHRjdHJsLnNldERhdGEoeyBjdXJUaW1lIH0pXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ2dldEN1cnJlbnRUaW1lJywgY3VyVGltZSlcblx0XHRcdFx0cmV0dXJuIGN1clRpbWUgLyBwbGF5ZXIuZ2V0UGxheWJhY2tSYXRlKClcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zZXRTdGFydExvb3BUaW1lID0gZnVuY3Rpb24gKHRpbWUpIHtcblx0XHRcdFx0bG9vcFN0YXJ0VGltZSA9IHRpbWVcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zZXRFbmRMb29wVGltZSA9IGZ1bmN0aW9uICh0aW1lKSB7XG5cdFx0XHRcdGxvb3BFbmRUaW1lID0gdGltZVxuXHRcdFx0XHRhdXRvTG9vcCA9IDVcblx0XHRcdFx0cmVzZXQobG9vcFN0YXJ0VGltZSwgdHJ1ZSlcblx0XHRcdFx0bWlkaUN0cmwuc2V0QnV0dG9uSW50ZW5zaXR5KCdMT09QX01BTlVBTCcsIDEyNywgZGVjaywgMylcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5jbGVhckxvb3AgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGF1dG9Mb29wID0gMFxuXHRcdFx0XHRtaWRpQ3RybC5zZXRCdXR0b25JbnRlbnNpdHkoJ0xPT1BfTUFOVUFMJywgMSwgZGVjaywgMylcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5nZXRTdGFydExvb3BUaW1lID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gbG9vcFN0YXJ0VGltZVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmdldE91dHB1dE5vZGUgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBnYWluTm9kZVxuXHRcdFx0fVxuXG5cblx0XHRcdHRoaXMuaXNQbGF5aW5nID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gY3RybC5tb2RlbC5wbGF5aW5nXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuc2V0Vm9sdW1lID0gZnVuY3Rpb24gKHZvbHVtZSkge1xuXHRcdFx0XHRnYWluTm9kZS5nYWluLnZhbHVlID0gdm9sdW1lXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHZvbHVtZSB9KVxuXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuaXNMb2FkZWQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBjdHJsLm1vZGVsLmxvYWRlZFxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnRvZ2dsZVBsYXkgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGlmICghY3RybC5tb2RlbC5wbGF5aW5nKSB7XG5cdFx0XHRcdFx0cGxheSgpXG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cGF1c2UoKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZ2V0SG90Y3VlID0gZnVuY3Rpb24gKG5iKSB7XG5cdFx0XHRcdHJldHVybiBob3RjdWVzW25iXVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmFkZEhvdGN1ZSA9IGZ1bmN0aW9uIChuYiwgdGltZSwgZGl2KSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhZGRIb3RjdWUnLCBuYilcblx0XHRcdFx0aG90Y3Vlc1tuYl0gPSB7IHRpbWUsIGRpdiB9XG5cdFx0XHRcdGlmIChuYiAhPSAxKSB7XG5cdFx0XHRcdFx0bWlkaUN0cmwuc2V0QnV0dG9uSW50ZW5zaXR5KCdIT1RfQ1VFJywgMTI3LCBkZWNrLCBuYilcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmp1bXBUb0hvdGN1ZSA9IGZ1bmN0aW9uIChuYiwgcmVzdGFydCA9IHRydWUpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2p1bXBUb0hvdGN1ZScsIG5iKVxuXHRcdFx0XHRjb25zdCB7IHRpbWUgfSA9IGhvdGN1ZXNbbmJdXG5cdFx0XHRcdHJlc2V0KHRpbWUsIHJlc3RhcnQpXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMudG9nZ2xlSG90Y3VlRGVsZXRlTW9kZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0aXNIb3RjdWVEZWxldGVNb2RlID0gIWlzSG90Y3VlRGVsZXRlTW9kZVxuXHRcdFx0XHRjb25zb2xlLmxvZygnaXNIb3RjdWVEZWxldGVNb2RlJywgaXNIb3RjdWVEZWxldGVNb2RlKVxuXHRcdFx0XHRtaWRpQ3RybC5zZXRCdXR0b25JbnRlbnNpdHkoJ0hPVF9DVUUnLCAoaXNIb3RjdWVEZWxldGVNb2RlKSA/IDEyNyA6IDEsIGRlY2ssIDEpXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuaXNIb3RjdWVEZWxldGVNb2RlID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRyZXR1cm4gaXNIb3RjdWVEZWxldGVNb2RlXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZGVsZXRlSG90Y3VlID0gZnVuY3Rpb24gKG5iKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdkZWxldGVIb3RjdWUnLCBuYilcblx0XHRcdFx0ZGVsZXRlIGhvdGN1ZXNbbmJdXG5cdFx0XHRcdG1pZGlDdHJsLnNldEJ1dHRvbkludGVuc2l0eSgnSE9UX0NVRScsIDEsIGRlY2ssIG5iKVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmdldEJwbSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGN0cmwubW9kZWwuYnBtXG5cdFx0XHR9XG5cdFx0XHR0aGlzLmF1dG9Mb29wQWN0aXZhdGUgPSBmdW5jdGlvbiAobmIsIHN0YXJ0VGltZSwgZHVyYXRpb24pIHtcblx0XHRcdFx0aWYgKG5iID09IGF1dG9Mb29wKSB7XG5cdFx0XHRcdFx0bWlkaUN0cmwuc2V0QnV0dG9uSW50ZW5zaXR5KCdMT09QX0FVVE8nLCAxLCBkZWNrLCBuYilcblx0XHRcdFx0XHRhdXRvTG9vcCA9IDBcblx0XHRcdFx0XHRyZXR1cm4gMFxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChhdXRvTG9vcCAhPSAwKSB7XG5cdFx0XHRcdFx0bWlkaUN0cmwuc2V0QnV0dG9uSW50ZW5zaXR5KCdMT09QX0FVVE8nLCAxLCBkZWNrLCBhdXRvTG9vcClcblx0XHRcdFx0XHRsb29wRW5kVGltZSA9IGxvb3BTdGFydFRpbWUgKyBkdXJhdGlvblxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGxvb3BTdGFydFRpbWUgPSBzdGFydFRpbWVcblx0XHRcdFx0XHRsb29wRW5kVGltZSA9IHN0YXJ0VGltZSArIGR1cmF0aW9uXG5cdFx0XHRcdH1cblx0XHRcdFx0bWlkaUN0cmwuc2V0QnV0dG9uSW50ZW5zaXR5KCdMT09QX0FVVE8nLCAxMjcsIGRlY2ssIG5iKVxuXHRcdFx0XHRhdXRvTG9vcCA9IG5iXG5cdFx0XHRcdHJldHVybiBsb29wU3RhcnRUaW1lXG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZ2V0UGxheWJhY2tSYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBjdHJsLm1vZGVsLnJhdGVcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5zZXRQbGF5YmFja1JhdGUgPSBmdW5jdGlvbiAocmF0ZSkge1xuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdzZXRQbGF5YmFja1JhdGUnLCByYXRlKVxuXHRcdFx0XHRpZiAocGxheWVyKSB7XG5cdFx0XHRcdFx0cGxheWVyLnNldFBsYXliYWNrUmF0ZShyYXRlKVxuXHRcdFx0XHR9XG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7IHJhdGUgfSlcblx0XHRcdH1cblx0XHR9XG5cblxuXHR9KTtcblxufSkoKTtcblxuXG5cbiIsIi8vIEB0cy1jaGVja1xuXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgndHJlZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IFxcbiAgICBibi1jb250cm9sPVxcXCJicmFpbmpzLnRyZWVcXFwiIFxcbiAgICBibi1kYXRhPVxcXCJ7c291cmNlOiB0cmVlSW5mbywgb3B0aW9uczogdHJlZU9wdGlvbnN9XFxcIlxcbiAgICBibi1ldmVudD1cXFwidHJlZWNsaWNrOiBvblRyZWVJdGVtU2VsZWN0ZWRcXFwiXFxuPjwvZGl2PiAgICAgICAgXFxuXCIsXG5cblx0ZGVwczogWydicmVpemJvdC5maWxlcycsICdicmVpemJvdC5mcmllbmRzJywgJ2JyZWl6Ym90LnBsYXlsaXN0cyddLFxuXG5cdHByb3BzOiB7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkZpbGVzLkludGVyZmFjZX0gc3J2RmlsZXNcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5GcmllbmRzLkludGVyZmFjZX0gc3J2RnJpZW5kc1xuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBsYXlsaXN0cy5JbnRlcmZhY2V9IHNydlBsYXlsaXN0c1xuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgc3J2RmlsZXMsIHNydkZyaWVuZHMsIHNydlBsYXlsaXN0cykge1xuXG5cdFx0Y29uc3QgdHJlZUluZm8gPSBbXG5cdFx0XHR7IHRpdGxlOiAnSG9tZSBGaWxlcycsIGljb246ICdmYSBmYS1ob21lIHczLXRleHQtYmx1ZScsIGxhenk6IHRydWUsIGRhdGE6IHsgcGF0aDogJy8nIH0gfSxcblx0XHRcdHsgdGl0bGU6ICdGaWxlcyBTaGFyZWQnLCBmb2xkZXI6IHRydWUsIGNoaWxkcmVuOiBbXSwgaWNvbjogJ2ZhIGZhLXNoYXJlLWFsdCB3My10ZXh0LWJsdWUnIH0sXG5cdFx0XHR7IHRpdGxlOiAnUGxheWxpc3RzJywgZm9sZGVyOiB0cnVlLCBjaGlsZHJlbjogW10sIGljb246ICdmYXMgZmEtY29tcGFjdC1kaXNjIHczLXRleHQtYmx1ZScgfVxuXHRcdF1cblxuXHRcdGZ1bmN0aW9uIGNvbmNhdFBhdGgocGF0aCwgZmlsZU5hbWUpIHtcblx0XHRcdGxldCByZXQgPSBwYXRoXG5cdFx0XHRpZiAoIXBhdGguZW5kc1dpdGgoJy8nKSkge1xuXHRcdFx0XHRyZXQgKz0gJy8nXG5cdFx0XHR9XG5cdFx0XHRyZXQgKz0gZmlsZU5hbWVcblx0XHRcdHJldHVybiByZXRcblx0XHR9XG5cblx0XHRjb25zdCB0cmVlT3B0aW9ucyA9IHtcblx0XHRcdGxhenlMb2FkOiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0Y29uc3Qgbm9kZSA9IGRhdGEubm9kZVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKCdsYXp5bG9hZCcsIG5vZGUuZGF0YSlcblx0XHRcdFx0ZGF0YS5yZXN1bHQgPSBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSkgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IHsgcGF0aCwgZnJpZW5kVXNlciB9ID0gbm9kZS5kYXRhXG5cdFx0XHRcdFx0Y29uc3QgZm9sZGVycyA9IGF3YWl0IHNydkZpbGVzLmxpc3QocGF0aCwgeyBmaWx0ZXJFeHRlbnNpb246ICdtcDMnLCBmb2xkZXJPbmx5OiB0cnVlIH0sIGZyaWVuZFVzZXIpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZm9sZGVycycsIGZvbGRlcnMpXG5cdFx0XHRcdFx0Y29uc3QgcmVzdWx0cyA9IGZvbGRlcnMubWFwKChmKSA9PiB7XG5cdFx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogZi5uYW1lLFxuXHRcdFx0XHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0XHRcdFx0cGF0aDogY29uY2F0UGF0aChwYXRoLCBmLm5hbWUpLFxuXHRcdFx0XHRcdFx0XHRcdGZyaWVuZFVzZXJcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0bGF6eTogdHJ1ZSxcblx0XHRcdFx0XHRcdFx0Zm9sZGVyOiB0cnVlXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRyZXNvbHZlKHJlc3VsdHMpXG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHR0cmVlSW5mbyxcblx0XHRcdFx0dHJlZU9wdGlvbnMsXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uVHJlZUl0ZW1TZWxlY3RlZDogYXN5bmMgZnVuY3Rpb24gKGV2LCBub2RlKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25UcmVlSXRlbVNlbGVjdGVkJywgbm9kZS5kYXRhKVxuXHRcdFx0XHRcdGNvbnN0IHsgcGF0aCwgZnJpZW5kVXNlciwgcGxheWxpc3ROYW1lIH0gPSBub2RlLmRhdGFcblx0XHRcdFx0XHRpZiAoT2JqZWN0LmtleXMobm9kZS5kYXRhKS5sZW5ndGggPT0gMCkge1xuXHRcdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2ZpbGVjaGFuZ2UnLCB7IGZpbGVzOiBbXSB9KVxuXHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0fVxuXG5cblx0XHRcdFx0XHRpZiAocGxheWxpc3ROYW1lKSB7XG5cdFx0XHRcdFx0XHRlbHQudHJpZ2dlcignbG9hZGluZycpXG5cdFx0XHRcdFx0XHRjb25zdCBmaWxlcyA9IGF3YWl0IHNydlBsYXlsaXN0cy5nZXRQbGF5bGlzdFNvbmdzKHBsYXlsaXN0TmFtZSlcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdmaWxlcycsIGZpbGVzKVxuXHRcdFx0XHRcdFx0Y29uc3QgZm9ybWF0ZWRmaWxlcyA9IGZpbGVzXG5cdFx0XHRcdFx0XHRcdC5maWx0ZXIoKGYpID0+IGYubXAzICYmIGYubXAzLmFydGlzdClcblx0XHRcdFx0XHRcdFx0Lm1hcCgoZikgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHsgYXJ0aXN0LCBicG0sIHRpdGxlLCBsZW5ndGgsIGdlbnJlIH0gPSBmLm1wM1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHsgZmlsZU5hbWUsIGZyaWVuZFVzZXIsIHJvb3REaXIgfSA9IGYuZmlsZUluZm9cblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0dXJsOiBzcnZGaWxlcy5maWxlVXJsKGNvbmNhdFBhdGgocm9vdERpciwgZmlsZU5hbWUpLCBmcmllbmRVc2VyKSxcblx0XHRcdFx0XHRcdFx0XHRcdGFydGlzdCxcblx0XHRcdFx0XHRcdFx0XHRcdGJwbSxcblx0XHRcdFx0XHRcdFx0XHRcdHRpdGxlLFxuXHRcdFx0XHRcdFx0XHRcdFx0bGVuZ3RoLFxuXHRcdFx0XHRcdFx0XHRcdFx0Z2VucmVcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRlbHQudHJpZ2dlcignZmlsZWNoYW5nZScsIHsgZmlsZXM6IGZvcm1hdGVkZmlsZXMgfSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRlbHQudHJpZ2dlcignbG9hZGluZycpXG5cdFx0XHRcdFx0XHRjb25zdCBmaWxlcyA9IGF3YWl0IHNydkZpbGVzLmxpc3QocGF0aCwge1xuXHRcdFx0XHRcdFx0XHRmaWx0ZXJFeHRlbnNpb246ICdtcDMnLFxuXHRcdFx0XHRcdFx0XHRmaWxlc09ubHk6IHRydWUsXG5cdFx0XHRcdFx0XHRcdGdldE1QM0luZm86IHRydWVcblx0XHRcdFx0XHRcdH0sIGZyaWVuZFVzZXIpXG5cblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2ZpbGVzJywgZmlsZXMpXG5cdFx0XHRcdFx0XHRjb25zdCBmb3JtYXRlZGZpbGVzID0gZmlsZXNcblx0XHRcdFx0XHRcdFx0LmZpbHRlcigoZikgPT4gZi5tcDMgJiYgZi5tcDMuYXJ0aXN0KVxuXHRcdFx0XHRcdFx0XHQubWFwKChmKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgeyBhcnRpc3QsIGJwbSwgdGl0bGUsIGxlbmd0aCwgZ2VucmUgfSA9IGYubXAzXG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdFx0XHRcdHVybDogc3J2RmlsZXMuZmlsZVVybChjb25jYXRQYXRoKHBhdGgsIGYubmFtZSksIGZyaWVuZFVzZXIpLFxuXHRcdFx0XHRcdFx0XHRcdFx0YXJ0aXN0LFxuXHRcdFx0XHRcdFx0XHRcdFx0YnBtLFxuXHRcdFx0XHRcdFx0XHRcdFx0dGl0bGUsXG5cdFx0XHRcdFx0XHRcdFx0XHRsZW5ndGgsXG5cdFx0XHRcdFx0XHRcdFx0XHRnZW5yZVxuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdFx0ZWx0LnRyaWdnZXIoJ2ZpbGVjaGFuZ2UnLCB7IGZpbGVzOiBmb3JtYXRlZGZpbGVzIH0pXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XG5cdFx0XHRjb25zdCBmcmllbmRzID0gYXdhaXQgc3J2RnJpZW5kcy5nZXRGcmllbmRzKClcblx0XHRcdGZvciAoY29uc3QgeyBmcmllbmRVc2VyTmFtZTogdGl0bGUgfSBvZiBmcmllbmRzKSB7XG5cdFx0XHRcdGN0cmwubW9kZWwudHJlZUluZm9bMV0uY2hpbGRyZW4ucHVzaCh7XG5cdFx0XHRcdFx0dGl0bGUsXG5cdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLXVzZXIgdzMtdGV4dC1ibHVlJyxcblx0XHRcdFx0XHRkYXRhOiB7IGZyaWVuZFVzZXI6IHRpdGxlLCBwYXRoOiAnLycgfSxcblx0XHRcdFx0XHRsYXp5OiB0cnVlLFxuXHRcdFx0XHR9KVxuXHRcdFx0fVxuXHRcdFx0Ly9jb25zb2xlLmxvZygnZnJpZW5kcycsIGZyaWVuZHMpXG5cdFx0XHRjb25zdCBwbGF5bGlzdHMgPSBhd2FpdCBzcnZQbGF5bGlzdHMuZ2V0UGxheWxpc3QoKVxuXHRcdFx0Zm9yIChjb25zdCBwbGF5bGlzdE5hbWUgb2YgcGxheWxpc3RzKSB7XG5cdFx0XHRcdGN0cmwubW9kZWwudHJlZUluZm9bMl0uY2hpbGRyZW4ucHVzaCh7XG5cdFx0XHRcdFx0dGl0bGU6IHBsYXlsaXN0TmFtZSxcblx0XHRcdFx0XHRpY29uOiAnZmEgZmEtbXVzaWMgdzMtdGV4dC1ibHVlJyxcblx0XHRcdFx0XHRkYXRhOiB7IHBsYXlsaXN0TmFtZSB9XG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cblx0XHRcdGN0cmwudXBkYXRlKClcblxuXHRcdH1cblxuXHRcdGluaXQoKVxuXG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiLy8gQHRzLWNoZWNrXG5cbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdzZXR0aW5ncycsIHtcblxuICAgIHRlbXBsYXRlOiBcIjxkaXY+XFxuICAgIDxmb3JtIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU3VibWl0XFxcIiBibi1mb3JtPVxcXCJkYXRhXFxcIj5cXG4gICAgICAgIDxsYWJlbD5TYW1wbGVycyBGb2xkZXI8L2xhYmVsPlxcbiAgICAgICAgPGRpdj5cXG4gICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgcmVxdWlyZWQgbmFtZT1cXFwic2FtcGxlcnNGb2xkZXJcXFwiPlxcbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cXFwiYnV0dG9uXFxcIiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLWJsdWVcXFwiIGJuLWljb249XFxcImZhIGZhLWZvbGRlci1vcGVuXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uQ2hvb3NlRm9sZGVyXFxcIj48L2J1dHRvbj4gICAgXFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIFxcbiAgICAgICAgPGlucHV0IHR5cGU9XFxcInN1Ym1pdFxcXCIgaGlkZGVuIGJuLWJpbmQ9XFxcInN1Ym1pdFxcXCI+XFxuICAgIDwvZm9ybT5cXG48L2Rpdj5cXG5cIixcblxuICAgIGRlcHM6IFsnYnJlaXpib3QucGFnZXInXSxcblxuICAgIHByb3BzOiB7XG4gICAgICAgIGRhdGE6IHt9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcbiAgICAgKi9cbiAgICBpbml0OiBmdW5jdGlvbiAoZWx0LCBwYWdlcikge1xuXG4gICAgICAgIGNvbnN0IHsgZGF0YSB9ID0gdGhpcy5wcm9wc1xuXG4gICAgICAgIGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBkYXRhXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXZlbnRzOiB7XG4gICAgICAgICAgICAgICAgb25DaG9vc2VGb2xkZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuZmlsZXMnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0Nob29zZSBGb2xkZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJFeHRlbnNpb246ICdtcDMnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgb25SZXR1cm46IGZ1bmN0aW9uKGZvbGRlclBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnb25SZXR1cm4nLCBmb2xkZXJQYXRoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN0cmwubW9kZWwuZGF0YS5zYW1wbGVyc0ZvbGRlciA9IGZvbGRlclBhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdHJsLnVwZGF0ZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgYnV0dG9uczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwcGx5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGljb246ICdmYXMgZmEtY2hlY2snLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0FwcGx5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljazogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnb25DbGljaycsIHRoaXMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWdlci5wb3BQYWdlKHRoaXMuZ2V0Um9vdERpcigpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25TdWJtaXQ6IGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICAgICAgICAgIHBhZ2VyLnBvcFBhZ2UoJCh0aGlzKS5nZXRGb3JtRGF0YSgpKVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIHRoaXMuZ2V0QnV0dG9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgYXBwbHk6IHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdBcHBseScsXG4gICAgICAgICAgICAgICAgICAgIGljb246ICdmYXMgZmEtY2hlY2snLFxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdHJsLnNjb3BlLnN1Ym1pdC5jbGljaygpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59KSIsIi8vQHRzLWNoZWNrXG5cbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdBdWRpb1Rvb2xzJywge1xuXG4gICAgaW5pdDogZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgY29uc3QgYXVkaW9DdHggPSBuZXcgQXVkaW9Db250ZXh0KClcblxuICAgICAgICBmdW5jdGlvbiBnZXRBdWRpb0NvbnRleHQoKSB7XG4gICAgICAgICAgICByZXR1cm4gYXVkaW9DdHhcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldEN1cnJlbnRUaW1lKCkge1xuICAgICAgICAgICAgcmV0dXJuIGF1ZGlvQ3R4LmN1cnJlbnRUaW1lXG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogXG4gICAgICAgICAqIEBwYXJhbSB7QXVkaW9Ob2RlfSBzb3VyY2UxIFxuICAgICAgICAgKiBAcGFyYW0ge0F1ZGlvTm9kZX0gc291cmNlMiBcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGNyZWF0ZVN0ZXJlb01lcmdlcihzb3VyY2UxLCBzb3VyY2UyKSB7XG4gICAgICAgICAgICBjb25zdCBzcGxpdHRlcjEgPSBhdWRpb0N0eC5jcmVhdGVDaGFubmVsU3BsaXR0ZXIoMilcbiAgICAgICAgICAgIHNvdXJjZTEuY29ubmVjdChzcGxpdHRlcjEpXG4gICAgICAgICAgICBjb25zdCBzcGxpdHRlcjIgPSBhdWRpb0N0eC5jcmVhdGVDaGFubmVsU3BsaXR0ZXIoMilcbiAgICAgICAgICAgIHNvdXJjZTIuY29ubmVjdChzcGxpdHRlcjIpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IG1lcmdlciA9IGF1ZGlvQ3R4LmNyZWF0ZUNoYW5uZWxNZXJnZXIoNClcbiAgICAgICAgICAgIHNwbGl0dGVyMS5jb25uZWN0KG1lcmdlciwgMCwgMClcbiAgICAgICAgICAgIHNwbGl0dGVyMS5jb25uZWN0KG1lcmdlciwgMSwgMSlcbiAgICAgICAgICAgIHNwbGl0dGVyMi5jb25uZWN0KG1lcmdlciwgMCwgMilcbiAgICAgICAgICAgIHNwbGl0dGVyMi5jb25uZWN0KG1lcmdlciwgMSwgMykgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gbWVyZ2VyXG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogXG4gICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBjaGFubmVsQ291bnQgXG4gICAgICAgICAqIEBwYXJhbSB7QXVkaW9Ob2RlfSBpbnB1dE5vZGUgXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBjcmVhdGVEZXN0aW5hdGlvbihjaGFubmVsQ291bnQsIGlucHV0Tm9kZSkge1xuICAgICAgICAgICAgY29uc3QgZGVzdCA9IGF1ZGlvQ3R4LmNyZWF0ZU1lZGlhU3RyZWFtRGVzdGluYXRpb24oKVxuICAgICAgICAgICAgZGVzdC5jaGFubmVsQ291bnQgPSBjaGFubmVsQ291bnRcbiAgICAgICAgICAgIGNvbnN0IGF1ZGlvID0gbmV3IEF1ZGlvKClcbiAgICAgICAgICAgIC8vYXdhaXQgYXVkaW8uc2V0U2lua0lkKGF1ZGlvRGV2aWNlWzBdLmRldmljZUlkKVxuICAgICAgICAgICAgYXVkaW8uc3JjT2JqZWN0ID0gZGVzdC5zdHJlYW1cbiAgICAgICAgICAgIGlucHV0Tm9kZS5jb25uZWN0KGRlc3QpXG4gICAgICAgICAgICBhdWRpby5wbGF5KCkgICAgICAgICAgICBcbiAgICAgICAgfVxuXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAcGFyYW0ge0F1ZGlvTm9kZX0gc291cmNlMSBcbiAgICAgICAgICogQHBhcmFtIHtBdWRpb05vZGV9IHNvdXJjZTIgXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBjcmVhdGVDcm9zc0ZhZGVyV2l0aE1hc3RlckxldmVsKHNvdXJjZTEsIHNvdXJjZTIpIHtcbiAgICAgICAgICAgIGNvbnN0IGdhaW4xID0gYXVkaW9DdHguY3JlYXRlR2FpbigpXG4gICAgICAgICAgICBnYWluMS5nYWluLnZhbHVlID0gMC41XG4gICAgICAgICAgICBzb3VyY2UxLmNvbm5lY3QoZ2FpbjEpXG5cbiAgICAgICAgICAgIGNvbnN0IGdhaW4yID0gYXVkaW9DdHguY3JlYXRlR2FpbigpXG4gICAgICAgICAgICBnYWluMi5nYWluLnZhbHVlID0gMC41XG4gICAgICAgICAgICBzb3VyY2UyLmNvbm5lY3QoZ2FpbjIpXG5cbiAgICAgICAgICAgIGNvbnN0IG1hc3RlckdhaW4gPSBhdWRpb0N0eC5jcmVhdGVHYWluKClcbiAgICAgICAgICAgIG1hc3RlckdhaW4uZ2Fpbi52YWx1ZSA9IDAuNVxuXG4gICAgICAgICAgICBnYWluMS5jb25uZWN0KG1hc3RlckdhaW4pXG4gICAgICAgICAgICBnYWluMi5jb25uZWN0KG1hc3RlckdhaW4pXG5cblxuICAgICAgICAgICAgZnVuY3Rpb24gc2V0RmFkZXJMZXZlbCh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGdhaW4yLmdhaW4udmFsdWUgPSBNYXRoLmNvcygoMS4wIC0gdmFsdWUpICogMC41ICogTWF0aC5QSSlcbiAgICAgICAgICAgICAgICBnYWluMS5nYWluLnZhbHVlID0gTWF0aC5jb3ModmFsdWUgKiAwLjUgKiBNYXRoLlBJKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBzZXRNYXN0ZXJMZXZlbCh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIG1hc3RlckdhaW4uZ2Fpbi52YWx1ZSA9IHZhbHVlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHNldEZhZGVyTGV2ZWwsXG4gICAgICAgICAgICAgICAgc2V0TWFzdGVyTGV2ZWwsXG4gICAgICAgICAgICAgICAgZ2V0T3V0cHV0Tm9kZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBtYXN0ZXJHYWluXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY3JlYXRlU3RlcmVvTWVyZ2VyLFxuICAgICAgICAgICAgY3JlYXRlRGVzdGluYXRpb24sXG4gICAgICAgICAgICBjcmVhdGVDcm9zc0ZhZGVyV2l0aE1hc3RlckxldmVsLFxuICAgICAgICAgICAgZ2V0QXVkaW9Db250ZXh0LFxuICAgICAgICAgICAgZ2V0Q3VycmVudFRpbWVcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuIiwiLy9AdHMtY2hlY2tcblxuXG4kJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnTUlESUN0cmwnLCB7XG5cbiAgICBpbml0OiBmdW5jdGlvbiAoY29uZmlnKSB7XG5cbiAgICAgICAgY29uc3QgQnRuSW50ZW5zaXR5ID0ge1xuICAgICAgICAgICAgTUFYOiAweDdGLFxuICAgICAgICAgICAgTUlOOiAweDAxLFxuICAgICAgICAgICAgT0ZGOiAweDAwLFxuICAgICAgICAgICAgT046IDB4MDFcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG1pZGlJbnB1dE1hcHBpbmcgPSBbXG4gICAgICAgICAgICB7IGFjdGlvbjogJ01BU1RFUl9MRVZFTCcsIGNtZDogMHhCRiwgbm90ZTogMFgwQSB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdDVUVfTEVWRUwnLCBjbWQ6IDB4QkYsIG5vdGU6IDBYMEMgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnQ1JPU1NfRkFERVInLCBjbWQ6IDB4QkYsIG5vdGU6IDBYMDggfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnTEVWRUwnLCBjbWQ6IDB4QjAsIG5vdGU6IDBYMTYsIGRlY2s6IDEgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnUElUQ0gnLCBjbWQ6IDB4QjAsIG5vdGU6IDBYMDksIGRlY2s6IDEgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnTEVWRUwnLCBjbWQ6IDB4QjEsIG5vdGU6IDBYMTYsIGRlY2s6IDIgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnUElUQ0gnLCBjbWQ6IDB4QjEsIG5vdGU6IDBYMDksIGRlY2s6IDIgfSxcblxuICAgICAgICAgICAgeyBhY3Rpb246ICdTWU5DJywgY21kOiAweDkwLCBub3RlOiAwWDAyLCBkZWNrOiAxLCB0eXBlOiAnQlROJyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdDVUUnLCBjbWQ6IDB4OTAsIG5vdGU6IDBYMDEsIGRlY2s6IDEsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ1BMQVknLCBjbWQ6IDB4OTAsIG5vdGU6IDBYMDAsIGRlY2s6IDEsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ1BGTCcsIGNtZDogMHg5MCwgbm90ZTogMFgxQiwgZGVjazogMSwgdHlwZTogJ0JUTjInIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0pPR1RPVUNIX1JFTEVBU0UnLCBjbWQ6IDB4ODAsIG5vdGU6IDBYMDYsIGRlY2s6IDEgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnSk9HVE9VQ0hfUFJFU1MnLCBjbWQ6IDB4OTAsIG5vdGU6IDBYMDYsIGRlY2s6IDEgfSxcblxuICAgICAgICAgICAgeyBhY3Rpb246ICdTWU5DJywgY21kOiAweDkxLCBub3RlOiAwWDAyLCBkZWNrOiAyLCB0eXBlOiAnQlROJyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdDVUUnLCBjbWQ6IDB4OTEsIG5vdGU6IDBYMDEsIGRlY2s6IDIsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ1BMQVknLCBjbWQ6IDB4OTEsIG5vdGU6IDBYMDAsIGRlY2s6IDIsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ1BGTCcsIGNtZDogMHg5MSwgbm90ZTogMFgxQiwgZGVjazogMiwgdHlwZTogJ0JUTjInIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0pPR1RPVUNIX1JFTEVBU0UnLCBjbWQ6IDB4ODEsIG5vdGU6IDBYMDYsIGRlY2s6IDIgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnSk9HVE9VQ0hfUFJFU1MnLCBjbWQ6IDB4OTEsIG5vdGU6IDBYMDYsIGRlY2s6IDIgfSxcblxuICAgICAgICAgICAgeyBhY3Rpb246ICdMT0FEJywgY21kOiAweDlGLCBub3RlOiAwWDAyLCBkZWNrOiAxIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0xPQUQnLCBjbWQ6IDB4OUYsIG5vdGU6IDBYMDMsIGRlY2s6IDIgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnRU5URVInLCBjbWQ6IDB4OUYsIG5vdGU6IDBYMDYgfSxcblxuICAgICAgICAgICAgeyBhY3Rpb246ICdKT0dfV0hFRUwnLCBjbWQ6IDB4QjAsIG5vdGU6IDBYMDYsIGRlY2s6IDEgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnSk9HX1dIRUVMJywgY21kOiAweEIxLCBub3RlOiAwWDA2LCBkZWNrOiAyIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0JST1dTRV9XSEVFTCcsIGNtZDogMHhCRiwgbm90ZTogMFgwMCB9LFxuXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0hPVF9DVUUnLCBjbWQ6IDB4OTQsIG5vdGU6IDBYMDEsIGRlY2s6IDEsIGtleTogMSwgdHlwZTogJ0JUTicgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnSE9UX0NVRScsIGNtZDogMHg5NCwgbm90ZTogMFgwMiwgZGVjazogMSwga2V5OiAyLCB0eXBlOiAnQlROJyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdIT1RfQ1VFJywgY21kOiAweDk0LCBub3RlOiAwWDAzLCBkZWNrOiAxLCBrZXk6IDMsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0hPVF9DVUUnLCBjbWQ6IDB4OTQsIG5vdGU6IDBYMDQsIGRlY2s6IDEsIGtleTogNCwgdHlwZTogJ0JUTicgfSxcblxuICAgICAgICAgICAgeyBhY3Rpb246ICdIT1RfQ1VFJywgY21kOiAweDk1LCBub3RlOiAwWDAxLCBkZWNrOiAyLCBrZXk6IDEsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0hPVF9DVUUnLCBjbWQ6IDB4OTUsIG5vdGU6IDBYMDIsIGRlY2s6IDIsIGtleTogMiwgdHlwZTogJ0JUTicgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnSE9UX0NVRScsIGNtZDogMHg5NSwgbm90ZTogMFgwMywgZGVjazogMiwga2V5OiAzLCB0eXBlOiAnQlROJyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdIT1RfQ1VFJywgY21kOiAweDk1LCBub3RlOiAwWDA0LCBkZWNrOiAyLCBrZXk6IDQsIHR5cGU6ICdCVE4nIH0sXG5cblxuICAgICAgICAgICAgeyBhY3Rpb246ICdMT09QX0FVVE8nLCBjbWQ6IDB4OTQsIG5vdGU6IDBYMTEsIGRlY2s6IDEsIGtleTogMSwgdHlwZTogJ0JUTicgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnTE9PUF9BVVRPJywgY21kOiAweDk0LCBub3RlOiAwWDEyLCBkZWNrOiAxLCBrZXk6IDIsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0xPT1BfQVVUTycsIGNtZDogMHg5NCwgbm90ZTogMFgxMywgZGVjazogMSwga2V5OiAzLCB0eXBlOiAnQlROJyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdMT09QX0FVVE8nLCBjbWQ6IDB4OTQsIG5vdGU6IDBYMTQsIGRlY2s6IDEsIGtleTogNCwgdHlwZTogJ0JUTicgfSxcblxuICAgICAgICAgICAgeyBhY3Rpb246ICdMT09QX0FVVE8nLCBjbWQ6IDB4OTUsIG5vdGU6IDBYMTEsIGRlY2s6IDIsIGtleTogMSwgdHlwZTogJ0JUTicgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnTE9PUF9BVVRPJywgY21kOiAweDk1LCBub3RlOiAwWDEyLCBkZWNrOiAyLCBrZXk6IDIsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0xPT1BfQVVUTycsIGNtZDogMHg5NSwgbm90ZTogMFgxMywgZGVjazogMiwga2V5OiAzLCB0eXBlOiAnQlROJyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdMT09QX0FVVE8nLCBjbWQ6IDB4OTUsIG5vdGU6IDBYMTQsIGRlY2s6IDIsIGtleTogNCwgdHlwZTogJ0JUTicgfSxcblxuICAgICAgICAgICAgeyBhY3Rpb246ICdMT09QX01BTlVBTCcsIGNtZDogMHg5NCwgbm90ZTogMFgyMSwgZGVjazogMSwga2V5OiAxLCB0eXBlOiAnQlROJyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdMT09QX01BTlVBTCcsIGNtZDogMHg5NCwgbm90ZTogMFgyMiwgZGVjazogMSwga2V5OiAyLCB0eXBlOiAnQlROJyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdMT09QX01BTlVBTCcsIGNtZDogMHg5NCwgbm90ZTogMFgyMywgZGVjazogMSwga2V5OiAzLCB0eXBlOiAnQlROJyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdMT09QX01BTlVBTCcsIGNtZDogMHg5NCwgbm90ZTogMFgyNCwgZGVjazogMSwga2V5OiA0LCB0eXBlOiAnQlROJyB9LFxuXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0xPT1BfTUFOVUFMJywgY21kOiAweDk1LCBub3RlOiAwWDIxLCBkZWNrOiAyLCBrZXk6IDEsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0xPT1BfTUFOVUFMJywgY21kOiAweDk1LCBub3RlOiAwWDIyLCBkZWNrOiAyLCBrZXk6IDIsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0xPT1BfTUFOVUFMJywgY21kOiAweDk1LCBub3RlOiAwWDIzLCBkZWNrOiAyLCBrZXk6IDMsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ0xPT1BfTUFOVUFMJywgY21kOiAweDk1LCBub3RlOiAwWDI0LCBkZWNrOiAyLCBrZXk6IDQsIHR5cGU6ICdCVE4nIH0sXG5cbiAgICAgICAgICAgIHsgYWN0aW9uOiAnU0FNUExFUicsIGNtZDogMHg5NCwgbm90ZTogMFgzMSwgZGVjazogMSwga2V5OiAxLCB0eXBlOiAnQlROJyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdTQU1QTEVSJywgY21kOiAweDk0LCBub3RlOiAwWDMyLCBkZWNrOiAxLCBrZXk6IDIsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ1NBTVBMRVInLCBjbWQ6IDB4OTQsIG5vdGU6IDBYMzMsIGRlY2s6IDEsIGtleTogMywgdHlwZTogJ0JUTicgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnU0FNUExFUicsIGNtZDogMHg5NCwgbm90ZTogMFgzNCwgZGVjazogMSwga2V5OiA0LCB0eXBlOiAnQlROJyB9LFxuXG4gICAgICAgICAgICB7IGFjdGlvbjogJ1NBTVBMRVInLCBjbWQ6IDB4OTUsIG5vdGU6IDBYMzEsIGRlY2s6IDIsIGtleTogMSwgdHlwZTogJ0JUTicgfSxcbiAgICAgICAgICAgIHsgYWN0aW9uOiAnU0FNUExFUicsIGNtZDogMHg5NSwgbm90ZTogMFgzMiwgZGVjazogMiwga2V5OiAyLCB0eXBlOiAnQlROJyB9LFxuICAgICAgICAgICAgeyBhY3Rpb246ICdTQU1QTEVSJywgY21kOiAweDk1LCBub3RlOiAwWDMzLCBkZWNrOiAyLCBrZXk6IDMsIHR5cGU6ICdCVE4nIH0sXG4gICAgICAgICAgICB7IGFjdGlvbjogJ1NBTVBMRVInLCBjbWQ6IDB4OTUsIG5vdGU6IDBYMzQsIGRlY2s6IDIsIGtleTogNCwgdHlwZTogJ0JUTicgfSxcblxuICAgICAgICBdXG5cblxuICAgICAgICBmdW5jdGlvbiBnZXRBY3Rpb25EZXNjKGNtZCwgbm90ZSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBlIG9mIG1pZGlJbnB1dE1hcHBpbmcpIHtcbiAgICAgICAgICAgICAgICBpZiAoZS5jbWQgPT0gY21kICYmIGUubm90ZSA9PSBub3RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGxcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGV2ZW50cyA9IG5ldyBFdmVudEVtaXR0ZXIyKClcblxuICAgICAgICAvKipAdHlwZSB7TUlESUFjY2Vzc30gKi9cbiAgICAgICAgbGV0IG1pZGlBY2Nlc3MgPSBudWxsXG5cbiAgICAgICAgLyoqQHR5cGUge01JRElJbnB1dH0gKi9cbiAgICAgICAgbGV0IG1pZGlJbiA9IG51bGxcbiAgICAgICAgLyoqQHR5cGUge01JRElPdXRwdXR9ICovXG4gICAgICAgIGxldCBtaWRpT3V0ID0gbnVsbFxuXG5cbiAgICAgICAgYXN5bmMgZnVuY3Rpb24gcmVxdWVzdE1JRElBY2Nlc3MoKSB7XG4gICAgICAgICAgICBtaWRpQWNjZXNzID0gYXdhaXQgbmF2aWdhdG9yLnJlcXVlc3RNSURJQWNjZXNzKClcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogXG4gICAgICAgICAgICAgKiBAcGFyYW0ge01JRElDb25uZWN0aW9uRXZlbnR9IGV2IFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBtaWRpQWNjZXNzLm9uc3RhdGVjaGFuZ2UgPSBmdW5jdGlvbihldikge1xuICAgICAgICAgICAgICAgIGlmIChldi5wb3J0LnR5cGUgPT0gJ2lucHV0Jykge1xuICAgICAgICAgICAgICAgICAgICBldmVudHMuZW1pdCgnTUlESV9TVEFURUNIQU5HRScsIGV2LnBvcnQpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBtaWRpSW5wdXRzID0gW11cbiAgICAgICAgICAgIGZvciAoY29uc3QgeyBuYW1lLCBpZCB9IG9mIG1pZGlBY2Nlc3MuaW5wdXRzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICAgICAgbWlkaUlucHV0cy5wdXNoKHsgbGFiZWw6IG5hbWUsIHZhbHVlOiBpZCB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbWlkaU91dHB1dHMgPSBbXVxuICAgICAgICAgICAgZm9yIChjb25zdCB7IG5hbWUsIGlkIH0gb2YgbWlkaUFjY2Vzcy5vdXRwdXRzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICAgICAgbWlkaU91dHB1dHMucHVzaCh7IGxhYmVsOiBuYW1lLCB2YWx1ZTogaWQgfSlcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHsgbWlkaUlucHV0cywgbWlkaU91dHB1dHMgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0TUlESUlucHV0cygpIHtcbiAgICAgICAgICAgIGNvbnN0IG1pZGlJbnB1dHMgPSBbXVxuICAgICAgICAgICAgZm9yIChjb25zdCB7IG5hbWUsIGlkIH0gb2YgbWlkaUFjY2Vzcy5pbnB1dHMudmFsdWVzKCkpIHtcbiAgICAgICAgICAgICAgICBtaWRpSW5wdXRzLnB1c2goeyBsYWJlbDogbmFtZSwgdmFsdWU6IGlkIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbWlkaUlucHV0cyAgICAgICAgICAgICBcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNlbGVjdE1JRElJbnB1dChzZWxlY3RlZElkKSB7XG4gICAgICAgICAgICBpZiAobWlkaUluKSB7XG4gICAgICAgICAgICAgICAgbWlkaUluLm9ubWlkaW1lc3NhZ2UgPSBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGlucHV0IG9mIG1pZGlBY2Nlc3MuaW5wdXRzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlucHV0LmlkID09IHNlbGVjdGVkSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbWlkaUluID0gaW5wdXRcbiAgICAgICAgICAgICAgICAgICAgbWlkaUluLm9ubWlkaW1lc3NhZ2UgPSBvbk1pZGlNZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gICAgICAgICAgICBcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNlbGVjdE1JRElEZXZpY2Uoc2VsZWN0ZWRJZCkge1xuICAgICAgICAgICAgaWYgKG1pZGlJbikge1xuICAgICAgICAgICAgICAgIG1pZGlJbi5vbm1pZGltZXNzYWdlID0gbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCBpbnB1dCBvZiBtaWRpQWNjZXNzLmlucHV0cy52YWx1ZXMoKSkge1xuICAgICAgICAgICAgICAgIGlmIChpbnB1dC5pZCA9PSBzZWxlY3RlZElkKSB7XG4gICAgICAgICAgICAgICAgICAgIG1pZGlJbiA9IGlucHV0XG4gICAgICAgICAgICAgICAgICAgIG1pZGlJbi5vbm1pZGltZXNzYWdlID0gb25NaWRpTWVzc2FnZVxuXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgb3V0cHV0IG9mIG1pZGlBY2Nlc3Mub3V0cHV0cy52YWx1ZXMoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG91dHB1dC5uYW1lID09IGlucHV0Lm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaWRpT3V0ID0gb3V0cHV0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzZWxlY3RNSURJT3V0cHV0KHNlbGVjdGVkSWQpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qgb3V0cHV0IG9mIG1pZGlBY2Nlc3Mub3V0cHV0cy52YWx1ZXMoKSkge1xuICAgICAgICAgICAgICAgIGlmIChvdXRwdXQuaWQgPT0gc2VsZWN0ZWRJZCkge1xuICAgICAgICAgICAgICAgICAgICBtaWRpT3V0ID0gb3V0cHV0XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGNsZWFyQWxsQnV0dG9ucygpIHtcbiAgICAgICAgICAgIGlmIChtaWRpT3V0ID09IG51bGwpXG4gICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHsgY21kLCBub3RlLCB0eXBlIH0gb2YgbWlkaUlucHV0TWFwcGluZykge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlID09ICdCVE4nIHx8IHR5cGUgPT0gJ0JUTjInKSB7XG4gICAgICAgICAgICAgICAgICAgIG1pZGlPdXQuc2VuZChbY21kLCBub3RlLCB0eXBlID09ICdCVE4nID8gQnRuSW50ZW5zaXR5Lk1JTiA6IEJ0bkludGVuc2l0eS5PRkZdKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHNldEJ1dHRvbkludGVuc2l0eShhY3Rpb24sIGludGVuc2l0eSwgZGVjaywga2V5KSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdzZXRCdXR0b25JbnRlbnNpdHknLCB7YWN0aW9uLCBpbnRlbnNpdHksIGRlY2ssIGtleX0pXG4gICAgICAgICAgICBpZiAobWlkaU91dCA9PSBudWxsKVxuICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgZm9yIChjb25zdCBlIG9mIG1pZGlJbnB1dE1hcHBpbmcpIHtcbiAgICAgICAgICAgICAgICBsZXQgcmV0ID0gKGUuYWN0aW9uID09IGFjdGlvbilcbiAgICAgICAgICAgICAgICBpZiAoZGVjayAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0ICY9IChlLmRlY2sgPT0gZGVjaylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGtleSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0ICY9IChlLmtleSA9PSBrZXkpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgbWlkaU91dC5zZW5kKFtlLmNtZCwgZS5ub3RlLCBpbnRlbnNpdHldKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gb25NaWRpTWVzc2FnZShldikge1xuICAgICAgICAgICAgY29uc3QgW2NtZCwgbm90ZSwgdmVsb2NpdHldID0gZXYuZGF0YVxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnb25NaWRpTWVzc2FnZScsIGNtZC50b1N0cmluZygxNiksIG5vdGUudG9TdHJpbmcoMTYpLCB2ZWxvY2l0eSlcbiAgICAgICAgICAgIGNvbnN0IGRlc2MgPSBnZXRBY3Rpb25EZXNjKGNtZCwgbm90ZSlcblxuICAgICAgICAgICAgaWYgKGRlc2MgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgYWN0aW9uLCBkZWNrLCBrZXksIGV2ZW50IH0gPSBkZXNjXG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnb25NaWRpTWVzc2FnZScsIHthY3Rpb24sIGRlY2ssIGtleSwgZXZlbnR9KVxuICAgICAgICAgICAgICAgIGlmIChldmVudCAhPSAnVVAnKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50cy5lbWl0KGFjdGlvbiwgeyBkZWNrLCBrZXksIHZlbG9jaXR5IH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2VsZWN0TUlESUlucHV0LFxuICAgICAgICAgICAgc2VsZWN0TUlESU91dHB1dCxcbiAgICAgICAgICAgIHNlbGVjdE1JRElEZXZpY2UsXG4gICAgICAgICAgICBjbGVhckFsbEJ1dHRvbnMsXG4gICAgICAgICAgICBzZXRCdXR0b25JbnRlbnNpdHksXG4gICAgICAgICAgICByZXF1ZXN0TUlESUFjY2VzcyxcbiAgICAgICAgICAgIGdldE1JRElJbnB1dHMsXG4gICAgICAgICAgICBvbjogZXZlbnRzLm9uLmJpbmQoZXZlbnRzKSxcbiAgICAgICAgICAgIEJ0bkludGVuc2l0eVxuICAgICAgICB9XG4gICAgfVxufSk7XG4iXX0=
