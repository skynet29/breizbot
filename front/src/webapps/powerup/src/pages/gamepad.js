// @ts-check

$$.control.registerControl('gamepad', {

	template: { gulp_inject: './gamepad.html' },

	deps: ['breizbot.pager', 'breizbot.gamepad'],

	props: {
		mapping: null
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.Gamepad.Interface} gamepad
	 */
	init: function (elt, pager, gamepad) {

		const {mapping} = this.props
		console.log({ mapping })

		let axes = []
		let buttons = []

		const info = gamepad.getGamepads()[0]
		console.log({ info })

		if (mapping != null) {
			axes = mapping.axes
			buttons = mapping.buttons
		}
		else {
			for (let i = 0; i < info.axes.length; i++) {
				axes.push({ port: 'None', hub: 'HUB1' })
			}
	
			for (let i = 0; i < info.buttons.length; i++) {
				buttons.push({ port: 'None', action: 'FWD', hub: 'HUB1' })
			}
		}




		const ports = 'ABCD'.split('')
		ports.unshift('None')

		const actions = ['FWD', 'REV']

		const hubs = ['HUB1', 'HUB2']



		
		function onGamepadAxe(data) {
			//console.log('axe', data)
			const { value, id } = data
			if (value != 0) {
				axesElt.find('tr').eq(id).find('td').eq(0).addClass('pressed')
			}
			else {
				axesElt.find('tr').eq(id).find('td').eq(0).removeClass('pressed')
			}
		} 


		function onGamepadButtonDown(data) {
			//console.log('buttonDown', data.id)
			buttonsElt.find('tr').eq(data.id).find('td').eq(0).addClass('pressed')
		}

		function onGamepadButtonUp(data) {
			//console.log('buttonDown', data.id)
			buttonsElt.find('tr').eq(data.id).find('td').eq(0).removeClass('pressed')
		}

		gamepad.on('axe', onGamepadAxe)
		gamepad.on('buttonDown', onGamepadButtonDown)
		gamepad.on('buttonUp', onGamepadButtonUp)

		this.dispose = function() {
			console.log('dispose')
			gamepad.off('axe', onGamepadAxe)
			gamepad.off('buttonDown', onGamepadButtonDown)
			gamepad.off('buttonUp', onGamepadButtonUp)
	
		}

		const ctrl = $$.viewController(elt, {
			data: {
				id: info.id,
				axes,
				buttons,
				ports,
				actions,
				hubs,
				getButtonLabel: function(scope) {
					return `Button ${scope.idx + 1}`
				},
				getAxeLabel: function(scope) {
					return `Axe ${scope.idx + 1}`
				}
			},
			events: {
			}
		})

		/**@type {JQuery} */
		const axesElt = ctrl.scope.axes

		/**@type {JQuery} */
		const buttonsElt = ctrl.scope.buttons

		function getInfo() {
			const ret = {
				id: info.id,
				axes: [],
				buttons: []
			}
			axesElt.find('tr').each(function (idx) {
				const hub = $(this).find('.hub').getValue()
				const port = $(this).find('.port').getValue()

				ret.axes.push({
					hub,
					port
				})
			})

			buttonsElt.find('tr').each(function (idx) {
				const hub = $(this).find('.hub').getValue()
				const port = $(this).find('.port').getValue()
				const action = $(this).find('.action').getValue()

				ret.buttons.push({
					hub,
					port,
					action
				})
			})			

			return ret
		}

		this.getButtons = function () {
			return {
				check: {
					icon: 'fa fa-check',
					title: 'Apply',
					onClick: function () {
						console.log(getInfo())
						pager.popPage(getInfo())
					}
				}
			}

		}
	}


});




