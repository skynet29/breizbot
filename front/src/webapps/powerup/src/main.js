// @ts-check


$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'hub', 'breizbot.gamepad'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {HUB} hub
	 * @param {Breizbot.Services.Gamepad.Interface} gamepad
	 */
	init: async function (elt, pager, hub, gamepad) {

		let speed1 = 0
		let speed2 = 0
		let motor = null
		let speed = 0
		const map = $$.util.mapRange(-1, 1, 100, 0)
		let internalDevices = []
		let externalDevices = []


		const motorA = hub.Motor(hub.PortMap.A)
		const motorB = hub.Motor(hub.PortMap.B)
		const motorC = hub.Motor(hub.PortMap.C)
		const motorD = hub.Motor(hub.PortMap.D)
		/**@type {HUB.DoubleMotorInterface} */
		let motorCD = null
		const led = hub.Led(hub.PortMap.HUB_LED)


		function run() {
			const {maxSpeed} = ctrl.model
			return motorCD.setSpeed(-speed1 * maxSpeed, -speed2 * maxSpeed)
		}

		function setMaxSpeed(value) {
			ctrl.setData({maxSpeed: Math.ceil(map(value))})
			//console.log({maxSpeed})
			if (speed1 != 0 || speed2 != 0) {
				run()
			}

		}

		gamepad.on('axe', (data) => {
			//console.log('axe', data)
			const {id, value} = data
			if (id == 2) {
				setMaxSpeed(value)
			}
		})

		async function buttonDown(data) {
			//console.log('buttonDown', data)
			const { id } = data
			if (id == 0) {
				await onChangeMode()
			}
			else if (id == 5) {
				await motorB.setSpeed(100)
			}
			else if (id == 6) {
				await motorB.setSpeed(-100)
			}
			else if (ctrl.model.mode == 'RUNNING') {
				switch (id) {
					case 2:
						speed1 = 1
						speed2 = 1

						break
					case 1:
						speed1 = -1
						speed2 = -1
						break
					case 3:
						speed1 = 1
						speed2 = -1
						break
					case 4:
						speed1 = -1
						speed2 = 1
						break
				}
				if (speed1 != 0 && speed2 != 0) {
					await run()
				}
			}

			else if (ctrl.model.mode == 'MANIPULATOR') {
				switch (id) {
					case 2:
						motor = motorC
						speed = -100
						break
					case 1:
						motor = motorC
						speed = 100
						break
					case 3:
						motor = motorD
						speed = -100
						break
					case 4:
						motor = motorD
						speed = 100
						break

				}
				if (speed != 0) {
					await motor.setSpeed(speed)
				}

			}
		}

		gamepad.on('buttonDown', buttonDown)

		async function buttonUp(data) {
			//console.log('buttonUp', data)
			const {id} = data
			if (id == 5 || id == 6) {
				await motorB.setPower(0)
			}

			else if (speed1 != 0 || speed2 != 0) {
				speed1 = 0
				speed2 = 0
				await motorCD.setSpeed(0, 0)
			}
			else if ([1, 2, 3, 4].includes(id) && speed != 0) {
				speed = 0
				await motor.setPower(0)
			}

		}

		gamepad.on('buttonUp', buttonUp)


		hub.on('disconnected', () => {
			ctrl.setData({ connected: false })
		})

		hub.on('attach', (data) => {
			//console.log('attach', data)
			const { portId, deviceTypeName } = data
			if (portId < 50) {
				externalDevices.push({
					portId,
					portName: hub.PortMapNames[data.portId],
					deviceTypeName
				})
				externalDevices.sort((a, b) => a.portId - b.portId)
			}
			else {
				internalDevices.push({ deviceTypeName, portId })
			}
		})

		hub.on('detach', (data) => {
			//console.log('detach', data)

			const idx = ctrl.model.externalDevices.findIndex((e) => e.portId == data.portId)
			console.log('idx', idx)
			ctrl.model.externalDevices.splice(idx, 1)
			ctrl.update()
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
			speed1 = 0
			speed2 = 0

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

		const ctrl = $$.viewController(elt, {
			data: {
				connected: false,
				batteryLevel: 0,
				mode: 'UNKNOWN',
				maxSpeed: 100,
				fmtMaxSpeed: function() {
					return this.maxSpeed.toLocaleString().padStart(4)
				},
				isInit: function() {
					return this.connected && ['RUNNING', 'MANIPULATOR'].includes(this.mode)
				}
			},
			events: {
				onButtonDown: function() {
					const cmd = $(this).data('cmd')
					//console.log('onButtonDown', cmd)
					buttonDown({id: cmd})
				},
				onButtonUp: function() {
					const cmd = $(this).data('cmd')
					//console.log('onButtonUp', cmd)
					buttonUp({id: cmd})

				},

				onConnect: async function () {
					await hub.connect()
					ctrl.setData({ connected: true })
					motorCD = await hub.DoubleMotor(hub.PortMap.C, hub.PortMap.D)
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
							internalDevices,
							externalDevices
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
			gamepad.checkGamePadStatus()
			if (ev.axes[2] != undefined) {
				setMaxSpeed(ev.axes[2])

			}

		})


	}


});




