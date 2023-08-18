// @ts-check

$$.control.registerControl('code', {

	template: { gulp_inject: './code.html' },

	deps: ['breizbot.pager', 'breizbot.blocklyinterpretor', 'hub'],

	props: {
		hubDevices: null,
		code: null
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.BlocklyInterpretor.Interface} blocklyInterpretor
	 * @param {HUB} hub
	 */
	init: function (elt, pager, blocklyInterpretor, hub) {

		/**@type {Array<HUB.HubDevice>} */
		const hubDevices = this.props.hubDevices

		const code = this.props.code

		const demoWorkspace = Blockly.inject('blocklyDiv',
			{
				media: '../lib/blockly/media/',
				toolbox: document.getElementById('toolbox')
				//horizontalLayout: true,
				//toolboxPosition: 'end'
			}
		)

		blocklyInterpretor.setLlogFunction((text) => {
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
			await motor.rotateDegrees(degrees, speed, waitFeedback, hub.BrakingStyle.FLOAT)

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


		blocklyInterpretor.addBlockType('sleep', async (block) => {
			const time = await blocklyInterpretor.evalCode(block.inputs.TIME)
			console.log({ time })
			await $$.util.wait(time)
		})

		if (code != null) {
			const workspace = Blockly.getMainWorkspace();
			Blockly.serialization.workspaces.load(code, workspace);
		}

		this.onBack = function () {
			//console.log('onBack')
			return getCode()
		}

		function getCode() {
			return Blockly.serialization.workspaces.save(Blockly.getMainWorkspace())
		}

		const ctrl = $$.viewController(elt, {
			data: {
				logs: [],
				getLogs: function () {
					return this.logs.join('<br>')
				}
			},
			events: {
				onRun: async function () {
					console.log('onRun')
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




