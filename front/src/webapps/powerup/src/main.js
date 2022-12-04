// @ts-check


$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'hub', 'breizbot.gamepad', 'breizbot.appData', 'actionSrv'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {HUB} hub
	 * @param {Breizbot.Services.Gamepad.Interface} gamepad
	 * @param {Breizbot.Services.AppData.Interface} appDataSrv
	 * @param {ActionSrv.Interface} actionSrv
	 * 
	 */
	init: async function (elt, pager, hub, gamepad, appDataSrv, actionSrv) {

		const appData = appDataSrv.getData()
		//const appData = {}
		console.log('appData', appData)

		if (Object.keys(appData).length == 0) {
			appData.actions = []
			appData.mappings = {}
		}

		elt.find('button').addClass('w3-btn w3-blue')

		/**@type {Array<HUB.HubDevice>} */
		const hubDevices = []

		let gamepadMapping = null

		const ctrl = $$.viewController(elt, {
			data: {
				gamepadConnected: false,
				hubDevices,
				hubs: ['HUB1', 'HUB2']
			},
			events: {
				onHubChange: function () {
					const idx = $(this).closest('.item').index()

					console.log('onHubChange', idx, $(this).getValue())
					ctrl.model.hubDevices[idx].hubId = $(this).getValue()
				},
				onShutDown: function () {
					const idx = $(this).closest('.item').index()
					console.log('onShutDown', idx)

					/**@type {ActionSrv.HubDesc} */
					const hubDesc = ctrl.model.hubDevices[idx]
					hubDesc.hubDevice.shutdown()
				},
				onInfo: function () {
					const idx = $(this).closest('.item').index()
					console.log('onInfo', idx)
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
							actions: appData.actions,
							hubDevices: ctrl.model.hubDevices
						},
						onReturn: async function (data) {
							console.log('onReturn', data)
							appData.actions = data
							await appDataSrv.saveData(appData)
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
							actions: appData.actions
						},
						onBack: initCbk,
						onReturn: async (mapping) => {
							gamepadMapping = mapping
							console.log('onReturn', gamepadMapping)
							console.log('appData', appData)
							appData.mappings[mapping.id] = gamepadMapping
							await appDataSrv.saveData(appData)
							initCbk()
						}
					})
				},


				onConnect: async function () {
					const hubDevice = await hub.connect()




					hubDevice.on('error', (data) => {
						console.log(data)
					})

					hubDevice.on('batteryLevel', (data) => {
						//console.log('batteryLevel', data)
						const { batteryLevel } = data
						ctrl.setData({ batteryLevel })
					})
					const nbHubs = ctrl.model.hubDevices.length
					ctrl.model.hubDevices.push({ hubDevice, hubId: `HUB${nbHubs + 1}` })
					ctrl.update()

					hubDevice.on('disconnected', () => {
						console.log('disconnected', nbHubs)

						ctrl.model.hubDevices.splice(nbHubs, 1)
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

			actionSrv.execAction(ctrl.model.hubDevices, appData.actions, actionName, factor)

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
			gamepadMapping = appData.mappings[ev.id]
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




