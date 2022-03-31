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
					agc.writeIo(0o166, 0)
					agc.writeIo(0o167, 0)
					agc.writeIo(0o170, 0)
					agc.writeIoBit(0o31, 15, 1)
					reset_rhc()
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
				},
				onRollChange: function() {
					console.log('onRollChange', ctrl.model.roll)
					write_rhc(ctrl.model.roll, 0o170, 5, 6)
				},
				onPitchChange: function() {
					console.log('onPitchChange', ctrl.model.pitch)
					write_rhc(ctrl.model.pitch, 0o166, 1, 2)
				},
				onYawChange: function() {
					console.log('onYawChange', ctrl.model.yaw)
					write_rhc(ctrl.model.yaw, 0o167, 3, 4)
				}

			}
		})

		function write_rhc(val, chan, bit1, bit2) {
			const bit15 = agc.getChannelBitState(0o31, 15)
			let bits = {}
			if(val < 0) {
				if (bit15 == 1) {
					bits[bit1] = 1
					bits[bit2] = 0
					setTimeout(reset_rhc, 100)
				}
				bits[15] = 0
				val = (-val) ^0x7FFF // converts to ones-complement
			}
			else if (val > 0) {
				if (bit15 == 1) {
					bits[bit1] = 0
					bits[bit2] = 1
					setTimeout(reset_rhc, 100)
				}
				bits[15] = 0
			}

			//console.log('bits', bits)
			agc.writeIoBits(0o31, bits)
			agc.writeIo(chan, val)

			const {roll, pitch, yaw} = ctrl.model
			if (roll == 0 && pitch == 0 && yaw == 0 && bit15 == 0) {
				agc.writeIoBit(0o31, 15, 1)
			}

		}

		function reset_rhc() {
			console.log('reset_rhc')
			agc.writeIoBits(0o31, {1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1})
		}

	}


});




