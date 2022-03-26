// @ts-check

$$.control.registerControl('INPUT', {

	template: { gulp_inject: './INPUT.html' },

	deps: ['breizbot.pager', 'app.emuAgc'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {AppAgc.Services.Interface} agc
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
				}
			},
			events: {
				onDetent: function(ev) {
					//console.log('onDetent')
					ctrl.setData({roll: 0, pitch: 0, yaw: 0})
				},
				onCheckbox: function() {
					const check = $(this)
					const {channel, bit} = check.data()
					const chanOctal = parseInt(channel, 8)
					console.log('onCheckbox', check.data(), check.getValue())
					agc.writeIoBit(chanOctal, bit, check.getValue() ? 0 : 1)
				}
			}
		})

	}


});




