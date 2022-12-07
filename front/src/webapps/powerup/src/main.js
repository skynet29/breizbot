// @ts-check


$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'hub', 'breizbot.gamepad', 'actionSrv', 'breizbot.http'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {HUB} hub
	 * @param {Breizbot.Services.Gamepad.Interface} gamepad
	 * @param {ActionSrv.Interface} actionSrv
	 * @param {Breizbot.Services.Http.Interface} http
	 * 
	 */
	init: async function (elt, pager, hub, gamepad, actionSrv, http) {

		//const config = {}

		let config = {
			actions: [],
			mappings: {}
		}

		elt.find('button').addClass('w3-btn w3-blue')

		/**@type {Array<HUB.HubDevice>} */
		const hubDevices = []

		let gamepadMapping = null
		let gamepadId = ''

		const ctrl = $$.viewController(elt, {
			data: {
				currentConfig: '',
				gamepadConnected: false,
				hubDevices,
				hubs: ['HUB1', 'HUB2']
			},
			events: {
				onNewConfig: function() {
					config = {
						actions: [],
						mappings: {}
					}
					ctrl.setData({currentConfig: ''})
				},
				onSaveConfig: async function() {
					//console.log('onSaveConfig', config)
					if (ctrl.model.currentConfig == '') {
						const currentConfig = await $$.ui.showPrompt({title: 'Save Config', label: 'Config Name:'})
						//console.log({currentConfig})
						if (currentConfig) {
							await http.post('/add', {name: currentConfig, actions: config.actions, mappings: config.mappings})
							ctrl.setData({currentConfig})
						}
					}
					else {
						await http.post('/update', config)
					}

				},
				onConfig: function() {
					//console.log('onConfig')
					pager.pushPage('configCtrl', {
						title: 'Configurations',
						props: {
							currentConfig: ctrl.model.currentConfig
						},	
						onReturn: function(data) {
							config = data
							ctrl.setData({currentConfig: data.name})
							gamepadMapping = config.mappings[gamepadId]
							//console.log({gamepadMapping})
						}
					})
				},
				onHubChange: function () {
					const idx = $(this).closest('tr').index()

					//console.log('onHubChange', idx, $(this).getValue())
					ctrl.model.hubDevices[idx].hubId = $(this).getValue()
				},
				onShutDown: function () {
					const idx = $(this).closest('tr').index()
					//console.log('onShutDown', idx)

					/**@type {ActionSrv.HubDesc} */
					const hubDesc = ctrl.model.hubDevices[idx]
					hubDesc.hubDevice.shutdown()
				},
				onInfo: function () {
					const idx = $(this).closest('tr').index()
					//console.log('onInfo', idx)
					/**@type {ActionSrv.HubDesc} */
					const hubDesc = ctrl.model.hubDevices[idx]

					pager.pushPage('hubinfo', {
						title: hubDesc.hubId,
						props: {
							hubDevice: hubDesc.hubDevice
						}
					})
				},
				onActions: function () {

					pager.pushPage('actionsCtrl', {
						title: 'Actions',
						props: {
							actions: config.actions,
							hubDevices: ctrl.model.hubDevices
						},
						onReturn: async function (data) {
							console.log('onReturn', data)
							config.actions = data
						}

					})
				},
				onGamePad: function () {
					gamepad.off('buttonUp', onGamepadButtonUp)
					gamepad.off('buttonDown', onGamepadButtonDown)
					gamepad.off('axe', onGamepadAxe)

					pager.pushPage('gamepad', {
						title: 'Gamepad',
						props: {
							mapping: gamepadMapping,
							actions: config.actions
						},
						onBack: initCbk,
						onReturn: async (mapping) => {
							gamepadMapping = mapping
							console.log('onReturn', gamepadMapping)
							console.log('config', config)
							config.mappings[mapping.id] = gamepadMapping
							initCbk()
						}
					})
				},


				onConnect: async function () {
					const hubDevice = await hub.connect()


					hubDevice.on('error', (data) => {
						console.log(data)
					})

					const nbHubs = ctrl.model.hubDevices.length
					ctrl.model.hubDevices.push({ hubDevice, hubId: `HUB${nbHubs + 1}`, batteryLevel: 0, address: 'Unknown' })
					ctrl.update()

					hubDevice.on('batteryLevel', (data) => {
						//console.log('batteryLevel', data)
						const hubDesc = ctrl.model.hubDevices.find((e) => e.hubDevice == hubDevice)
						hubDesc.batteryLevel = data.batteryLevel
						ctrl.update()
					})			

					hubDevice.on('address', (data) => {
						console.log('address', data)
						const hubDesc = ctrl.model.hubDevices.find((e) => e.hubDevice == hubDevice)
						hubDesc.address = data.address
						ctrl.update()
					})		
					
					hubDevice.startNotification()

					hubDevice.on('disconnected', () => {
						console.log('disconnected')
						const idx = ctrl.model.hubDevices.findIndex((e) => e.hubDevice == hubDevice)
						ctrl.model.hubDevices.splice(idx, 1)
						ctrl.update()
					})
					//await motorCD.create()
					// await hub.subscribe(hub.PortMap.TILT_SENSOR, hub.DeviceMode.TILT_POS, 2, (data) => {
					// 	console.log('TILT POS', data.value)
					// })
				}


			}
		})

		/**
		 * 
		 * @param {string} actionName 
		 * @param {number} factor 
		 */
		function execAction(actionName, factor) {

			actionSrv.execAction(ctrl.model.hubDevices, config.actions, actionName, factor)

		}

		function onGamepadButtonDown(data) {
			//console.log('onGamepadButtonDown', data)
			if (gamepadMapping) {
				const { down } = gamepadMapping.buttons[data.id]
				if (down != 'None') {
					execAction(down, 1)
				}
			}
		}

		function onGamepadButtonUp(data) {
			//console.log('onGamepadButtonUp', data)

			if (gamepadMapping) {
				const { up } = gamepadMapping.buttons[data.id]
				if (up != 'None') {
					execAction(up, 1)
				}
			}
		}

		function onGamepadAxe(data) {
			console.log('onGamepadAxe', data)
			if (gamepadMapping) {
				const { action } = gamepadMapping.axes[data.id]
				if (action != 'None') {
					execAction(action, data.value)
				}
			}
		}


		function initCbk() {
			console.log('initCbk')
			gamepad.on('buttonUp', onGamepadButtonUp)
			gamepad.on('buttonDown', onGamepadButtonDown)
			gamepad.on('axe', onGamepadAxe)

		}



		gamepad.on('connected', (ev) => {
			console.log('gamepad connnected', ev)
			gamepadId = ev.id
			gamepadMapping = config.mappings[gamepadId]
			console.log({ gamepadMapping })

			ctrl.setData({ gamepadConnected: true })
			gamepad.checkGamePadStatus()
			initCbk()


		})

		gamepad.on('disconnected', (ev) => {
			console.log('gamepad disconnected')
			ctrl.setData({ gamepadConnected: false })
			gamepadMapping = null

		})

	}


});




