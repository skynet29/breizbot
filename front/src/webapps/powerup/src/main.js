// @ts-check


$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'hub', 'breizbot.gamepad', 'breizbot.http', 'breizbot.blocklyinterpretor'],


	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {HUB} hub
	 * @param {Breizbot.Services.Gamepad.Interface} gamepad
	 * @param {Breizbot.Services.Http.Interface} http
	 * @param {Breizbot.Services.BlocklyInterpretor.Interface} blocklyInterpretor
	 * 
	 */
	init: async function (elt, pager, hub, gamepad, http, blocklyInterpretor) {

		//const config = {}

		initBlock()

		let config = {
			code: null,
			mappings: {}
		}

		elt.find('button').addClass('w3-btn w3-blue')

		/**@type {{[UUID: string]: HUB.HubDevice}} */
		const hubDevices = {}
		let UUID = 1

		let gamepadMapping = null
		let gamepadId = ''

		const ctrl = $$.viewController(elt, {
			data: {
				currentConfig: '',
				gamepadConnected: false,
				hubDevices: [],
				hubs: ['HUB1', 'HUB2']

			},
			events: {
				onCode: function () {
					//console.log('onCode')
					pager.pushPage('code', {
						title: 'Code',
						props: {
							hubDevices: Object.values(hubDevices),
							code: config.code,
							gamepadMapping
						},
						onBack: function (value) {
							//console.log('onBack', value)
							config.code = value
						}
					})
				},
				onNewConfig: function () {
					config = {
						code: null,
						mappings: {}
					}
					gamepadMapping = null
					ctrl.setData({ currentConfig: '' })
				},
				onSaveConfig: async function () {
					console.log('onSaveConfig', config)
					if (ctrl.model.currentConfig == '') {
						const currentConfig = await $$.ui.showPrompt({ title: 'Save Config', label: 'Config Name:' })
						//console.log({currentConfig})
						if (currentConfig) {
							await http.post('/add', { name: currentConfig, code: config.code, mappings: config.mappings })
							ctrl.setData({ currentConfig })
						}
					}
					else {
						await http.post('/update', config)
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
							config = data
							ctrl.setData({ currentConfig: data.name })
							gamepadMapping = config.mappings[gamepadId]
							//console.log({gamepadMapping})
						}
					})
				},
				onHubChange: function () {
					const idx = $(this).closest('tr').index()

					const hubId = $(this).getValue()
					//console.log('onHubChange', idx, hubId)

					const hubDevice = hubDevices[ctrl.model.hubDevices[idx].UUID]
					console.log('hubDevice', hubDevice)
					hubDevice.name = hubId
					ctrl.model.hubDevices[idx].hubId = hubId
				},
				onShutDown: function () {
					const idx = $(this).closest('tr').index()
					//console.log('onShutDown', idx)

					/**@type {ActionSrv.HubDesc} */
					const hubDesc = ctrl.model.hubDevices[idx]
					const hubDevice = hubDevices[hubDesc.UUID]
					hubDevice.shutdown()
				},
				onInfo: function () {
					const idx = $(this).closest('tr').index()
					//console.log('onInfo', idx)
					/**@type {ActionSrv.HubDesc} */
					const hubDesc = ctrl.model.hubDevices[idx]
					const hubDevice = hubDevices[hubDesc.UUID]
					console.log('hubDevice', hubDevice)

					pager.pushPage('hubinfo', {
						title: hubDesc.hubId,
						props: {
							hubDevice
						}
					})
				},

				onGamePad: function () {

					console.log('code', config.code)

					pager.pushPage('gamepad', {
						title: 'Gamepad',
						props: {
							mapping: gamepadMapping,
							actions: (config.code != null) ?  blocklyInterpretor.getFunctionNames(config.code) : []
						},
						onReturn: async (mapping) => {
							gamepadMapping = mapping
							console.log('onReturn', gamepadMapping)
							console.log('config', config)
							config.mappings[mapping.id] = gamepadMapping
						}
					})
				},


				onConnect: async function () {
					const hubDevice = await hub.connect()
					const id = UUID++

					hubDevices[id] = hubDevice

					hubDevice.on('error', (data) => {
						console.log(data)
					})

					const nbHubs = ctrl.model.hubDevices.length
					const hubId = `HUB${nbHubs + 1}`
					hubDevice.name = hubId
					ctrl.model.hubDevices.push({ UUID: id, hubId, batteryLevel: 0, address: 'Unknown' })
					ctrl.update()

					hubDevice.on('batteryLevel', (data) => {
						//console.log('batteryLevel', data)
						const hubDesc = ctrl.model.hubDevices.find((e) => e.UUID == id)
						hubDesc.batteryLevel = data.batteryLevel
						ctrl.update()
					})

					hubDevice.on('address', (data) => {
						console.log('address', data)
						const hubDesc = ctrl.model.hubDevices.find((e) => e.UUID == id)
						hubDesc.address = data.address
						ctrl.update()
					})

					await hubDevice.startNotification()

					hubDevice.on('disconnected', () => {
						console.log('disconnected')
						const idx = ctrl.model.hubDevices.findIndex((e) => e.UUID == id)
						ctrl.model.hubDevices.splice(idx, 1)
						ctrl.update()
						delete hubDevices[id]
					})

				}


			}
		})

		function initBlock() {
			Blockly.Blocks['create_tacho_motor'] = {
				init: function () {
					this.appendDummyInput()
						.appendField("TachoMotor")
						.appendField("HUB")
						.appendField(new Blockly.FieldDropdown([["HUB1", "HUB1"], ["HUB2", "HUB2"]]), "HUB")
						.appendField("PORT")
						.appendField(new Blockly.FieldDropdown([["A", "A"], ["B", "B"], ["C", "C"], ["D", "D"]]), "PORT");
					this.setOutput(true, "Motor");
					this.setColour(230);
					this.setTooltip("");
					this.setHelpUrl("");
				}
			};

			Blockly.Blocks['create_motor'] = {
				init: function () {
					this.appendDummyInput()
						.appendField("Motor")
						.appendField("HUB")
						.appendField(new Blockly.FieldDropdown([["HUB1", "HUB1"], ["HUB2", "HUB2"]]), "HUB")
						.appendField("PORT")
						.appendField(new Blockly.FieldDropdown([["A", "A"], ["B", "B"], ["C", "C"], ["D", "D"]]), "PORT");
					this.setOutput(true, "Motor");
					this.setColour(230);
					this.setTooltip("");
					this.setHelpUrl("");
				}
			};

			Blockly.Blocks['create_pair_motor'] = {
				init: function () {
					this.appendDummyInput()
						.appendField("PairMotor")
						.appendField("HUB")
						.appendField(new Blockly.FieldDropdown([["HUB1", "HUB1"], ["HUB2", "HUB2"]]), "HUB")
						.appendField("PORT1")
						.appendField(new Blockly.FieldDropdown([["A", "A"], ["B", "B"], ["C", "C"], ["D", "D"]]), "PORT1")
						.appendField("PORT2")
						.appendField(new Blockly.FieldDropdown([["A", "A"], ["B", "B"], ["C", "C"], ["D", "D"]]), "PORT2")
					this.setOutput(true, "Motor");
					this.setColour(230);
					this.setTooltip("");
					this.setHelpUrl("");
				}
			};

			Blockly.Blocks['pair_motor_speed'] = {
				init: function () {
					this.appendDummyInput()
						.appendField(new Blockly.FieldVariable("item"), "VAR");
					this.appendValueInput("SPEED1")
						.setCheck("Number")
						.appendField("Speed1");
					this.appendValueInput("SPEED2")
						.setCheck("Number")
						.appendField("Speed2");
					this.setInputsInline(true);
					this.setPreviousStatement(true, null);
					this.setNextStatement(true, null);
					this.setColour(230);
					this.setTooltip("");
					this.setHelpUrl("");
				}
			};

			Blockly.Blocks['hub_color'] = {
				init: function () {
					this.appendDummyInput()
						.appendField("HUB")
						.appendField(new Blockly.FieldDropdown([["HUB1", "HUB1"], ["HUB2", "HUB2"]]), "HUB")
						.appendField("Color")
						.appendField(new Blockly.FieldDropdown([["BLACK", "BLACK"], ["PURPLE", "PURPLE"], ["BLUE", "BLUE"], ["LIGHT_BLUE", "LIGHT_BLUE"], ["CYAN", "CYAN"], ["GREEN", "GREEN"], ["PINK", "PINK"], ["YELLOW", "YELLOW"], ["ORANGE", "ORANGE"], ["RED", "RED"], ["WHITE", "WHITE"]]), "COLOR");
					this.setPreviousStatement(true, null);
					this.setNextStatement(true, null);
					this.setColour(230);
					this.setTooltip("");
					this.setHelpUrl("");
				}
			};

			Blockly.Blocks['hub_get_tilt'] = {
				init: function () {
					this.appendDummyInput()
						.appendField("HUB")
						.appendField(new Blockly.FieldDropdown([["HUB1", "HUB1"], ["HUB2", "HUB2"]]), "HUB")
						.appendField("Tilt")
						.appendField(new Blockly.FieldDropdown([["Pitch", "pitch"], ["Roll", "roll"], ["Yaw", "yaw"]]), "TYPE");
					this.setOutput(true, "Number");
					this.setColour(230);
					this.setTooltip("");
					this.setHelpUrl("");
				}
			};


			Blockly.Blocks['hub_get_voltage'] = {
				init: function () {
					this.appendDummyInput()
						.appendField("HUB")
						.appendField(new Blockly.FieldDropdown([["HUB1", "HUB1"], ["HUB2", "HUB2"]]), "HUB")
						.appendField("Voltage (mV)")
					this.setOutput(true, "Number");
					this.setColour(230);
					this.setTooltip("");
					this.setHelpUrl("");
				}
			};


			Blockly.Blocks['motor_speed_time'] = {
				init: function () {
					this.appendDummyInput()
						.appendField(new Blockly.FieldVariable("item"), "VAR");
					this.appendValueInput("SPEED")
						.setCheck("Number")
						.appendField("Speed");
					this.appendValueInput("TIME")
						.setCheck("Number")
						.appendField("Time (ms)");
					this.appendDummyInput()
						.appendField("Wait")
						.appendField(new Blockly.FieldCheckbox("TRUE"), "WAITME");
					this.setPreviousStatement(true, null);
					this.setNextStatement(true, null);
					this.setColour(230);
					this.setTooltip("");
					this.setHelpUrl("");
				}
			};

			Blockly.Blocks['motor_speed_degrees'] = {
				init: function () {
					this.appendDummyInput()
						.appendField(new Blockly.FieldVariable("item"), "VAR");
					this.appendValueInput("SPEED")
						.setCheck("Number")
						.appendField("Speed");
					this.appendValueInput("DEGREES")
						.setCheck("Number")
						.appendField("Degrees");
					this.appendDummyInput()
						.appendField("Wait")
						.appendField(new Blockly.FieldCheckbox("TRUE"), "WAIT");
					this.setPreviousStatement(true, null);
					this.setNextStatement(true, null);
					this.setColour(230);
					this.setTooltip("");
					this.setHelpUrl("");
				}
			};

			Blockly.Blocks['motor_speed_position'] = {
				init: function () {
					this.appendDummyInput()
						.appendField(new Blockly.FieldVariable("item"), "VAR");
					this.appendValueInput("SPEED")
						.setCheck("Number")
						.appendField("Speed");
					this.appendValueInput("ANGLE")
						.setCheck("Number")
						.appendField("Angle");
					this.appendDummyInput()
						.appendField("Wait")
						.appendField(new Blockly.FieldCheckbox("TRUE"), "WAITME");
					this.setPreviousStatement(true, null);
					this.setNextStatement(true, null);
					this.setColour(230);
					this.setTooltip("");
					this.setHelpUrl("");
				}
			};

			Blockly.Blocks['motor_reset_position'] = {
				init: function () {
					this.appendDummyInput()
						.appendField(new Blockly.FieldVariable("item"), "VAR")
						.appendField("reset position")
					this.setPreviousStatement(true, null);
					this.setNextStatement(true, null);
					this.setColour(230);
					this.setTooltip("");
					this.setHelpUrl("");
				}
			};

			Blockly.Blocks['motor_get_speed'] = {
				init: function () {
					this.appendDummyInput()
						.appendField(new Blockly.FieldVariable("item"), "VAR")
						.appendField("Speed");
					this.setOutput(true, null);
					this.setColour(230);
					this.setTooltip("");
					this.setHelpUrl("");
				}
			};

			Blockly.Blocks['motor_get_position'] = {
				init: function () {
					this.appendDummyInput()
						.appendField(new Blockly.FieldVariable("item"), "VAR")
						.appendField("Position");
					this.setOutput(true, null);
					this.setColour(230);
					this.setTooltip("");
					this.setHelpUrl("");
				}
			};

			Blockly.Blocks['motor_get_absoluteposition'] = {
				init: function () {
					this.appendDummyInput()
						.appendField(new Blockly.FieldVariable("item"), "VAR")
						.appendField("Absolute Position");
					this.setOutput(true, null);
					this.setColour(230);
					this.setTooltip("");
					this.setHelpUrl("");
				}
			};

			Blockly.Blocks['sleep'] = {
				init: function () {
					this.appendValueInput("TIME")
						.setCheck("Number")
						.appendField("Sleep (ms)");
					this.setPreviousStatement(true, null);
					this.setNextStatement(true, null);
					this.setColour(230);
					this.setTooltip("");
					this.setHelpUrl("");
				}
			};


			Blockly.Blocks['motor_speed'] = {
				init: function () {
					this.appendValueInput("SPEED")
						.setCheck("Number")
						.appendField(new Blockly.FieldVariable("item"), "VAR")
						.appendField("Speed");
					this.setPreviousStatement(true, null);
					this.setNextStatement(true, null);
					this.setColour(230);
					this.setTooltip("");
					this.setHelpUrl("");
				}
			};

			Blockly.Blocks['motor_power'] = {
				init: function () {
					this.appendValueInput("POWER")
						.setCheck("Number")
						.appendField(new Blockly.FieldVariable("item"), "VAR")
						.appendField("Power");
					this.setPreviousStatement(true, null);
					this.setNextStatement(true, null);
					this.setColour(230);
					this.setTooltip("");
					this.setHelpUrl("");
				}
			};
		}


		gamepad.on('connected', (ev) => {
			console.log('gamepad connnected', ev)
			gamepadId = ev.id
			gamepadMapping = config.mappings[gamepadId]
			console.log({ gamepadMapping })

			ctrl.setData({ gamepadConnected: true })
			gamepad.checkGamePadStatus()

		})

		gamepad.on('disconnected', (ev) => {
			console.log('gamepad disconnected')
			ctrl.setData({ gamepadConnected: false })
			gamepadMapping = null

		})

	}


});




