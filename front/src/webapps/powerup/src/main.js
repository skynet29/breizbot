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


		const actions = []



		async function buttonDown(action) {
			//console.log('buttonDown', action)
			if (action != null) {
				console.log(action)
				const { motor, value, fn } = action
				if (typeof fn == 'function') {
					fn()
				}
				else {
					if (Array.isArray(value)) {
						const [speed1, speed2] = value
						await motorCD.setSpeed(speed1, speed2)
					}
					else {
						await motor.setSpeed(value)
					}
				}
			}
		}

		async function buttonUp(action) {
			//console.log('buttonUp', action)
			if (action != null) {
				const { value, motor } = action
				if (Array.isArray(value)) {
					await motorCD.setSpeed(0, 0)
				} else if (motor != undefined) {
					await motor.setSpeed(0)
				}
			}
		}

		function getAction(cmdId) {
			const { mode } = ctrl.model
			const action = actions.find((e) => (e.mode == undefined || e.mode == mode) && e.key == cmdId)
			return (action) ? action : null
		}

		function getGamepadAction(buttonId) {
			const { mode } = ctrl.model
			const action = actions.find((e) => (e.mode == undefined || e.mode == mode) && e.button == buttonId)
			return (action) ? action : null
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
					window.hubDevice = hubDevice
					hubDevice.on('disconnected', () => {
						ctrl.setData({ connected: false, mode: 'UNKNOWN' })
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




