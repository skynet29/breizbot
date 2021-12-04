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


		const ctrl = $$.viewController(elt, {
			data: {
				options : {filterExtension: 'mp3', getMP3Info: true, showMp3Filter: true}
			},
			events: {
				onSliderChange: function() {
					const val = $(this).getValue()
					//console.log('onSliderChange', val)
					gain1.gain.value = 1 - val
					gain2.gain.value = val
				}
			}
		})

		/**@type {HTMLAudioElement} */
		const audio1 = ctrl.scope.audio1.getAudioElement()

		/**@type {HTMLAudioElement} */
		const audio2 = ctrl.scope.audio2.getAudioElement()

		const audioCtx = new AudioContext()
		const source1 = audioCtx.createMediaElementSource(audio1)
		const source2 = audioCtx.createMediaElementSource(audio2)

		const gain1 = audioCtx.createGain()
		const gain2 = audioCtx.createGain()
		gain1.gain.value = 1
		gain2.gain.value = 0
		
		source1.connect(gain1)
		source2.connect(gain2)

		gain1.connect(audioCtx.destination)
		gain2.connect(audioCtx.destination)

	}


});




