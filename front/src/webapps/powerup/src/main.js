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


		const motorA = hub.Motor(hub.PortMap.A)
		const motorB = hub.Motor(hub.PortMap.B)
		const motorC = hub.Motor(hub.PortMap.C)
		const motorD = hub.Motor(hub.PortMap.D)
		const motorCD = hub.DoubleMotor(hub.PortMap.C, hub.PortMap.D)
		const led = hub.Led(hub.PortMap.HUB_LED)

		const actions = [
			{
				name: 'Change Mode',
				fn: onChangeMode
			},
			{
				name: 'Move Forward',
				mode: 'RUNNING',
				value: [-100, -100],
				key: 2
			},
			{
				name: 'Move Backward',
				mode: 'RUNNING',
				value: [100, 100],
				key: 1
			},
			{
				name: 'Move Left',
				mode: 'RUNNING',
				value: [-100, 100],
				key: 3
			},
			{
				name: 'Move Right',
				mode: 'RUNNING',
				value: [100, -100],
				key: 4
			},

			{
				name: 'Arm Up',
				mode: 'MANIPULATOR',
				motor: motorC,
				value: -100,
				key: 1
			},
			{
				name: 'Arm Down',
				mode: 'MANIPULATOR',
				motor: motorC,
				value: 100,
				key: 2
			},
			{
				name: 'Elbow Up',
				mode: 'MANIPULATOR',
				motor: motorD,
				value: 100,
				key: 3
			},
			{
				name: 'Elbow Down',
				mode: 'MANIPULATOR',
				motor: motorD,
				value: -100,
				key: 4
			},

			{
				name: 'Hand Open',
				motor: motorB,
				value: -100,
				key: 5
			},
			{
				name: 'Hand Close',
				motor: motorB,
				value: 100,
				key: 6
			},
		]


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

		gamepad.on('buttonDown', (data) => {
			buttonDown(getGamepadAction(data.id))
		})

		gamepad.on('buttonUp', (data) => {
			buttonUp(getGamepadAction(data.id))

		})


		hub.on('disconnected', () => {
			ctrl.setData({ connected: false, mode: 'UNKNOWN' })
		})


		hub.on('error', (data) => {
			console.log(data)
		})

		hub.on('batteryLevel', (data) => {
			//console.log('batteryLevel', data)
			const { batteryLevel } = data
			ctrl.setData({ batteryLevel })
		})

		async function onChangeMode() {
			const { mode } = ctrl.model
			await motorCD.setSpeed(0, 0)

			if (mode == 'RUNNING') {
				await led.setColor(hub.Color.YELLOW)
				await motorA.rotateDegrees(180, 50)
				await led.setColor(hub.Color.GREEN)
				ctrl.setData({ mode: 'MANIPULATOR' })
			}
			else if (mode == 'MANIPULATOR') {
				await led.setColor(hub.Color.YELLOW)
				await motorA.rotateDegrees(180, -50)
				await led.setColor(hub.Color.BLUE)
				ctrl.setData({ mode: 'RUNNING' })
			}
		}

		elt.find('button').addClass('w3-btn w3-blue')
		
		const ctrl = $$.viewController(elt, {
			data: {
				connected: false,
				batteryLevel: 0,
				mode: 'UNKNOWN',
				maxSpeed: 100,
				gamepadConnected: false,
				fmtMaxSpeed: function () {
					return this.maxSpeed.toLocaleString().padStart(4)
				},
				isInit: function () {
					return this.connected && ['RUNNING', 'MANIPULATOR'].includes(this.mode)
				},
				showGamepadButton: function() {
					return this.connected && this.gamepadConnected
				}
			},
			events: {
				onGamePad: function () {
					pager.pushPage('gamepad', {
						title: 'Gamepad',
						props: {
							actions
						},
						onReturn: async (gamepadMapping) => {
							console.log('onReturn', gamepadMapping)
							const gamepadId = gamepad.getGamepads()[0].id
							appData[gamepadId] = gamepadMapping
							await appDataSrv.saveData(appData)
						}
					})
				},
				onButtonDown: function () {
					const cmdId = $(this).data('cmd')
					//console.log('onButtonDown', cmdId)
					buttonDown(getAction(cmdId))
				},
				onButtonUp: function () {
					const cmdId = $(this).data('cmd')
					//console.log('onButtonUp', cmdId)
					buttonUp(getAction(cmdId))

				},

				onConnect: async function () {
					await hub.connect()
					ctrl.setData({ connected: true })
					await motorCD.create()
					// await hub.subscribe(hub.PortMap.TILT_SENSOR, hub.DeviceMode.TILT_POS, 2, (data) => {
					// 	console.log('TILT POS', data.value)
					// })
				},
				onCalibrate: async function () {
					console.log('onCalibrate')
					ctrl.setData({ mode: 'CALIBRATING' })

					console.log('step 1')

					await led.setColor(hub.Color.RED)
					await motorA.setSpeed(-20)
					await $$.util.wait(200)
					await motorA.setSpeed(20)

					console.log('step 11')

					await motorA.waitSpeed((speed) => {
						//console.log({speed})
						return speed > 5
					})

					console.log('step 2')
					await motorA.waitSpeed((speed) => {
						//console.log({speed})
						return speed < 6
					})
					console.log('step 3')

					await motorA.setPower(0)
					await $$.util.wait(300)
					await motorA.rotateDegrees(-220, -20)
					await led.setColor(hub.Color.BLUE)
					ctrl.setData({ mode: 'RUNNING' })

				},
				onChangeMode,
				onHubInfo: async function () {
					console.log('onHubInfo')
					pager.pushPage('hubinfo', {
						title: 'Hub Info',
						props: {
							devices
						}
					})
				},
				onShutdown: async function () {
					await hub.shutdown()
				}
			}
		})


		gamepad.on('connected', (ev) => {
			console.log('gamepad connnected', ev)
			const gamepadMapping = appData[ev.id]
			if (gamepadMapping) {
				for(const {actionId, button} of gamepadMapping) {
					actions[actionId].button = button
				}
			}
			ctrl.setData({ gamepadConnected: true })
			gamepad.checkGamePadStatus()

		})

		gamepad.on('disconnected', (ev) => {
			console.log('gamepad disconnected')
			ctrl.setData({ gamepadConnected: false })

		})

	}


});




