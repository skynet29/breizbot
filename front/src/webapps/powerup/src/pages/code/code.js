// @ts-check

$$.control.registerControl('code', {

	template: { gulp_inject: './code.html' },

	deps: ['breizbot.pager', 'breizbot.blocklyinterpretor', 'hub', 'breizbot.gamepad', 'breizbot.http'],

	props: {
		hubDevices: null,
		config: null,

	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.BlocklyInterpretor.Interface} blocklyInterpretor
	 * @param {HUB} hub
	 * @param {Breizbot.Services.Gamepad.Interface} gamepad
	 * @param {Breizbot.Services.Http.Interface} http
	 */
	init: function (elt, pager, blocklyInterpretor, hub, gamepad, http) {

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

		function onGamepadAxe(data) {
			//console.log('axe', data)
			if (config.gamepadMapping) {
				const { action } = config.gamepadMapping.axes[data.id]
				if (action != 'None') {
					callFunction(action, data.value)
				}
			}
		}

		function onGamepadButtonDown(data) {
			console.log('buttonDown', data.id)
			if (config.gamepadMapping) {
				const { down } = config.gamepadMapping.buttons[data.id]
				if (down != 'None') {
					callFunction(down, 1)
				}
			}
		}

		function onGamepadButtonUp(data) {
			console.log('buttonDown', data.id)
			if (config.gamepadMapping) {
				const { up, down } = config.gamepadMapping.buttons[data.id]
				if (up == 'Zero') {
					if (down != 'None') {
						callFunction(down, 0)
					}
				}
				else if (up != 'None') {
					callFunction(up, 1)
				}
			}
		}

		gamepad.on('axe', onGamepadAxe)
		gamepad.on('buttonDown', onGamepadButtonDown)
		gamepad.on('buttonUp', onGamepadButtonUp)

		this.dispose = function () {
			console.log('dispose')
			gamepad.off('axe', onGamepadAxe)
			gamepad.off('buttonDown', onGamepadButtonDown)
			gamepad.off('buttonUp', onGamepadButtonUp)

		}

		const demoWorkspace = Blockly.inject('blocklyDiv',
			{
				media: '../lib/blockly/media/',
				toolbox: document.getElementById('toolbox')
				//horizontalLayout: true,
				//toolboxPosition: 'end'
			}
		)

		blocklyInterpretor.setLogFunction((text) => {
			ctrl.model.logs.push(text)
			ctrl.update()
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



		blocklyInterpretor.addBlockType('object_getfield', async (block) => {

			/**@type {string} */
			const fieldName = block.fields.FIELD

			const object = await blocklyInterpretor.evalCode(block.inputs.OBJECT)
			console.log({ fieldName, object })

			return object[fieldName]

		})

		blocklyInterpretor.addBlockType('create_device', async (block) => {

			/**@type {number} */
			const port = block.fields.PORT
			console.log({ port })

			const hubDevice = getHub(block)
			return hubDevice.getDevice(port)

		})

		blocklyInterpretor.addBlockType('device_getvalue', async (block) => {
			/**@type {HUB.DeviceMode} */
			const mode = block.fields.MODE
			/**@type {HUB.Device} */
			const device = await blocklyInterpretor.evalCode(block.inputs.DEVICE)
			console.log({ mode, device })
			return device.getValue(mode)

		})

		blocklyInterpretor.addBlockType('wait_until_device', async (block) => {

			/**@type {HUB.DeviceMode} */
			const mode = block.fields.MODE

			/**@type {HUB.Device} */
			const device = await blocklyInterpretor.evalCode(block.inputs.DEVICE)
			const varId = block.fields.VAR.id
			console.log({ mode, device })

			await device.waitTestValue(mode, async (value) => {
				console.log('waitTestValue', value)
				blocklyInterpretor.setVarValue(varId, value)
				/**@type {boolean} */
				const retValue = await blocklyInterpretor.evalCode(block.inputs.TEST)
				return retValue
			})


		})

		blocklyInterpretor.addBlockType('create_pair_motor', async (block) => {

			/**@type {string} */
			const portName1 = block.fields.PORT1

			/**@type {string} */
			const portName2 = block.fields.PORT2

			const hubDevice = getHub(block)
			const motor = await hubDevice.getDblMotor(hub.PortMap[portName1], hub.PortMap[portName2])

			return motor

		})

		blocklyInterpretor.addBlockType('create_tacho_motor', async (block) => {

			/**@type {string} */
			const portName = block.fields.PORT

			const hubDevice = getHub(block)
			const motor = hubDevice.getDevice(hub.PortMap[portName])
			if (!hub.isTachoMotor(motor)) {
				throw `Device connected to port '${portName}' is not of a TachoMotor`
			}
			return motor

		})

		blocklyInterpretor.addBlockType('create_motor', async (block) => {

			/**@type {string} */
			const portName = block.fields.PORT

			const hubDevice = getHub(block)
			const motor = hubDevice.getDevice(hub.PortMap[portName])
			if (!hub.isMotor(motor)) {
				throw `Device connected to port '${portName}' is not of a Motor`
			}
			return motor

		})

		function getMotor(block) {
			/**@type {string} */
			const varId = block.fields.VAR.id
			/**@type {HUB.Motor} */
			const motor = blocklyInterpretor.getVarValue(varId)
			if (typeof motor != 'object' || !hub.isMotor(motor)) {
				const varName = blocklyInterpretor.getVarName(varId)
				throw `variable '${varName}' is not of type Motor`
			}
			return motor
		}

		function getTachoMotor(block) {
			/**@type {string} */
			const varId = block.fields.VAR.id
			/**@type {HUB.TachoMotor} */
			const motor = blocklyInterpretor.getVarValue(varId)
			if (typeof motor != 'object' || !hub.isTachoMotor(motor)) {
				const varName = blocklyInterpretor.getVarName(varId)
				throw `variable '${varName}' is not of type TachoMotor`
			}
			return motor
		}

		function getPairMotor(block) {
			/**@type {string} */
			const varId = block.fields.VAR.id
			/**@type {HUB.DoubleMotor} */
			const motor = blocklyInterpretor.getVarValue(varId)
			console.log('motor', motor)
			if (typeof motor != 'object' || !hub.isDoubleMotor(motor)) {
				const varName = blocklyInterpretor.getVarName(varId)
				throw `variable '${varName}' is not of type PairMotor`
			}
			return motor
		}

		blocklyInterpretor.addBlockType('motor_power', async (block) => {

			/**@type {number} */
			const power = await blocklyInterpretor.evalCode(block.inputs.POWER)

			const motor = getMotor(block)

			console.log({ power })
			await motor.setPower(power)

		})

		blocklyInterpretor.addBlockType('motor_speed', async (block) => {

			/**@type {number} */
			const speed = await blocklyInterpretor.evalCode(block.inputs.SPEED)

			const motor = getTachoMotor(block)

			console.log({ speed })
			await motor.setSpeed(speed)

		})

		blocklyInterpretor.addBlockType('pair_motor_speed', async (block) => {

			/**@type {number} */
			const speed1 = await blocklyInterpretor.evalCode(block.inputs.SPEED1)
			/**@type {number} */
			const speed2 = await blocklyInterpretor.evalCode(block.inputs.SPEED2)

			const motor = getPairMotor(block)

			console.log({ speed1, speed2, motor })
			await motor.setSpeed(speed1, speed2)

		})


		blocklyInterpretor.addBlockType('motor_speed_time', async (block) => {

			/**@type {number} */
			const speed = await blocklyInterpretor.evalCode(block.inputs.SPEED)

			const waitFeedback = block.fields.WAIT

			/**@type {number} */
			const time = await blocklyInterpretor.evalCode(block.inputs.TIME)

			const motor = getTachoMotor(block)

			console.log({ speed, time, waitFeedback })
			await motor.setSpeedForTime(speed, time, waitFeedback, hub.BrakingStyle.FLOAT)

		})

		blocklyInterpretor.addBlockType('motor_speed_degrees', async (block) => {

			const motor = getTachoMotor(block)

			/**@type {number} */
			const speed = await blocklyInterpretor.evalCode(block.inputs.SPEED)

			const waitFeedback = block.fields.WAIT

			/**@type {number} */
			const degrees = await blocklyInterpretor.evalCode(block.inputs.DEGREES)

			console.log({ speed, degrees, waitFeedback })
			await motor.rotateDegrees(degrees, speed, waitFeedback, hub.BrakingStyle.BRAKE)

		})

		blocklyInterpretor.addBlockType('motor_speed_position', async (block) => {

			const motor = getTachoMotor(block)

			/**@type {number} */
			const speed = await blocklyInterpretor.evalCode(block.inputs.SPEED)

			const waitFeedback = block.fields.WAIT

			/**@type {number} */
			const angle = await blocklyInterpretor.evalCode(block.inputs.ANGLE)

			console.log({ speed, angle, waitFeedback })
			await motor.gotoAngle(angle, speed, waitFeedback, hub.BrakingStyle.FLOAT)

		})

		blocklyInterpretor.addBlockType('motor_reset_position', async (block) => {

			const motor = getTachoMotor(block)
			await motor.resetZero()

		})

		blocklyInterpretor.addBlockType('motor_get_speed', async (block) => {

			const motor = getTachoMotor(block)
			return motor.getSpeed()

		})

		blocklyInterpretor.addBlockType('motor_get_position', async (block) => {

			const motor = getTachoMotor(block)
			return motor.getPosition()

		})

		blocklyInterpretor.addBlockType('motor_get_absoluteposition', async (block) => {

			const motor = getTachoMotor(block)
			return motor.getAbsolutePosition()

		})

		blocklyInterpretor.addBlockType('hub_color', async (block) => {

			/**@type {string} */
			const color = block.fields.COLOR

			const hubDevice = getHub(block)
			/**@type {HUB.RgbLed} */
			const led = hubDevice.getDevice(hub.PortMap.HUB_LED)
			await led.setColor(hub.Color[color])

		})

		async function getHubValue(block, portId, mode) {
			const hubDevice = getHub(block)
			const device = hubDevice.getDevice(portId)
			return device.getValue(mode)
		}

		blocklyInterpretor.addBlockType('hub_get_voltage', async (block) => {

			return getHubValue(block, hub.PortMap.VOLTAGE_SENSOR, 0)

		})

		blocklyInterpretor.addBlockType('hub_get_tilt', async (block) => {

			/**@type {string} */
			const type = block.fields.TYPE

			const value = await getHubValue(block, hub.PortMap.TILT_SENSOR, hub.DeviceMode.TILT_POS)
			return value[type]

		})

		blocklyInterpretor.addBlockType('wait_until_tilt', async (block) => {

			/**@type {string} */
			const type = block.fields.TYPE
			const operator = block.fields.OP
			const hubDevice = getHub(block)
			const device = hubDevice.getDevice(hub.PortMap.TILT_SENSOR)
			const varValue = await blocklyInterpretor.evalCode(block.inputs.VAR)
			console.log({ varValue, operator, type })

			await device.waitTestValue(hub.DeviceMode.TILT_POS, (value) => {
				return blocklyInterpretor.mathCompare(operator, value[type], varValue)

			})


		})



		blocklyInterpretor.addBlockType('sleep', async (block) => {
			const time = await blocklyInterpretor.evalCode(block.inputs.TIME)
			console.log({ time })
			await $$.util.wait(time)
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
				onGamePad: function () {

					const code = getCode()
					console.log('config', config)

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

	}


});




