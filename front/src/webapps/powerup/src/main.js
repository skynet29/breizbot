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

		Number.prototype.map = function (in_min, in_max, out_min, out_max) {
			return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
		}

		let speed1 = 100
		let speed2 = 100
		let running = false
		
		let calibrateState = 0


		gamepad.on('connected', (ev) => {
			console.log('gamepad connnected', ev)
			gamepad.checkGamePadStatus()

		})

		gamepad.on('buttonUp', async (data) => {
			console.log('buttonUp', data)
			const portId = hub.getPortIdFromName('C_D')
			console.log('portId', portId)
			running = false
			await hub.motor.setPower(portId, 0)

		})

		gamepad.on('buttonDown', async (data) => {
			console.log('buttonDown', data)
			const portId = hub.getPortIdFromName('C_D')
			console.log('portId', portId)
			running = true
			await hub.motor.setSpeedEx(portId, -speed1, -speed2)

		})

		gamepad.on('axe', (data) => {
			//console.log('axe', data)
			const { id, value } = data
			if (id == 0) {
				if (value <= 0) {
					speed1 = 100
					speed2 = Math.ceil(value.map(-1, 0, 0, 100))
				}
				else {
					speed1 = Math.ceil(value.map(0, 1, 100, 0))
					speed2 = 100
				}
				console.log({ speed1, speed2 })
				if (running) {
					const portId = hub.getPortIdFromName('C_D')
					hub.motor.setSpeedEx(portId, -speed1, -speed2)
				}
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

		hub.on('rotate', (data) => {
			console.log('rotate', data)
		})

		hub.on('speed', async (data) => {
			console.log('speed', calibrateState, data)
			const {speed, portId} = data
			if (calibrateState == 1) {
				if (speed > 5) {
					calibrateState = 2
				}
			}
			else if (calibrateState == 2) { 
				if (speed < 6) {
					calibrateState = 3
					await hub.motor.setPower(hub.PortMap.A, 0)
					await $$.util.wait(300)
					await hub.motor.rotateDegrees(hub.PortMap.A, -220, -20)
					await hub.motor.resetZero(hub.PortMap.A)
					await hub.led.setColor(hub.Color.BLUE)
					await hub.subscribe(hub.PortMap.A, hub.DeviceMode.ROTATION)
					ctrl.setData({mode: 'RUNNING'})
				}
			}
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
				onCalibrate: async function() {
					console.log('onCalibrate')
					calibrateState = 1
					ctrl.setData({mode: 'CALIBRATING'})
					await hub.subscribe(hub.PortMap.A, hub.DeviceMode.SPEED)

					await hub.led.setColor(hub.Color.RED)
					await hub.motor.setSpeed(hub.PortMap.A, -20)
					await $$.util.wait(200)
					await hub.motor.setSpeed(hub.PortMap.A, 20)
					
				},
				onChangeMode: async function() {
					const {mode} = ctrl.model
					if (mode == 'RUNNING') {
						await hub.led.setColor(hub.Color.YELLOW)
						await hub.motor.rotateDegrees(hub.PortMap.A, 180, 50)
						await hub.led.setColor(hub.Color.GREEN)
						ctrl.setData({mode: 'MANIPULATOR'})
					}
					else if (mode == 'MANIPULATOR') {
						await hub.led.setColor(hub.Color.YELLOW)
						await hub.motor.rotateDegrees(hub.PortMap.A, 180, -50)
						await hub.led.setColor(hub.Color.BLUE)
						ctrl.setData({mode: 'RUNNING'})
					}
				},
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




