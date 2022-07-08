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
						await ctrl.scope[audio].setInfo(selFile)
						ctrl.model[audio] = false
						ctrl.update()
					}
				},
				onMidiInputChange: function (ev) {
					const selectedId = $(this).getValue()
					midiCtrl.selectMIDIInput(selectedId)
				},
				onMidiOutputChange: function (ev,) {
					const selectedId = $(this).getValue()
					midiCtrl.selectMIDIOutput(selectedId)
					midiCtrl.clearAllButtons()
					midiCtrl.setButtonIntensity('PFL', 1, 1)


				}
			}
		})




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

		midiCtrl.on('PFL', ({deck}) => {
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

		midiCtrl.on('MASTER_LEVEL', ({velocity}) => {
			masterCrossFader.setMasterLevel(map(velocity))
		})

		midiCtrl.on('CUE_LEVEL', ({velocity}) => {
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




