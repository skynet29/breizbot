// @ts-check

$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, pager) {

		const midiInputMapping = [
			{action: 'MASTER_LEVEL', 	cmd: 0xBF, note: 0X0A},
			{action: 'CUE_LEVEL', 		cmd: 0xBF, note: 0X0C},
			{action: 'CROSS_FADER', 	cmd: 0xBF, note: 0X08},
			{action: 'LEVEL',		 	cmd: 0xB0, note: 0X16, deck: 1},
			{action: 'PITCH',		 	cmd: 0xB0, note: 0X19, deck: 1},
			{action: 'LEVEL',		 	cmd: 0xB1, note: 0X16, deck: 2},
			{action: 'PITCH',		 	cmd: 0xB1, note: 0X19, deck: 2},

			{action: 'SYNC',		 	cmd: 0x90, note: 0X02, deck: 1},
			{action: 'CUE',		 		cmd: 0x90, note: 0X01, deck: 1},
			{action: 'PLAY',	 		cmd: 0x90, note: 0X00, deck: 1},
			{action: 'PFL',		 		cmd: 0x90, note: 0X1B, deck: 1},
			{action: 'JOGTOUCH', 		cmd: 0x90, note: 0X06, deck: 1},

			{action: 'SYNC',		 	cmd: 0x91, note: 0X02, deck: 2},
			{action: 'CUE',		 		cmd: 0x91, note: 0X01, deck: 2},
			{action: 'PLAY',	 		cmd: 0x91, note: 0X00, deck: 2},
			{action: 'PFL',		 		cmd: 0x91, note: 0X1B, deck: 2},
			{action: 'JOGTOUCH', 		cmd: 0x91, note: 0X06, deck: 2},

			{action: 'LOAD', 			cmd: 0x9F, note: 0X02, deck: 1},
			{action: 'LOAD',	 		cmd: 0x9F, note: 0X03, deck: 2},
			{action: 'ENTER'	, 		cmd: 0x9F, note: 0X06},

			{action: 'JOG_WHEEL', 		cmd: 0xB0, note: 0X06, deck: 1},
			{action: 'JOG_WHEEL', 		cmd: 0xB1, note: 0X06, deck: 2},
			{action: 'SELECT_WHEEL',	cmd: 0xBF, note: 0X00},

			{action: 'HOT_CUE', 		cmd: 0x94, note: 0X01, deck: 1, key: 1},
			{action: 'HOT_CUE', 		cmd: 0x94, note: 0X02, deck: 1, key: 2},
			{action: 'HOT_CUE', 		cmd: 0x94, note: 0X03, deck: 1, key: 3},
			{action: 'HOT_CUE', 		cmd: 0x94, note: 0X04, deck: 1, key: 4},

			{action: 'HOT_CUE', 		cmd: 0x95, note: 0X01, deck: 2, key: 1},
			{action: 'HOT_CUE', 		cmd: 0x95, note: 0X02, deck: 2, key: 2},
			{action: 'HOT_CUE', 		cmd: 0x95, note: 0X03, deck: 2, key: 3},
			{action: 'HOT_CUE', 		cmd: 0x95, note: 0X04, deck: 2, key: 4},


			{action: 'LOOP_AUTO', 		cmd: 0x94, note: 0X11, deck: 1, key: 1},
			{action: 'LOOP_AUTO', 		cmd: 0x94, note: 0X12, deck: 1, key: 2},
			{action: 'LOOP_AUTO', 		cmd: 0x94, note: 0X13, deck: 1, key: 3},
			{action: 'LOOP_AUTO', 		cmd: 0x94, note: 0X14, deck: 1, key: 4},

			{action: 'LOOP_AUTO', 		cmd: 0x95, note: 0X11, deck: 2, key: 1},
			{action: 'LOOP_AUTO', 		cmd: 0x95, note: 0X12, deck: 2, key: 2},
			{action: 'LOOP_AUTO', 		cmd: 0x95, note: 0X13, deck: 2, key: 3},
			{action: 'LOOP_AUTO', 		cmd: 0x95, note: 0X14, deck: 2, key: 4},

			{action: 'LOOP_MANUAL', 	cmd: 0x94, note: 0X21, deck: 1, key: 1},
			{action: 'LOOP_MANUAL', 	cmd: 0x94, note: 0X22, deck: 1, key: 2},
			{action: 'LOOP_MANUAL', 	cmd: 0x94, note: 0X23, deck: 1, key: 3},
			{action: 'LOOP_MANUAL', 	cmd: 0x94, note: 0X24, deck: 1, key: 4},

			{action: 'LOOP_MANUAL', 	cmd: 0x95, note: 0X21, deck: 2, key: 1},
			{action: 'LOOP_MANUAL', 	cmd: 0x95, note: 0X22, deck: 2, key: 2},
			{action: 'LOOP_MANUAL', 	cmd: 0x95, note: 0X23, deck: 2, key: 3},
			{action: 'LOOP_MANUAL', 	cmd: 0x95, note: 0X24, deck: 2, key: 4},

			{action: 'SAMPLER', 		cmd: 0x94, note: 0X31, deck: 1, key: 1},
			{action: 'SAMPLER', 		cmd: 0x94, note: 0X32, deck: 1, key: 2},
			{action: 'SAMPLER', 		cmd: 0x94, note: 0X33, deck: 1, key: 3},
			{action: 'SAMPLER', 		cmd: 0x94, note: 0X34, deck: 1, key: 4},

			{action: 'SAMPLER', 		cmd: 0x95, note: 0X31, deck: 2, key: 1},
			{action: 'SAMPLER', 		cmd: 0x95, note: 0X32, deck: 2, key: 2},
			{action: 'SAMPLER', 		cmd: 0x95, note: 0X33, deck: 2, key: 3},
			{action: 'SAMPLER', 		cmd: 0x95, note: 0X34, deck: 2, key: 4},

		]
			
		const map = $$.util.mapRange(0, 127, 0, 1)
		
		function getActionDesc(data) {
			const [cmd, note] = data
			for(const e of midiInputMapping) {
				if (e.cmd == cmd && e.note == note) {
					return e
				}
			}
			return null
		}

		/**@type {MIDIAccess} */
		let midiAccess = null

		/**@type {MIDIInput} */
		let midiIn = null
		/**@type {MIDIOutput} */
		let midiOut = null

		const ctrl = $$.viewController(elt, {
			data: {
				audio1: false,
				audio2: false,
				midiInputs: [],
				midiOutputs: [],
				crossFader: 0.5
			},
			events: {
				onSliderChange: function () {
					const value = $(this).getValue()
					//console.log('onSliderChange', value)
					setCrossFader(value)
				},
				onLoad: async function () {
					const audio = $(this).data('audio')
					//console.log('onLoad', audio)
					const selFile = fileList.getSelFile()
					//console.log('selFile', selFile)
					if (selFile) {
						ctrl.model[audio] = true
						ctrl.update()
						await ctrl.scope[audio].setInfo(selFile)
						ctrl.model[audio] = false
						ctrl.update()
					}
				},
				onMidiInputChange: function (ev, data) {
					const selectedId = $(this).getValue()
					console.log('onMidiInputChange', selectedId)
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
				},
				onMidiOutputChange: function (ev, data) {
					const selectedId = $(this).getValue()

					console.log('onMidiOutputChange', selectedId)
					for (const output of midiAccess.outputs.values()) {
						if (output.id == selectedId) {
							midiOut = output
							return
						}
					}
				}
			}
		})

		function setCrossFader(value) {
			gain2.gain.value = Math.cos((1.0 - value) * 0.5 * Math.PI)
			gain1.gain.value = Math.cos(value * 0.5 * Math.PI)

		}

		async function onMidiMessage(ev) {
			const [cmd, note, velocity] = ev.data
			//console.log('onMidiMessage', cmd.toString(16), note.toString(16), velocity)
			const desc =  getActionDesc(ev.data)

			if (desc == null) return
			//console.log('desc', desc)

			const {action, deck} = desc

			/**@type {DJMix.AudioPlayer.Interface} */
			let audioCtrl = null

			let audio = ''

			if (deck != undefined) {
				audio = 'audio' + deck
				audioCtrl = ctrl.scope[audio]
				//console.log(audio)
			}

			if (action == 'PLAY') {
				audioCtrl.togglePlay()
			}
			else if (action == 'LOAD') {
				const selFile = fileList.getSelFile()
				//console.log('selFile', selFile)
				if (selFile) {
					ctrl.model[audio] = true
					ctrl.update()
					await audioCtrl.setInfo(selFile)
					ctrl.model[audio] = false
					ctrl.update()
				}
			}
			else if (action == 'CROSS_FADER') {
				const crossFader = map(velocity)
				ctrl.setData({crossFader})
				setCrossFader(crossFader)
			}
			else if (action == 'LEVEL') {
				const volume = map(velocity)
				audioCtrl.setVolume(volume)
			}
			else if (action == 'SELECT_WHEEL') {
				if (velocity == 1 ) {
					fileList.selDown()
				}
				else {
					fileList.selUp()
				}
			}
			else if (action == 'ENTER') {
				fileList.enterSelFolder()
			}

		}

		async function init() {
			midiAccess = await navigator.requestMIDIAccess()
			const midiInputs = []
			for (const { name, id } of midiAccess.inputs.values()) {
				midiInputs.push({ label: name, value: id })
			}
			const midiOutputs = []
			for (const { name, id } of midiAccess.outputs.values()) {
				midiOutputs.push({ label: name, value: id })
			}
			ctrl.setData({ midiInputs, midiOutputs })
		}

		/**@type {Breizbot.Controls.FileList.Interface} */
		const fileList = ctrl.scope.filelist

		/**@type {DJMix.AudioPlayer.Interface} */
		const audio1 = ctrl.scope.audio1

		/**@type {DJMix.AudioPlayer.Interface} */
		const audio2 = ctrl.scope.audio2

		const audioCtx = new AudioContext()
		const source1 = audioCtx.createMediaElementSource(audio1.getAudioElement())
		const source2 = audioCtx.createMediaElementSource(audio2.getAudioElement())

		const gain1 = audioCtx.createGain()
		const gain2 = audioCtx.createGain()
		gain1.gain.value = 0.5
		gain2.gain.value = 0.5

		source1.connect(gain1)
		source2.connect(gain2)

		gain1.connect(audioCtx.destination)
		gain2.connect(audioCtx.destination)

		init()

	}


});




