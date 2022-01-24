// @ts-check

$$.control.registerControl('DSKY', {

	template: { gulp_inject: './DSKY.html' },

	deps: ['breizbot.pager'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, pager) {

		const keyMapping = {
			'VERB': 17,
			'NOUN': 31,
			'+': 26,
			'-': 27,
			'0': 16,
			'CLR': 30,
			'KEY REL': 25,
			'ENTR': 28,
			'RSET': 18
		}

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onKey: function(ev) {
					const text = $(this).text()
					let val = keyMapping[text]
					if (val == undefined) {
						val = parseInt(text)
					}

					console.log('onKey', val)
				}
			}
		})

	}


});




