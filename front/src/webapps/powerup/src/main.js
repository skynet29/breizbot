// @ts-check


$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'hub', 'breizbot.gamepad', 'breizbot.appData'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {HUB} hub
	 * @param {Breizbot.Services.Gamepad.Interface} gamepad
	 * @param {Breizbot.Services.AppData.Interface} appDataSrv
	 */
	init: async function (elt, pager, hub, gamepad, appDataSrv) {

		let devices = {}
		const appData = appDataSrv.getData()
		//const appData = {}
		console.log('appData', appData)

		if (Object.keys(appData).length == 0) {
			appData.actions = []
			appData.mappings = {}
		}

		elt.find('button').addClass('w3-btn w3-blue')

		/**@type {HUB.HubDevice} */
		let hubDevice = null

		let gamepadMapping = null
		
		const ctrl = $$.viewController(elt, {
			data: {
				connected: false,
				batteryLevel: 0,
				gamepadConnected: false,

				showGamepadButton: function() {
					return this.gamepadConnected
				}
			},
			events: {
				onActions: function() {

					pager.pushPage('actionsCtrl', {
						title: 'Actions',
						props: {
							actions: appData.actions
						},
						onReturn: async function(data) {
							console.log('onReturn', data)
							appData.actions = data
							await appDataSrv.saveData(appData)
						}

					})
				},
				onGamePad: function () {
					gamepad.off('buttonUp', onGamepadButtonUp)
					gamepad.off('buttonDown', onGamepadButtonDown)

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
					hubDevice = await hub.connect()

					hubDevice.on('disconnected', () => {
						console.log('disconnected', hubDevice)
						ctrl.setData({ connected: false})
						hubDevice = null
					})
			
			
					hubDevice.on('error', (data) => {
						console.log(data)
					})
			
					hubDevice.on('batteryLevel', (data) => {
						//console.log('batteryLevel', data)
						const { batteryLevel } = data
						ctrl.setData({ batteryLevel })
					})					
					ctrl.setData({ connected: true })
					//await motorCD.create()
					// await hub.subscribe(hub.PortMap.TILT_SENSOR, hub.DeviceMode.TILT_POS, 2, (data) => {
					// 	console.log('TILT POS', data.value)
					// })
				},
				onHubInfo: async function () {
					console.log('onHubInfo', hubDevice.getHubDevices())
					pager.pushPage('hubinfo', {
						title: 'Hub Info',
						props: {
							hubDevice
						}
					})
				},
				onShutdown: async function () {
					await hubDevice.shutdown()
					hubDevice = null
				}
			}
		})

		async function execAction(actionName) {
			console.log('execAction', actionName)
			const actionDesc = appData.actions.find(e => e.name == actionName)
			//console.log({actionDesc})
			if (actionDesc.type == 'POWER') {
				const motor = hubDevice.createMotor(hub.PortMap[actionDesc.port])
				motor.setPower(actionDesc.power)				
			}
			else if (actionDesc.type == 'SPEED') {
				const motor = hubDevice.createMotor(hub.PortMap[actionDesc.port])
				motor.setSpeed(actionDesc.speed)				
			}
			else if (actionDesc.type == 'DBLSPEED') {
				const portId1 = hub.PortMap[actionDesc.port1]
				const portId2 = hub.PortMap[actionDesc.port2]

				const motor = await hubDevice.createDblMotor(portId1, portId2)
				motor.setSpeed(actionDesc.speed1, actionDesc.speed2)				
			}
		}

		function onGamepadButtonDown(data) {
			//console.log('onGamepadButtonDown', data)
			if (gamepadMapping && ctrl.model.connected) {
				const {down} = gamepadMapping.buttons[data.id]
				if (down != 'None') {
					execAction(down)
				}
			}
		} 

		function onGamepadButtonUp(data) {
			//console.log('onGamepadButtonUp', data)

			if (gamepadMapping && ctrl.model.connected) {
				const {up} = gamepadMapping.buttons[data.id]
				if (up != 'None') {
					execAction(up)
				}
			}
		} 

		function initCbk() {
			console.log('initCbk')
			gamepad.on('buttonUp', onGamepadButtonUp)
			gamepad.on('buttonDown', onGamepadButtonDown)
		}



		gamepad.on('connected', (ev) => {
			console.log('gamepad connnected', ev)
			gamepadMapping = appData.mappings[ev.id]
			console.log({gamepadMapping})

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




