// @ts-check


$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'hub', 'breizbot.gamepad', 'actionSrv', 'breizbot.http'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {HUB} hub
	 * @param {Breizbot.Services.Gamepad.Interface} gamepad
	 * @param {ActionSrv.Interface} actionSrv
	 * @param {Breizbot.Services.Http.Interface} http
	 * 
	 */
	init: async function (elt, pager, hub, gamepad, actionSrv, http) {

		//const config = {}

		initBlock()

		let config = {
			actions: [],
			mappings: {}
		}

		elt.find('button').addClass('w3-btn w3-blue')

		/**@type {{[UUID: string]: HUB.HubDevice}} */
		const hubDevices = {}
		let UUID = 1

		let gamepadMapping = null
		let gamepadId = ''

		actionSrv.on('varChange', (data) => {
			console.log('onVarChange', data)
			const variables = actionSrv.getVariables()
			console.log('variables', variables)
			ctrl.setData({ variables })
		})

		const ctrl = $$.viewController(elt, {
			data: {
				currentConfig: '',
				gamepadConnected: false,
				hubDevices: [],
				hubs: ['HUB1', 'HUB2'],
				variables: [],
				hasVariables: function () {
					return this.variables.length > 0
				}
			},
			events: {
				onCode: function () {
					console.log('onCode')
					pager.pushPage('code', {
						title: 'Code',
						props: {
							hubDevices: Object.values(hubDevices)
						}
					})
				},
				onNewConfig: function () {
					config = {
						actions: [],
						mappings: {}
					}
					gamepadMapping = null
					ctrl.setData({ currentConfig: '' })
					actionSrv.resetVariables()
				},
				onSaveConfig: async function () {
					//console.log('onSaveConfig', config)
					if (ctrl.model.currentConfig == '') {
						const currentConfig = await $$.ui.showPrompt({ title: 'Save Config', label: 'Config Name:' })
						//console.log({currentConfig})
						if (currentConfig) {
							await http.post('/add', { name: currentConfig, actions: config.actions, mappings: config.mappings })
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
							config = data
							ctrl.setData({ currentConfig: data.name })
							gamepadMapping = config.mappings[gamepadId]
							actionSrv.resetVariables()
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
				onActions: function () {

					pager.pushPage('actionsCtrl', {
						title: 'Actions',
						props: {
							actions: config.actions,
							hubDevices: Object.values(hubDevices)
						},
						onReturn: async function (data) {
							console.log('onReturn', data)
							config.actions = data
						}

					})
				},
				onGamePad: function () {
					gamepad.off('buttonUp', onGamepadButtonUp)
					gamepad.off('buttonDown', onGamepadButtonDown)
					gamepad.off('axe', onGamepadAxe)

					pager.pushPage('gamepad', {
						title: 'Gamepad',
						props: {
							mapping: gamepadMapping,
							actions: config.actions
						},
						onBack: initCbk,
						onReturn: async (mapping) => {
							gamepadMapping = mapping
							console.log('onReturn', gamepadMapping)
							console.log('config', config)
							config.mappings[mapping.id] = gamepadMapping
							initCbk()
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

			Blockly.Blocks['motor_speed_time'] = {
				init: function () {
					this.appendDummyInput()
						.appendField(new Blockly.FieldVariable("item"), "VAR")
						.appendField("Speed")
						.appendField(new Blockly.FieldNumber(100, -100, 100, 1), "SPEED")
						.appendField("Time")
						.appendField(new Blockly.FieldNumber(1, 1, Infinity, 1), "TIME")
						.appendField("Wait")
						.appendField(new Blockly.FieldCheckbox("TRUE"), "WAIT");
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
						.appendField(new Blockly.FieldVariable("item"), "VAR")
						.appendField("Speed")
						.appendField(new Blockly.FieldNumber(100, -100, 100, 1), "SPEED")
						.appendField("Degrees")
						.appendField(new Blockly.FieldNumber(1, -Infinity, Infinity, 1), "DEGREES")
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
						.appendField(new Blockly.FieldVariable("item"), "VAR")
						.appendField("Speed")
						.appendField(new Blockly.FieldNumber(100, -100, 100, 1), "SPEED")
						.appendField("Angle")
						.appendField(new Blockly.FieldNumber(1, -180, 180, 1), "ANGLE")
						.appendField("Wait")
						.appendField(new Blockly.FieldCheckbox("TRUE"), "WAIT");
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
		}

		/**
		 * 
		 * @param {string} actionName 
		 * @param {number} factor 
		 */
		function execAction(actionName, factor) {

			actionSrv.execAction(Object.values(hubDevices), config.actions, actionName, factor)

		}

		function onGamepadButtonDown(data) {
			//console.log('onGamepadButtonDown', data)
			if (gamepadMapping) {
				const { down } = gamepadMapping.buttons[data.id]
				if (down != 'None') {
					execAction(down, 1)
				}
			}
		}

		function onGamepadButtonUp(data) {
			//console.log('onGamepadButtonUp', data)

			if (gamepadMapping) {
				const { up, down } = gamepadMapping.buttons[data.id]
				if (up == 'Zero') {
					if (down != 'None') {
						execAction(down, 0)
					}
				}
				else if (up != 'None') {
					execAction(up, 1)
				}
			}
		}

		function onGamepadAxe(data) {
			//console.log('onGamepadAxe', data)
			if (gamepadMapping) {
				const { action } = gamepadMapping.axes[data.id]
				if (action != 'None') {
					execAction(action, data.value)
				}
			}
		}


		function initCbk() {
			console.log('initCbk')
			gamepad.on('buttonUp', onGamepadButtonUp)
			gamepad.on('buttonDown', onGamepadButtonDown)
			gamepad.on('axe', onGamepadAxe)

		}



		gamepad.on('connected', (ev) => {
			console.log('gamepad connnected', ev)
			gamepadId = ev.id
			gamepadMapping = config.mappings[gamepadId]
			console.log({ gamepadMapping })

			ctrl.setData({ gamepadConnected: true })
			gamepad.checkGamePadStatus()
			initCbk()


		})

		gamepad.on('disconnected', (ev) => {
			console.log('gamepad disconnected')
			ctrl.setData({ gamepadConnected: false })
			gamepadMapping = null

		})

	}


});




