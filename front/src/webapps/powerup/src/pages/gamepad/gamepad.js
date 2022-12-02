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

		const {mapping, actions} = this.props
		console.log(this.props)

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
				axes.push({ up: 'None', down: 'None' })
			}
	
			for (let i = 0; i < info.buttons.length; i++) {
				buttons.push({ up: 'None', down: 'None' })
			}
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
				getButtonLabel: function(scope) {
					return `Button ${scope.idx + 1}`
				},
				getAxeLabel: function(scope) {
					return `Axe ${scope.idx + 1}`
				}
			},
			events: {
				onItemClick: function() {
					const idx = $(this).closest('tr').index()
					const cmd = $(this).data('cmd')
					//console.log('onItemClick', idx, cmd)
					pager.pushPage('actionsCtrl', {
						title: 'Select an action',
						props: {
							isEdition: false,
							actions
						},
						onReturn: function(actionName) {
							//console.log({actionName})
							ctrl.model.buttons[idx][cmd] = actionName
							ctrl.update()
						}
					})
				}
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
			// axesElt.find('tr').each(function (idx) {
			// 	const up = $(this).find('.up').getValue()
			// 	const down = $(this).find('.down').getValue()

			// 	ret.axes.push({
			// 		hub,
			// 		port
			// 	})
			// })

			buttonsElt.find('tr').each(function (idx) {
				const up = $(this).find('[data-cmd="up"]').text()
				const down = $(this).find('[data-cmd="down"]').text()

				ret.buttons.push({
					up,
					down
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
				}
			}

		}
	}


});




