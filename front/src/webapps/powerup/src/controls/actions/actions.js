// @ts-check

/**
 * @typedef {Object} ActionInfo
 * @property {string} hubName
 * @property {number} portId
 * @property {string} name
 * @property {HUB.DeviceAction[]} devActions
 */


$$.control.registerControl('actions', {

	template: { gulp_inject: './actions.html' },

	deps: ['breizbot.pager'],

	props: {
		hubDevices: []
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, pager) {

		/**@type Array<HUB.HubDevice> */
		const hubDevices = this.props.hubDevices

		function getActions() {
			/**@type Array<ActionInfo> */
			const actions = []
			for (const hub of hubDevices) {
				const hubName = hub.name
				const devices = hub.getHubDevices()
				for (const device of devices) {
					const { portId, name, actions: devActions } = device
					for (const devAction of devActions) {
						devAction.isActionEnabled = device.isActionEnabled(devAction.action)
					}

					if (devActions.length > 0)
						actions.push({ hubName, portId, name, devActions })
				}
			}
			console.log('actions', actions)
			return actions
		}

		const ctrl = $$.viewController(elt, {
			data: {
				actions: getActions()
			},
			events: {
				onBtnAction: async function () {
					const cmd = $(this).data('cmd')
					const idx = $(this).closest('tr').index()

					/**@type ActionInfo */
					const info = ctrl.model.actions[idx]

					console.log('onBtnAction', cmd, info)
					const device = getDevice(info.hubName, info.portId)
					if (device) {
						if (cmd == 'CALIBRATE') {
							$(this).removeClass('w3-green')
							$(this).addClass('w3-yellow')

							await device.execAction(cmd)
							$(this).removeClass('w3-yellow')
							$(this).addClass('w3-green')
						}
						else {
							device.execAction(cmd)
						}
					}

				}
			}
		})

		function getDevice(hubName, portId) {
			console.log('getDevice', { hubName, portId })
			const hub = hubDevices.find(h => h.name == hubName)
			const device = hub.getDevice(portId)
			return device
		}

		this.getButtons = function () {
			return {
				apply: {
					title: 'Add Action',
					icon: 'fas fa-plus',
					onClick: function () {
						console.log('addAction')
						pager.pushPage('addAction', {
							title: 'Add Action',
							props: {
								hubDevices
							},
							onReturn: function (data) {
								console.log('onReturn', data)
								const { hub, port, action, label } = data
								const device = getDevice(hub, port)
								device.actions.push({ action, label })
								ctrl.model.actions = getActions()
								ctrl.update()
							}
						})
					}
				}
			}
		}

	}



});




