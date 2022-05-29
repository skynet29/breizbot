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
	init: function (elt, pager, hub, gamepad) {

		let speed1 = 0
		let speed2 = 0

		gamepad.on('connected', (ev) => {
			console.log('gamepad connnected', ev)
			gamepad.checkGamePadStatus()

		})

		gamepad.on('buttonUp', async (data) => {
			console.log('buttonUp', data)
			const { id } = data
			if (id == 1) {
				await onChangeMode()
			}
			else if (ctrl.model.mode == 'MANIPULATOR') {
				let portId = false
				if (id == 2) {
					portId = hub.PortMap.B
				}
				else if (id == 3) {
					portId = hub.PortMap.C
				}
				else if (id == 4) {
					portId = hub.PortMap.D
				}
				if (portId !== false) {
					await hub.motor.setPower(portId, 0)
				}
			}

		})

		gamepad.on('buttonDown', async (data) => {
			console.log('buttonDown', data)
			await checkAxes()

		})


		async function checkAxes() {
			//console.log('axe', data)
			if (ctrl.model.mode == 'RUNNING') {
				let value = gamepad.getAxeValue(0)
				//console.log({ value })
				let motor1 = 1
				let motor2 = 1
				let speed = 0
				if (value <= -0.6) {
					motor1 = 1
					motor2 = -1
				}
				else if (value >= 0.6) {
					motor1 = -1
					motor2 = 1
				}
				value = gamepad.getAxeValue(1)
				if (value <= -0.5) {
					speed = -100
				}
				else if (value >= 0.5) {
					speed = 100
				}
				motor1 *= speed
				motor2 *= speed
				if (motor1 != speed1 || motor2 != speed2) {
					console.log({ motor1, motor2 })
					const portId = hub.getPortIdFromName('C_D')
					speed1 = motor1
					speed2 = motor2
					await hub.motor.setSpeedEx(portId, motor1, motor2)
				}
			}
			else if (ctrl.model.mode == 'MANIPULATOR') {
				let portId = false
				if (gamepad.getButtonState(2)) {
					portId = hub.PortMap.B
				}
				else if (gamepad.getButtonState(3)) {
					portId = hub.PortMap.C
				}
				else if (gamepad.getButtonState(4)) {
					portId = hub.PortMap.D
				}
				let speed = 0
				const value = gamepad.getAxeValue(1)
				if (value <= -0.5) {
					speed = -100
				}
				else if (value >= 0.5) {
					speed = 100
				}
				if (portId !== false) {
					await hub.motor.setSpeed(portId, speed)
				}

			}


		}

		gamepad.on('axe', checkAxes)


		hub.on('disconnected', () => {
			ctrl.setData({ connected: false })
		})

		hub.on('attach', (data) => {
			//console.log('attach', data)
			const { portId, deviceTypeName } = data
			if (portId < 50) {
				ctrl.model.externalDevices.push({
					portId,
					portName: hub.PortMapNames[data.portId],
					deviceTypeName
				})
				ctrl.model.externalDevices.sort((a, b) => a.portId - b.portId)
			}
			else {
				ctrl.model.internalDevices.push({ deviceTypeName, portId })
			}
			ctrl.update()
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


		/**
		 * 
		 * @param {JQuery<HTMLElement>} elt 
		 */
		function getExternalPortId(elt) {
			const idx = elt.closest('tr').index()
			return ctrl.model.externalDevices[idx].portId

		}

		/**
		 * 
		 * @param {number} portId 
		 * @param {string} deviceTypeName
		 */
		function openInfoPage(portId, deviceTypeName) {
			pager.pushPage('info', {
				title: deviceTypeName,
				props: {
					portId
				}
			})
		}

		async function onChangeMode() {
			const { mode } = ctrl.model
			const portId = hub.getPortIdFromName('C_D')
			await hub.motor.setSpeedEx(portId, 0, 0)
			speed1 = 0
			speed2 = 0

			if (mode == 'RUNNING') {
				await hub.led.setColor(hub.Color.YELLOW)
				await hub.motor.rotateDegrees(hub.PortMap.A, 180, 50)
				await hub.led.setColor(hub.Color.GREEN)
				ctrl.setData({ mode: 'MANIPULATOR' })
			}
			else if (mode == 'MANIPULATOR') {
				await hub.led.setColor(hub.Color.YELLOW)
				await hub.motor.rotateDegrees(hub.PortMap.A, 180, -50)
				await hub.led.setColor(hub.Color.BLUE)
				ctrl.setData({ mode: 'RUNNING' })
			}
		}

		const ctrl = $$.viewController(elt, {
			data: {
				connected: false,
				internalDevices: [],
				externalDevices: [],
				batteryLevel: 0,
				mode: 'UNKNOWN'
			},
			events: {
				onMouseUp: function () {
					//console.log('onMouseUp')
					const action = $(this).data('action')
					const portId = getExternalPortId($(this))
					switch (action) {
						case 'off':
							hub.motor.setPower(portId, 0)
							break
						case 'forward':
							hub.motor.setPower(portId, 100)
							break
						case 'backward':
							hub.motor.setPower(portId, -100)
							break
					}
				},
				onMouseDown: function () {
					//console.log('onMouseDown')
					const portId = getExternalPortId($(this))
					hub.motor.setPower(portId, 0)
				},
				onConnect: async function () {
					await hub.connect()
					ctrl.setData({ connected: true })
					await hub.createVirtualPort(hub.PortMap.C, hub.PortMap.D)
				},
				onCalibrate: async function () {
					console.log('onCalibrate')
					ctrl.setData({ mode: 'CALIBRATING' })

					console.log('step 1')

					await hub.led.setColor(hub.Color.RED)
					await hub.motor.setSpeed(hub.PortMap.A, -20)
					await $$.util.wait(200)
					await hub.motor.setSpeed(hub.PortMap.A, 20)

					await hub.waitTestValue(hub.PortMap.A, hub.DeviceMode.SPEED, (speed) => {
						//console.log({speed})
						return speed > 5
					})

					console.log('step 2')
					await hub.waitTestValue(hub.PortMap.A, hub.DeviceMode.SPEED, (speed) => {
						//console.log({speed})
						return speed < 6
					})
					console.log('step 3')

					await hub.motor.setPower(hub.PortMap.A, 0)
					await $$.util.wait(300)
					await hub.motor.rotateDegrees(hub.PortMap.A, -220, -20)
					await hub.motor.resetZero(hub.PortMap.A)
					await hub.led.setColor(hub.Color.BLUE)
					ctrl.setData({ mode: 'RUNNING' })

				},
				onChangeMode,
				onSendMsg: async function () {
					console.log('onSendMsg')
					await hub.led.setColor(hub.Color.RED)
					console.log('Finished')
					//await hub.led.setRGBColor(0, 0, 255)
					await hub.motor.resetZero(hub.PortMap.B)
					console.log('Finished')

					//await hub.motor.setSpeedForTime(hub.PortMap.B, 20, 2000)
					//console.log('Finished')
					//await hub.motor.setSpeedEx(hub.PortMap.C-D)
					//const portId = hub.getPortIdFromName('C_D')
					await hub.motor.rotateDegrees(hub.PortMap.B, 720, 100)
					console.log('Finished')

				},
				onShutdown: async function () {
					await hub.shutdown()
				},
				onInfo: function () {
					const idx = $(this).closest('tr').index()
					const { portId, deviceTypeName } = ctrl.model.internalDevices[idx]
					openInfoPage(portId, deviceTypeName)

				},
				onInfo2: function () {
					const idx = $(this).closest('tr').index()
					const { portId, deviceTypeName } = ctrl.model.externalDevices[idx]
					openInfoPage(portId, deviceTypeName)
				}
			}
		})

	}


});




