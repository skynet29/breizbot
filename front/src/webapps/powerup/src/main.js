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
		let portId = 0
		let speed = 0
		const map = $$.util.mapRange(-1, 1, 100, 0)


		function run() {
			const {maxSpeed} = ctrl.model
			return hub.motor.setSpeedEx(hub.getPortIdFromName('C_D'), -speed1 * maxSpeed, -speed2 * maxSpeed)
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

		gamepad.on('buttonDown', async (data) => {
			console.log('buttonDown', data)
			const { id } = data
			if (id == 0) {
				await onChangeMode()
			}
			else if (id == 5) {
				await hub.motor.setSpeed(hub.PortMap.B, 100)
			}
			else if (id == 6) {
				await hub.motor.setSpeed(hub.PortMap.B, -100)
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
						portId = hub.PortMap.C
						speed = -100
						break
					case 1:
						portId = hub.PortMap.C
						speed = 100
						break
					case 3:
						portId = hub.PortMap.D
						speed = -100
						break
					case 4:
						portId = hub.PortMap.D
						speed = 100
						break

				}
				if (speed != 0) {
					await hub.motor.setSpeed(portId, speed)
				}

			}

		})

		gamepad.on('buttonUp', async (data) => {
			console.log('buttonUp', data)
			const {id} = data
			if (id == 5) {
				await hub.motor.setPower(hub.PortMap.B, 0)
			}
			else if (id == 6) {
				await hub.motor.setPower(hub.PortMap.B, 0)
			}

			else if (speed1 != 0 || speed2 != 0) {
				speed1 = 0
				speed2 = 0
				await hub.motor.setSpeedEx(hub.getPortIdFromName('C_D'), 0, 0)
			}
			else if ([1, 2, 3, 4].includes(id) && speed != 0) {
				speed = 0
				await hub.motor.setPower(portId, 0)
			}
		})


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
			await hub.motor.setSpeedEx(hub.getPortIdFromName('C_D'), 0, 0)
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
				mode: 'UNKNOWN',
				maxSpeed: 100,
				fmtMaxSpeed: function() {
					return this.maxSpeed.toLocaleString().padStart(4)
				}
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

		gamepad.on('connected', (ev) => {
			console.log('gamepad connnected', ev)
			gamepad.checkGamePadStatus()
			if (ev.axes[2] != undefined) {
				setMaxSpeed(ev.axes[2])

			}

		})


	}


});




