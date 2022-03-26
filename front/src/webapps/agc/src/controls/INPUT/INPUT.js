// @ts-check

$$.control.registerControl('INPUT', {

	template: { gulp_inject: './INPUT.html' },

	deps: ['breizbot.pager', 'app.emuAgc'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {AppAgc.Services.AGC.Interface} agc
	 */
	init: function (elt, pager, agc) {


		const ctrl = $$.viewController(elt, {
			data: {
				roll: 0,
				pitch: 0,
				yaw: 0,
				rhcRange: {
					min: -57,
					max: 57
				},
				DAP_MODE: 'OFF',
				THC: 'NEUTRAL'
			},
			events: {
				onDetent: function (ev) {
					//console.log('onDetent')
					ctrl.setData({ roll: 0, pitch: 0, yaw: 0 })
				},
				onCheckbox: function () {
					const check = $(this)
					const { channel, bit } = check.data()
					const chanOctal = parseInt(channel, 8)
					//console.log('onCheckbox', check.data(), check.getValue())
					agc.writeIoBit(chanOctal, bit, check.getValue() ? 0 : 1)
				},
				onDapModeChange: function (ev) {
					const DAP_MODE = $(this).getValue()
					console.log('onDapModeChange', DAP_MODE)
					switch (DAP_MODE) {
						case 'OFF':
							agc.writeIoBits(0o31, { 13: 1, 14: 1 })
							break
						case 'HOLD':
							agc.writeIoBits(0o31, { 13: 0, 14: 1 })
							break
						case 'AUTO':
							agc.writeIoBits(0o31, { 13: 1, 14: 0 })
							break
					}
				},
				onThcChange: function () {
					const THC = $(this).getValue()
					console.log('onThcChange', THC)
					switch (THC) {
						case 'NEUTRAL':
							agc.writeIoBits(0o31, { 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1 })
							break
						case '+X':
							agc.writeIoBits(0o31, { 7: 0, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1 })
							break
						case '-X':
							agc.writeIoBits(0o31, { 7: 1, 8: 0, 9: 1, 10: 1, 11: 1, 12: 1 })
							break
						case '+Y':
							agc.writeIoBits(0o31, { 7: 1, 8: 1, 9: 0, 10: 1, 11: 1, 12: 1 })
							break
						case '-Y':
							agc.writeIoBits(0o31, { 7: 1, 8: 1, 9: 1, 10: 0, 11: 1, 12: 1 })
							break
						case '+Z':
							agc.writeIoBits(0o31, { 7: 1, 8: 1, 9: 1, 10: 1, 11: 0, 12: 1 })
							break
						case '-Z':
							agc.writeIoBits(0o31, { 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 0 })
							break
					}

				}
			}
		})

	}


});




