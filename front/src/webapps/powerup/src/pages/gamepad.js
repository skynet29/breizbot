// @ts-check

$$.control.registerControl('gamepad', {

	template: { gulp_inject: './gamepad.html' },

	deps: ['breizbot.pager', 'breizbot.gamepad'],

	props: {
		actions: []
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.Gamepad.Interface} gamepad
	 */
	init: function (elt, pager, gamepad) {

		const {actions} = this.props


		console.log({actions})
		const info = gamepad.getGamepads()[0]

		const buttons = []
		for (let i = 0; i < info.buttons.length; i++) {
			buttons.push({label: `Button ${i + 1}`, value: i})
		}

		const ctrl = $$.viewController(elt, {
			data: {
				id: info.id,
				actions,
				buttons
			},
			events: {
			}
		})

		function getInfo() {
			const ret = []
			elt.find('.brainjs-combobox').each(function(idx) {
				const button = $(this).getValue()
				if (button != null) {
					actions[idx].button = button
					ret.push({
						actionId: idx,
						button
					})
				}

			})
			return ret
		}

		this.getButtons = function () {
			return {
				check: {
					icon: 'fa fa-check',
					title: 'Apply',
					onClick: function() {
						pager.popPage(getInfo())						
					}
				}
			}

		}
	}


});




