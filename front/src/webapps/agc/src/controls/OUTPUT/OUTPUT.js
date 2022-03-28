// @ts-check

$$.control.registerControl('OUTPUT', {

	template: { gulp_inject: './OUTPUT.html' },

	deps: ['app.emuAgc'],

	props: {
	},

	/**
	 * 
	 * @param {AppAgc.Services.AGC.Interface} agc
	 */
	init: function (elt, agc) {

		const bit = agc.bit

		function getColor(value) {
			return { 'background-color': value ? '#ffffff' : 'transparent' }
		}

		const ctrl = $$.viewController(elt, {
			data: {
				channel5: 0,
				channel6: 0,
				channel14: 0,
				channel13: 0,
				CDUZ: function () {
					return getColor(bit(this.channel14, 13))
				},
				CDUY: function () {
					return getColor(bit(this.channel14, 14))
				},
				CDUX: function () {
					return getColor(bit(this.channel14, 15))
				},
				Q4U: function () {
					return getColor(bit(this.channel5, 1))
				},
				Q4D: function () {
					return getColor(bit(this.channel5, 2))
				},
				Q3U: function () {
					return getColor(bit(this.channel5, 3))
				},
				Q3D: function () {
					return getColor(bit(this.channel5, 4))
				},
				Q2U: function () {
					return getColor(bit(this.channel5, 5))
				},
				Q2D: function () {
					return getColor(bit(this.channel5, 6))
				},
				Q1U: function () {
					return getColor(bit(this.channel5, 7))
				},
				Q1D: function () {
					return getColor(bit(this.channel5, 8))
				},
				Q3A: function () {
					return getColor(bit(this.channel6, 1))
				},
				Q4F: function () {
					return getColor(bit(this.channel6, 2))
				},
				Q1F: function () {
					return getColor(bit(this.channel6, 3))
				},
				Q2A: function () {
					return getColor(bit(this.channel6, 4))
				},
				Q2L: function () {
					return getColor(bit(this.channel6, 5))
				},
				Q3R: function () {
					return getColor(bit(this.channel6, 6))
				},
				Q4R: function () {
					return getColor(bit(this.channel6, 7))
				},
				Q1L: function () {
					return getColor(bit(this.channel6, 8))
				},
				RHC_COUNTER_EANBLE: function() {
					return getColor(bit(this.channel13, 8))
				},
				START_RHC_READ: function() {
					return getColor(bit(this.channel13, 9))
				}
			},
			events: {
			}
		})

		this.update = function () {
			ctrl.setData({
				channel5: agc.getChannelState(0o5),
				channel6: agc.getChannelState(0o6),
				channel13: agc.getChannelState(0o13),
				channel14: agc.getChannelState(0o14)
			 })
		}

	}


});




