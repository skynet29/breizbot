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

		function getColor(value) {
			return { 'background-color': value ? '#ffffff' : 'transparent' }
		}

		const ctrl = $$.viewController(elt, {
			data: {
				quad: new Array(16).fill(0),
				Q4U: function() {
					return getColor(this.quad[0])
				},
				Q4D: function() {
					return getColor(this.quad[1])
				},
				Q3U: function() {
					return getColor(this.quad[2])
				},
				Q3D: function() {
					return getColor(this.quad[3])
				},
				Q2U: function() {
					return getColor(this.quad[4])
				},
				Q2D: function() {
					return getColor(this.quad[5])
				},
				Q1U: function() {
					return getColor(this.quad[6])
				},
				Q1D: function() {
					return getColor(this.quad[7])
				},
				Q3A: function() {
					return getColor(this.quad[8])
				},
				Q4F: function() {
					return getColor(this.quad[9])
				},
				Q1F: function() {
					return getColor(this.quad[10])
				},
				Q2A: function() {
					return getColor(this.quad[11])
				},
				Q2L: function() {
					return getColor(this.quad[12])
				},
				Q3R: function() {
					return getColor(this.quad[13])
				},
				Q4R: function() {
					return getColor(this.quad[14])
				},
				Q1L: function() {
					return getColor(this.quad[15])
				},
			},
			events: {
			}
		})

		this.update = function() {
			const quad = []
			for(let i = 1; i <= 8; i++) {
				quad.push(agc.getChannelBitState(0o5, i))
			}
			for(let i = 1; i <= 8; i++) {
				quad.push(agc.getChannelBitState(0o6, i))
			}
			ctrl.setData({quad})
		}

	}


});




