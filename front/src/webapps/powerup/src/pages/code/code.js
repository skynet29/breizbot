// @ts-check

$$.control.registerControl('code', {

	template: { gulp_inject: './code.html' },

	deps: [
		'breizbot.pager',
		'breizbot.blocklyinterpretor', 
		'hub', 
		'breizbot.gamepad', 
		'breizbot.http',
		'breizbot.files',
		'breizbot.blocklyLexical'
	],

	props: {
		hubDevices: null,
		config: null,

	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.BlocklyInterpretor.Interface} blocklyInterpretor
	 * @param {HUB} hubSrv
	 * @param {Breizbot.Services.Gamepad.Interface} gamepad
	 * @param {Breizbot.Services.Http.Interface} http
	 * @param {Breizbot.Services.Files.Interface} fileSrv
	 * @param {Breizbot.Services.BlocklyLexical.Interface} blocklySrv
	 */
	init: function (elt, pager, blocklyInterpretor, hubSrv, gamepad, http, fileSrv, blocklySrv) {

		console.log('props', this.props)

		const progressDlg = $$.ui.progressDialog('Loading device info')

		/**@type {Array<HUB.HubDevice>} */
		const hubDevices = this.props.hubDevices

		elt.find('button').addClass('w3-btn w3-blue')

		let { config } = this.props

		if (config == null) {
			config = {
				code: null,
				gamepadId: '',
				mappings: {},
				name: ''
			}
		}

		console.log('config', config)

		gamepad.on('connected', (ev) => {
			console.log('gamepad connnected', ev)
			config.gamepadId = ev.id
			config.gamepadMapping = config.mappings[ev.id]
			console.log({ gamepadMapping: config.gamepadMapping })

			ctrl.setData({ gamepadConnected: true })
			gamepad.checkGamePadStatus()

		})

		gamepad.on('disconnected', (ev) => {
			console.log('gamepad disconnected')
			ctrl.setData({ gamepadConnected: false })
			config.gamepadMapping = null
			config.gamepadId = ''

		})

		async function callFunction(name, value) {
			try {
				await blocklyInterpretor.callFunction(name, value)
			}
			catch (e) {
				if (typeof e == 'string') {
					$$.ui.showAlert({ title: 'Error', content: e })
				}
			}
		}

		let gamepadAxesValue = {}

		async function onGamepadAxe(data) {
			//console.log('axe', data)
			if (config.gamepadMapping) {
				const { action } = config.gamepadMapping.axes[data.id]
				let { value } = data
				if (action != 'None') {
					value = Math.sign(value) * 100
					if (value != (gamepadAxesValue[data.id] || 0)) {
						gamepadAxesValue[data.id] = value
						await callFunction(action, value)
					}

				}
			}
		}

		async function onGamepadButtonDown(data) {
			console.log('buttonDown', data.id)
			if (config.gamepadMapping) {
				const { down, downValue } = config.gamepadMapping.buttons[data.id]
				if (down != 'None') {
					await callFunction(down, downValue)
				}
			}
		}

		async function onGamepadButtonUp(data) {
			console.log('buttonDown', data.id)
			if (config.gamepadMapping) {
				const { up, upValue } = config.gamepadMapping.buttons[data.id]
				if (up != 'None') {
					await callFunction(up, upValue)
				}

			}
		}

		function enableCallback(enabled) {
			if (enabled) {
				gamepad.on('axe', onGamepadAxe)
				gamepad.on('buttonDown', onGamepadButtonDown)
				gamepad.on('buttonUp', onGamepadButtonUp)
			}
			else {
				gamepad.off('axe', onGamepadAxe)
				gamepad.off('buttonDown', onGamepadButtonDown)
				gamepad.off('buttonUp', onGamepadButtonUp)
			}
		}

		enableCallback(true)


		this.dispose = function () {
			console.log('dispose')
			enableCallback(false)

		}

		blocklySrv.inject('blocklyDiv', document.getElementById('toolbox'))

		blocklyInterpretor.setLogFunction((text) => {
			ctrl.model.logs.push(text)
			ctrl.update()
			logPanel.scrollToBottom()
		})

		function getHub(block) {
			/**@type {string} */
			const hubName = block.fields.HUB
			const hubDevice = hubDevices.find(e => e.name == hubName)
			if (hubDevice == undefined) {
				throw `Hub ${hubName} is not connected`
			}
			return hubDevice
		}



		blocklyInterpretor.addBlockType('object_getfield', async (block, localVariables) => {

			/**@type {string} */
			const fieldName = block.fields.FIELD

			const object = await blocklyInterpretor.evalCode(block.inputs.OBJECT, localVariables)
			console.log({ fieldName, object })

			return object[fieldName]

		})

		blocklyInterpretor.addBlockType('create_device', async (block, localVariables) => {

			/**@type {number} */
			const port = block.fields.PORT

			const hubDevice = getHub(block)

			const device = hubDevice.getDevice(port)
			console.log({ port, device })
			return device
		})

		blocklyInterpretor.addBlockType('device_getvalue', async (block, localVariables) => {
			/**@type {HUB.DeviceMode} */
			const mode = block.fields.MODE
			/**@type {HUB.Device} */
			const device = await blocklyInterpretor.evalCode(block.inputs.DEVICE, localVariables)
			console.log({ mode, device })
			return device.getValue(mode)

		})

		blocklyInterpretor.addBlockType('wait_until_device', async (block, localVariables) => {

			/**@type {HUB.DeviceMode} */
			const mode = block.fields.MODE

			/**@type {HUB.Device} */
			const device = await blocklyInterpretor.evalCode(block.inputs.DEVICE, localVariables)
			const varName = block.fields.VAR
			console.log({ varName, mode, device })

			await device.waitTestValue(mode, async (value) => {
				console.log('waitTestValue', value)
				localVariables[varName] = value
				/**@type {boolean} */
				const retValue = await blocklyInterpretor.evalCode(block.inputs.TEST, localVariables)
				return retValue
			})
			delete localVariables[varName]
		})

		blocklyInterpretor.addBlockType('device_subscribe', async (block, localVariables) => {

			/**@type {HUB.DeviceMode} */
			const mode = block.fields.MODE

			const deltaInterval = block.fields.DELTA

			/**@type {HUB.Device} */
			const device = await blocklyInterpretor.evalCode(block.inputs.DEVICE, localVariables)
			const varName = block.fields.VAR
			console.log({ varName, mode, deltaInterval, device })

			await device.subscribe(mode, async (value) => {
				localVariables[varName] = value
				await blocklyInterpretor.evalCode(block.inputs.DO, localVariables)
			}, deltaInterval)
			delete localVariables[varName]
		})

		blocklyInterpretor.addBlockType('create_pair_motor', async (block, localVariables) => {

			/**@type {string} */
			const portName1 = block.fields.PORT1

			/**@type {string} */
			const portName2 = block.fields.PORT2

			const hubDevice = getHub(block)
			const motor = await hubDevice.getDblMotor(hubSrv.PortMap[portName1], hubSrv.PortMap[portName2])

			return motor

		})

		blocklyInterpretor.addBlockType('create_tacho_motor', async (block, localVariables) => {

			/**@type {string} */
			const portName = block.fields.PORT

			const hubDevice = getHub(block)
			const motor = hubDevice.getDevice(hubSrv.PortMap[portName])
			if (!hubSrv.isTachoMotor(motor)) {
				throw `Device connected to port '${portName}' is not of a TachoMotor`
			}
			return motor

		})

		blocklyInterpretor.addBlockType('create_motor', async (block, localVariables) => {

			/**@type {string} */
			const portName = block.fields.PORT

			const hubDevice = getHub(block)
			const motor = hubDevice.getDevice(hubSrv.PortMap[portName])
			if (!hubSrv.isMotor(motor)) {
				throw `Device connected to port '${portName}' is not of a Motor`
			}
			return motor

		})

		async function getMotor(block, localVariables) {
			/**@type {HUB.Motor} */
			const motor = await blocklyInterpretor.evalCode(block.inputs.VAR, localVariables)
			if (!hubSrv.isMotor(motor)) {
				throw `input is not of type Motor`
			}
			return motor
		}

		async function getTachoMotor(block, localVariables) {
			/**@type {HUB.TachoMotor} */
			const motor = await blocklyInterpretor.evalCode(block.inputs.VAR, localVariables)

			if (!hubSrv.isTachoMotor(motor)) {
				throw `input is not of type TachoMotor`
			}
			return motor
		}

		async function getPairMotor(block, localVariables) {
			/**@type {HUB.DoubleMotor} */
			const motor = await blocklyInterpretor.evalCode(block.inputs.VAR, localVariables)
			console.log('motor', motor)
			if (!hubSrv.isDoubleMotor(motor)) {
				throw `input is not of type PairMotor`
			}
			return motor
		}

		blocklyInterpretor.addBlockType('color_sensor_brightness', async (block, localVariables) => {

			/**@type {HUB.ColorSensor} */
			const device = await blocklyInterpretor.evalCode(block.inputs.VAR, localVariables)
			if (!hubSrv.isColorSensor(device)) {
				throw `input is not of type ColorSensor`
			}

			const firstSeg = await blocklyInterpretor.evalCode(block.inputs.FIRST_SEG, localVariables)
			const secSeg = await blocklyInterpretor.evalCode(block.inputs.SEC_SEG, localVariables)
			const thirdSeg = await blocklyInterpretor.evalCode(block.inputs.THIRD_SEG, localVariables)

			console.log({ device, firstSeg, secSeg, thirdSeg })
			await device.setBrightness(firstSeg, secSeg, thirdSeg)

		})

		blocklyInterpretor.addBlockType('distance_sensor_brightness', async (block, localVariables) => {

			/**@type {HUB.DistanceSensor} */
			const device = await blocklyInterpretor.evalCode(block.inputs.VAR, localVariables)
			if (!hubSrv.isDistanceSensor(device)) {
				throw `input is not of type DistanceSensor`
			}

			const topLeft = await blocklyInterpretor.evalCode(block.inputs.TOP_LEFT, localVariables)
			const topRight = await blocklyInterpretor.evalCode(block.inputs.TOP_RIGHT, localVariables)
			const bottomLeft = await blocklyInterpretor.evalCode(block.inputs.BOTTOM_LEFT, localVariables)
			const bottomRight = await blocklyInterpretor.evalCode(block.inputs.BOTTOM_RIGHT, localVariables)

			console.log({ device, topLeft, topRight, bottomLeft, bottomRight })
			await device.setBrightness(topLeft, bottomLeft, topRight, bottomRight)

		})


		blocklyInterpretor.addBlockType('motor_power', async (block, localVariables) => {

			/**@type {number} */
			const power = await blocklyInterpretor.evalCode(block.inputs.POWER, localVariables)

			const motor = await getMotor(block, localVariables)

			console.log({ power })
			await motor.setPower(power)

		})

		blocklyInterpretor.addBlockType('motor_speed', async (block,  localVariables) => {

			/**@type {number} */
			const speed = await blocklyInterpretor.evalCode(block.inputs.SPEED, localVariables)

			const motor = await getTachoMotor(block, localVariables)

			console.log({ speed })
			await motor.setSpeed(speed)

		})

		blocklyInterpretor.addBlockType('pair_motor_speed', async (block, localVariables) => {

			/**@type {number} */
			const speed1 = await blocklyInterpretor.evalCode(block.inputs.SPEED1, localVariables)
			/**@type {number} */
			const speed2 = await blocklyInterpretor.evalCode(block.inputs.SPEED2, localVariables)

			const motor = await getPairMotor(block, localVariables)

			console.log({ speed1, speed2, motor })
			await motor.setSpeed(speed1, speed2)

		})


		blocklyInterpretor.addBlockType('motor_speed_time', async (block, localVariables) => {

			/**@type {number} */
			const speed = await blocklyInterpretor.evalCode(block.inputs.SPEED, localVariables)

			const waitEnd = block.fields.WAIT

			/**@type {number} */
			const time = await blocklyInterpretor.evalCode(block.inputs.TIME, localVariables)

			const motor = await getTachoMotor(block, localVariables)

			console.log({ speed, time, waitEnd, motor })
			await motor.setSpeedForTime(speed, time * 1000, waitEnd, hubSrv.BrakingStyle.FLOAT)

		})

		blocklyInterpretor.addBlockType('motor_speed_degrees', async (block,  localVariables) => {

			const motor = await getTachoMotor(block, localVariables)

			/**@type {number} */
			const speed = await blocklyInterpretor.evalCode(block.inputs.SPEED, localVariables)

			const waitEnd = block.fields.WAIT

			/**@type {number} */
			const degrees = await blocklyInterpretor.evalCode(block.inputs.DEGREES, localVariables)

			console.log({ speed, degrees, waitEnd })
			await motor.rotateDegrees(degrees, speed, waitEnd, hubSrv.BrakingStyle.BRAKE)

		})

		blocklyInterpretor.addBlockType('motor_speed_position', async (block,  localVariables) => {

			const motor = await getTachoMotor(block, localVariables)

			/**@type {number} */
			const speed = await blocklyInterpretor.evalCode(block.inputs.SPEED, localVariables)

			const waitEnd = block.fields.WAIT

			/**@type {number} */
			const angle = await blocklyInterpretor.evalCode(block.inputs.ANGLE, localVariables)

			console.log({ speed, angle, waitEnd })
			await motor.gotoAngle(angle, speed, waitEnd, hubSrv.BrakingStyle.BRAKE)

		})

		blocklyInterpretor.addBlockType('motor_speed_abs_position', async (block,  localVariables) => {

			const motor = await getTachoMotor(block, localVariables)

			/**@type {number} */
			const speed = await blocklyInterpretor.evalCode(block.inputs.SPEED, localVariables)

			const waitEnd = block.fields.WAIT

			/**@type {number} */
			const angle = await blocklyInterpretor.evalCode(block.inputs.ANGLE, localVariables)

			console.log({ speed, angle, waitEnd })
			await motor.gotoAbsPosition(angle, speed, waitEnd, hubSrv.BrakingStyle.BRAKE)

		})


		blocklyInterpretor.addBlockType('motor_reset_position', async (block,  localVariables) => {

			const motor = await getTachoMotor(block, localVariables)
			await motor.resetZero()

		})

		blocklyInterpretor.addBlockType('motor_get_speed', async (block,  localVariables) => {

			const motor = await getTachoMotor(block, localVariables)
			return motor.getSpeed()

		})

		blocklyInterpretor.addBlockType('motor_get_position', async (block,  localVariables) => {

			const motor = await getTachoMotor(block, localVariables)
			return motor.getPosition()

		})

		blocklyInterpretor.addBlockType('motor_get_absoluteposition', async (block,  localVariables) => {

			const motor = await getTachoMotor(block, localVariables)
			return motor.getAbsolutePosition()

		})

		blocklyInterpretor.addBlockType('hub_color', async (block,  localVariables) => {

			/**@type {string} */
			const color = block.fields.COLOR

			const hubDevice = getHub(block)
			/**@type {HUB.RgbLed} */
			const led = hubDevice.getDevice(hubSrv.PortMap.HUB_LED)
			await led.setColor(hubSrv.Color[color])

		})

		async function getHubValue(block, portId, mode) {
			const hubDevice = getHub(block)
			const device = hubDevice.getDevice(portId)
			console.log('getHubValue', {portId, mode, device})
			return device.getValue(mode)
		}

		blocklyInterpretor.addBlockType('hub_get_voltage', async (block,  localVariables) => {

			return getHubValue(block, hubSrv.PortMap.VOLTAGE_SENSOR, 0)

		})

		blocklyInterpretor.addBlockType('hub_get_impact_count', async (block,  localVariables) => {

			return getHubValue(block, hubSrv.PortMap.TILT_SENSOR, 1)

		})

		blocklyInterpretor.addBlockType('hub_set_impact_count', async (block,  localVariables) => {

			const count = await blocklyInterpretor.evalCode(block.inputs.VAR, localVariables)
			const hubDevice = getHub(block)
			console.log({count, hubDevice})
			/**@type {HUB.TiltSensor} */
			const device = hubDevice.getDevice(hubSrv.PortMap.TILT_SENSOR)
			return device.setImpactCount(count)

		})

		blocklyInterpretor.addBlockType('hub_get_tilt', async (block,  localVariables) => {

			/**@type {string} */
			const type = block.fields.TYPE

			const value = await getHubValue(block, hubSrv.PortMap.TILT_SENSOR, hubSrv.DeviceMode.TILT_POS)
			return value[type]

		})


		blocklyInterpretor.addBlockType('sleep', async (block,  localVariables) => {
			const time = await blocklyInterpretor.evalCode(block.inputs.TIME, localVariables)
			console.log({ time })
			await $$.util.wait(time * 1000)
		})

		function loadCode(code) {
			const workspace = Blockly.getMainWorkspace();
			Blockly.serialization.workspaces.load(code, workspace);
		}

		if (config.code != null) {
			loadCode(config.code)
		}

		this.onBack = function () {
			//console.log('onBack')
			config.code = getCode()
			return config
		}

		function getCode() {
			return Blockly.serialization.workspaces.save(Blockly.getMainWorkspace())
		}

		async function stop() {
			for (const hub of hubDevices) {
				for (const device of hub.getHubDevices()) {
					if (hubSrv.isMotor(device)) {
						await device.setPower(0)
					}
					await device.unsubscribe()
				}
			}
		}

		const ctrl = $$.viewController(elt, {
			data: {
				currentConfig: config.name,
				gamepadConnected: config.gamepadId != '',
				logs: [],
				getLogs: function () {
					return this.logs.join('<br>')
				}
			},
			events: {
				onExport: async function() {
					let fileName = await $$.ui.showPrompt({title: 'Export', label: 'FileName: '})
					if (fileName) {
						const jsonText = JSON.stringify({code: getCode(), mappings: config.mappings})
						const blob = new Blob([jsonText], { type: 'application/json' })
						fileName += '.pow'
						await fileSrv.saveFile(blob, fileName)
						$.notify('Code exported', 'success')
					}
				},
				onImport: function() {
					pager.pushPage('breizbot.files', {
						title: 'Open File',
						props: {
							filterExtension: 'pow'
						},
						events: {
							fileclick: function (ev, data) {
								pager.popPage(data)
							}
						},
						onReturn: async function (data) {
							//console.log('onReturn', data)
							const url = fileSrv.fileUrl(data.rootDir + data.fileName)
							const resp = await fetch(url)
							const {code, mappings} = await resp.json()
							console.log({code, mappings})
							config.code = code
							config.name = ''
							config.mappings = mappings
							ctrl.setData({ currentConfig: '' })
							config.gamepadMapping = config.mappings[config.gamepadId]
							loadCode(config.code)

						}
					})
				},
				onStop: async function() {
					await stop()
				},
				onGamePad: function () {

					const code = getCode()
					console.log('code', code)
					enableCallback(false)

					pager.pushPage('gamepad', {
						title: 'Gamepad',
						props: {
							mapping: config.gamepadMapping,
							actions: (code != null) ? blocklyInterpretor.getFunctionNames(code) : []
						},
						onReturn: async (mapping) => {
							console.log('onReturn', mapping)

							config.gamepadMapping = mapping
							config.mappings[mapping.id] = mapping
							enableCallback(true)
						},
						onBack: () => {
							enableCallback(true)
						}
					})
				},
				onNewConfig: function () {
					config.mappings = {}
					config.gamepadMapping = null
					config.name = ''
					const workspace = Blockly.getMainWorkspace()
					workspace.clear()

					ctrl.setData({ currentConfig: '' })
				},
				onSaveConfig: async function () {
					console.log('oncodeSaveConfig', config)
					if (ctrl.model.currentConfig == '') {
						const currentConfig = await $$.ui.showPrompt({ title: 'Save Config', label: 'Config Name:' })
						//console.log({currentConfig})
						if (currentConfig) {
							await http.post('/add', { name: currentConfig, code: getCode(), mappings: config.mappings })
							ctrl.setData({ currentConfig })
							config.name = currentConfig
						}
					}
					else {
						await http.post('/update', { name: config.name, code: getCode(), mappings: config.mappings })
						$.notify(`Config '${config.name}' updated`, 'success')
					}

				},
				onConfig: function () {
					//console.log('onConfig')
					pager.pushPage('configCtrl', {
						title: 'Configurations',
						props: {
							currentConfig: ctrl.model.currentConfig
						},
						onReturn: function (data) {
							console.log('newConfig', data)
							config.code = data.code
							config.name = data.name
							config.mappings = data.mappings
							ctrl.setData({ currentConfig: data.name })
							config.gamepadMapping = config.mappings[config.gamepadId]
							loadCode(config.code)
							//console.log({gamepadMapping})
						}
					})
				},
				onRun: async function () {
					console.log('onRun')
					await stop()
					progressDlg.setPercentage(0)
					progressDlg.show()
					let nbAccess = 0
					for (const hub of hubDevices) {
						nbAccess += hub.getHubDevices().length

					}
					console.log({ nbAccess })
					const range = $$.util.mapRange(0, nbAccess, 0, 1)
					let i = 0
					for (const hub of hubDevices) {
						for (const device of hub.getHubDevices()) {
							await device.readInfo()
							progressDlg.setPercentage(range(++i))
						}
					}
					progressDlg.hide()
					const info = getCode()
					gamepadAxesValue = {}
					ctrl.setData({ logs: [] })
					try {
						await blocklyInterpretor.startCode(info)
					}
					catch (e) {
						if (typeof e == 'string') {
							$$.ui.showAlert({ title: 'Error', content: e })
						}
					}

				}
			}
		})

		const logPanel = ctrl.scope.logPanel
	}


});




