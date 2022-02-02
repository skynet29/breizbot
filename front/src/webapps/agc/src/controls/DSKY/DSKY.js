// @ts-check

$$.control.registerControl('DSKY', {

	template: { gulp_inject: './DSKY.html' },

	deps: ['breizbot.pager', 'app.emuAgc'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {AppAgc.Services.Interface} agc
	 */
	init: function (elt, pager, agc) {

		var floor = Math.floor
		var round = Math.round

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


		function getDigit(c) {
			var d = 'E';
			switch (c) {
				case 0: d = 'H'; break;
				case 21: d = '0'; break;
				case 3: d = '1'; break;
				case 25: d = '2'; break;
				case 27: d = '3'; break;
				case 15: d = '4'; break;
				case 30: d = '5'; break;
				case 28: d = '6'; break;
				case 19: d = '7'; break;
				case 29: d = '8'; break;
				case 31: d = '9'; break;
			}
			return d;
		}

		let sign1p = 0
		let sign1m = 0
		let sign2p = 0
		let sign2m = 0
		let sign3p = 0
		let sign3m = 0


		const space = '&nbsp;'

		function getColor(value) {
			return { 'background-color': value ? '#ffc200' : '#888888' }
		}

		function getColor2(value) {
			return { 'background-color': value ? '#ffffff' : '#888888' }
		}

		const ctrl = $$.viewController(elt, {
			data: {
				lamps: 0,
				status8: 0, // status bits of AGC output channel 010
				digits: '000000+00000+00000+00000',
				on: 0,	// to simulate blinking (phase increases by 1 every 100 ms)
				comp_acty: function () {
					return getColor(this.lamps & agc.lampMask.COMP_ACTY)
				},
				uplink_acty: function () {
					return getColor2(this.lamps & agc.lampMask.UPLINK_ACTY)
				},
				temp: function () {
					return getColor(this.lamps & agc.lampMask.TEMP)
				},
				key_rel: function () {
					return getColor2(this.lamps & agc.lampMask.KEY_REL)
				},
				opr_err: function () {
					return getColor2(this.lamps & agc.lampMask.OPER_ERR)
				},
				stby: function () {
					return getColor2(this.lamps & agc.lampMask.STBY)
				},
				vel: function () {
					return getColor(this.status8 & agc.statusMask.VEL)
				},
				no_att: function () {
					return getColor2(this.status8 & agc.statusMask.NO_ATT)
				},
				alt: function () {
					return getColor(this.status8 & agc.statusMask.ALT)
				},
				gimball_lock: function () {
					return getColor(this.status8 & agc.statusMask.GIMBAL_LOCK)
				},
				tracker: function () {
					return getColor(this.status8 & agc.statusMask.TRACKER)
				},
				prog: function () {
					return getColor(this.status8 & agc.statusMask.PROG)
				},
				r1: function () {
					return this.digits.slice(6, 12).replace(/H/g, space)
				},
				r2: function () {
					return this.digits.slice(12, 18).replace(/H/g, space)
				},
				prog00: function () {
					return this.digits.slice(0, 2).replace(/H/g, space)
				},
				r3: function () {
					return this.digits.slice(18, 24).replace(/H/g, space)
				},
				verb00: function () {
					if (!(this.lamps & agc.lampMask.VERB_NOUN)) {
						return this.digits.slice(2, 4).replace(/H/g, space)
					}
					else {
						return space + space;
					}
				},
				noun00: function () {
					if (!(this.lamps & agc.lampMask.VERB_NOUN)) {
						return this.digits.slice(4, 6).replace(/H/g, space)
					}
					else {
						return space + space;
					}
				}
			},
			events: {
				onKey: function (ev) {
					const text = $(this).text()
					let val = keyMapping[text]
					if (val == undefined) {
						val = parseInt(text)
					}

					ev.stopPropagation()
					elt.trigger('key', { val })
				}
			}
		})



		this.processLights = function (value) {
			//console.log('processLights', value.toString(2))
			ctrl.setData({ lamps: value })
		}

		this.process = function (channel, value) {
			if (value == 0) return
			/*
				The 15-bit code output in i/o channel 10 (octal) can be represented in bit-fields as AAAABCCCCCDDDDD where
				AAAA indicates the digit-pair
					11: PROG
					10: VERB
					9 : NOUN
					8(D), 7, 6: REG1 (5 digits)
					5, 4, 3(C): REG2
					3(D), 2, 1: REG3
	
	
				B sets or resets a +/- sign, 
				CCCCC is the value for the left-hand digit of the pair, 
				DDDDD is the value for the right-hand digit of the pair.
			*/
			const aa = value >> 11
			const bb = (value >> 10) & 1
			const cc = getDigit((value >> 5) & 0x1f)
			const dd = getDigit(value & 0x1f)
			const s = ctrl.model.digits.split('')

			switch (aa) {
				case 12:
					ctrl.setData({ status8: value })
					break
				case 11:
					s[0] = cc
					s[1] = dd
					break
				case 10:
					s[2] = cc
					s[3] = dd
					break
				case 9:
					s[4] = cc
					s[5] = dd
					break
				case 8:
					s[7] = dd
					break
				case 7:
					s[8] = cc
					s[9] = dd
					sign1p = bb
					break
				case 6:
					s[10] = cc
					s[11] = dd
					sign1m = bb
					break
				case 5:
					s[13] = cc
					s[14] = dd
					sign2p = bb
					break
				case 4:
					s[15] = cc
					s[16] = dd
					sign2m = bb
					break
				case 3:
					s[17] = cc
					s[19] = dd
					break
				case 2:
					s[20] = cc
					s[21] = dd
					sign3p = bb
					break
				case 1:
					s[22] = cc
					s[23] = dd
					sign3m = bb
					break

			}
			if (aa != 12) {
				//console.log({ aa, bb, cc, dd })
				s[6] = (sign1p && !sign1m ? '+' : (!sign1p && !sign1m ? 'H' : '-'));
				s[12] = (sign2p && !sign2m ? '+' : (!sign2p && !sign2m ? 'H' : '-'));
				s[18] = (sign3p && !sign3m ? '+' : (!sign3p && !sign3m ? 'H' : '-'));

				const digits = s.join('')
				//console.log('s', digits)
				ctrl.setData({ digits })
			}
			else {
				//console.log('channel', channel, 'value', value.toString(16))
			}

			// else if (channel == 0o11) {
			// 	console.log('status9', value.toString(16))
			// }
			// else if (channel == 0o13) {
			// 	//status11 = value & 0x0200
			// 	ctrl.setData({status11: value & 0x0200})
			// }
		}

	}


});




