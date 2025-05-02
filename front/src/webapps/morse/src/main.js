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

		const morseCode = {
			a: ".-", b: "-...", c: "-.-.",
			d: "-..", e: ".", f: "..-.",
			g: "--.", h: "....", i: "..",
			j: ".---", k: "-.-", l: ".-..",
			m: "--", n: "-.", o: "---",
			p: ".--.", q: "--.-", r: ".-.",
			s: "...", t: "-", u: "..-",
			v: "...-", w: ".--", x: "-..-",
			y: "-.--", z: "--..",
			0: "-----", 1: ".----", 2: "..---",
			3: "...--", 4: "....-", 5: ".....",
			6: "-....", 7: "--...", 8: "---..",
			9: "----."
		}

		async function flash(symbol, soundOn) {
			ctrl.setData({ color: 'red' })
			if (soundOn) {
				playBeep(symbol === '.' ? 200 : 600)
			}
			await $$.util.wait(symbol === '.' ? 200 : 600); // durée point/tiret
			ctrl.setData({ color: 'black' })
			await $$.util.wait(200); // temps entre symboles
		}


		function getMorse(text) {
			return text
				.toLowerCase()
				.split('')
				.map(char => {
					if (char === ' ') return '/';
					return morseCode[char] || '';
				})
				.join(' ');
		}

		function playBeep(duration = 200, frequency = 600) {
			const ctx = new AudioContext
			const oscillator = ctx.createOscillator();
			const gain = ctx.createGain();
			oscillator.frequency.value = frequency;
			oscillator.connect(gain);
			gain.connect(ctx.destination);
			oscillator.start();
			gain.gain.setValueAtTime(1, ctx.currentTime);
			oscillator.stop(ctx.currentTime + duration / 1000);
		}


		const ctrl = $$.viewController(elt, {
			data: {
				color: 'black',
				morseOutput: '',
				soundOn: true
			},
			events: {
				playMorse: async function (ev) {
					ev.preventDefault()
					const { text } = $(this).getFormData()
					const {soundOn} = ctrl.model
					ctrl.setData({ morseOutput: getMorse(text) })

					for (let char of text.toLowerCase()) {
						if (morseCode[char]) {
							const sequence = morseCode[char];
							for (let symbol of sequence) {
								await flash(symbol, soundOn);
							}
							await $$.util.wait(600); // pause entre lettres
						} else if (char === ' ') {
							await $$.util.wait(1000); // pause entre mots
						}
					}
				}
			}
		})

	}


});




