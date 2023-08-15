// @ts-check

$$.control.registerControl('code', {

	template: { gulp_inject: './code.html' },

	deps: ['breizbot.pager', 'breizbot.blocklyinterpretor', 'hub'],

	props: {
		hubDevices: null
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

		blocklyInterpretor.addBlockType('create_motor', async (block) => {
			/**@type {string} */
			const hubName = block.fields.HUB
			/**@type {string} */
			const portName = block.fields.PORT

			const hubDevice = hubDevices.find(e => e.name == hubName)
			if (hubDevice != undefined) {
				const motor = await hubDevice.getTachoMotor(hub.PortMap[portName])
				return motor
			}
			else {
				throw `Hub ${hubName} is not connected`
			}
		})

		blocklyInterpretor.addBlockType('motor_speed_time', async (block) => {
			/**@type {string} */
			const varId = block.fields.VAR.id
			/**@type {HUB.TachoMotor} */
			const motor = blocklyInterpretor.getVarValue(varId)
			if (typeof motor != 'object' || !hub.isTachoMotor(motor)) {
				const varName = blocklyInterpretor.getVarName(varId)
				throw `variable '${varName}' is not of type TachoMotor`
			}
			/**@type {number} */
			const speed = block.fields.SPEED

			const waitFeedback = block.fields.WAIT

			/**@type {number} */
			const time = block.fields.TIME

			console.log({speed, time, waitFeedback})
			await motor.setSpeedForTime(speed, time * 1000, waitFeedback, hub.BrakingStyle.FLOAT)

		})

		blocklyInterpretor.addBlockType('motor_speed_degrees', async (block) => {
			/**@type {string} */
			const varId = block.fields.VAR.id
			/**@type {HUB.TachoMotor} */
			const motor = blocklyInterpretor.getVarValue(varId)

			if (typeof motor != 'object' || !hub.isTachoMotor(motor)) {
				const varName = blocklyInterpretor.getVarName(varId)
				throw `variable '${varName}' is not of type TachoMotor`
			}

			/**@type {number} */
			const speed = block.fields.SPEED

			const waitFeedback = block.fields.WAIT

			/**@type {number} */
			const degrees = block.fields.DEGREES
			
			console.log({speed, degrees, waitFeedback})
			await motor.rotateDegrees(degrees, speed, waitFeedback, hub.BrakingStyle.FLOAT)

		})

		blocklyInterpretor.addBlockType('motor_speed_position', async (block) => {
			/**@type {string} */
			const varId = block.fields.VAR.id
			/**@type {HUB.TachoMotor} */
			const motor = blocklyInterpretor.getVarValue(varId)

			if (typeof motor != 'object' || !hub.isTachoMotor(motor)) {
				const varName = blocklyInterpretor.getVarName(varId)
				throw `variable '${varName}' is not of type TachoMotor`
			}

			/**@type {number} */
			const speed = block.fields.SPEED

			const waitFeedback = block.fields.WAIT

			/**@type {number} */
			const angle = block.fields.ANGLE
			
			console.log({speed, angle, waitFeedback})
			await motor.gotoAngle(angle, speed, waitFeedback, hub.BrakingStyle.FLOAT)

		})

		blocklyInterpretor.addBlockType('motor_reset_position', async (block) => {
			/**@type {string} */
			const varId = block.fields.VAR.id
			/**@type {HUB.TachoMotor} */
			const motor = blocklyInterpretor.getVarValue(varId)

			if (typeof motor != 'object' || !hub.isTachoMotor(motor)) {
				const varName = blocklyInterpretor.getVarName(varId)
				throw `variable '${varName}' is not of type TachoMotor`
			}
			
			await motor.resetZero()

		})

		blocklyInterpretor.addBlockType('hub_color', async (block) => {
			/**@type {string} */
			const hubName = block.fields.HUB
			/**@type {string} */
			const color = block.fields.COLOR


			const hubDevice = hubDevices.find(e => e.name == hubName)
			if (hubDevice != undefined) {
				const led = await hubDevice.getRgbLed(hub.PortMap.HUB_LED)
				await led.setColor(hub.Color[color])
			}
			else {
				throw `Hub ${hubName} is not connected`
			}
		})

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
					const info = Blockly.serialization.workspaces.save(Blockly.getMainWorkspace())
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




