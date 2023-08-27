// @ts-check

$$.control.registerControl('gamepad', {

	template: { gulp_inject: './gamepad.html' },

	deps: ['breizbot.pager', 'breizbot.gamepad'],

	props: {
		mapping: null,
		actions: null
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.Gamepad.Interface} gamepad
	 */
	init: function (elt, pager, gamepad) {

		console.log('props', this.props)

		const {mapping, actions} = this.props

		actions.unshift('None')

		console.log(this.props)

		let axes = []
		let buttons = []

		const info = gamepad.getGamepads()[0]
		console.log({ info })

		if (mapping != null) {
			axes = mapping.axes
			buttons = mapping.buttons
		}

		if (axes.length == 0) {
			for (let i = 0; i < info.axes.length; i++) {
				axes.push({ action: 'None' })
			}
		}

		if (buttons.length == 0) {	
			for (let i = 0; i < info.buttons.length; i++) {
				buttons.push({ up: 'None', down: 'None', upValue: 0, downValue: 1 })
			}
		}

		function resetValue() {
			let axes = []
			let buttons = []
			for (let i = 0; i < info.axes.length; i++) {
				axes.push({ action: 'None' })
			}
			for (let i = 0; i < info.buttons.length; i++) {
				buttons.push({ up: 'None', down: 'None', upValue: 0, downValue: 1 })
			}
			ctrl.setData({axes, buttons})
		}

		
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
				actions,
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
				const action = $(this).find('.item').getValue()
				ret.axes.push({
					action
				})
			})

			buttonsElt.find('tr').each(function (idx) {
				const up = $(this).find('.up').getValue()
				const down = $(this).find('.down').getValue()
				const upValue = $(this).find('.upValue').getValue()
				const downValue = $(this).find('.downValue').getValue()

				ret.buttons.push({
					up,
					down,
					upValue,
					downValue
				})
			})		
			
			console.log({ret})

			return ret
		}

		this.getButtons = function () {
			return {
				check: {
					icon: 'fa fa-check',
					title: 'Apply',
					onClick: function () {
						pager.popPage(getInfo())
					}
				},
				reset: {
					icon: 'fas fa-sync',
					title: 'Reset value',
					onClick: resetValue
				}
			}

		}
	}


});




