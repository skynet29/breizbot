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
		console.log('appData', appData)


		let action = null


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
				onAction: function() {

					pager.pushPage('action', {
						title: 'Action',
						props: {
							data: action
						},
						onReturn: function(data) {
							action = data
						}
					})
				},
				onGamePad: function () {
					gamepad.off('buttonUp', onGamepadButtonUp)
					gamepad.off('buttonDown', onGamepadButtonDown)

					pager.pushPage('gamepad', {
						title: 'Gamepad',
						props: {
							mapping: gamepadMapping
						},
						onBack: initCbk,
						onReturn: async (mapping) => {
							gamepadMapping = mapping
							console.log('onReturn', gamepadMapping)
							appData[mapping.id] = gamepadMapping
							await appDataSrv.saveData(appData)
							initCbk()
						}
					})
				},


				onConnect: async function () {
					hubDevice = await hub.connect()

					await hubDevice.createVirtualPort(hub.PortMap.D, hub.PortMap.B)
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

		function onGamepadButtonDown(data) {
			//console.log('onGamepadButtonDown', data)
			if (gamepadMapping && ctrl.model.connected) {
				const {port, action} = gamepadMapping.buttons[data.id]
				console.log({port, action})
				if (port != 'None') {
					const motor = hubDevice.createMotor(hub.PortMap[port])
					motor.setPower(action == 'FWD' ? 100 : -100)
				}
			}
		} 

		function onGamepadButtonUp(data) {
			//console.log('onGamepadButtonUp', data)

			if (gamepadMapping && ctrl.model.connected) {
				const {port, action} = gamepadMapping.buttons[data.id]
				console.log({port, action})
				if (port != 'None') {
					const motor = hubDevice.createMotor(hub.PortMap[port])
					motor.setPower(0)
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
			gamepadMapping = appData[ev.id]
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




