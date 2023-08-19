//@ts-check
$$.service.registerService('actionSrv', {

    deps: ['hub'],

    /**
     * 
     * @param {*} config 
     * @param {HUB} hub 
     * @returns 
     */
    init: function (config, hub) {

        let variables = {}
        const events = new EventEmitter2()

        /**
         * 
         * @param {Array<HUB.HubDevice>} hubDevices
         * @param {ActionSrv.StepDesc} stepDesc 
         * @param {number} factor
         */
        async function execStep(hubDevices, stepDesc, factor) {
            if (stepDesc.type == 'SLEEP') {
                await $$.util.wait(stepDesc.time)
                return
            }

            const hubDevice = hubDevices.find(e => e.name == stepDesc.hub)
            if (hubDevice) {
                //console.log({hubDesc})

                if (stepDesc.type == 'POWER') {
                    const motor = await hubDevice.getMotor(hub.PortMap[stepDesc.port])
                    await motor.setPower(stepDesc.power * factor)
                }
                else if (stepDesc.type == 'BRIGHTNESS') {
                    const led = await hubDevice.getLed(hub.PortMap[stepDesc.port])
                    await led.setBrightness(stepDesc.brightness * factor)
                }
                else if (stepDesc.type == 'SPEED') {
                    const motor = await hubDevice.getMotor(hub.PortMap[stepDesc.port])
                    await motor.setSpeed(stepDesc.speed * factor)
                }
                else if (stepDesc.type == 'SPEEDTIME') {
                    const motor = await hubDevice.getMotor(hub.PortMap[stepDesc.port])
                    await motor.setSpeedForTime(stepDesc.speed, stepDesc.time, stepDesc.waitFeedback, stepDesc.brakeStyle)
                }               
                else if (stepDesc.type == 'ROTATE') {
                    const motor = await hubDevice.getMotor(hub.PortMap[stepDesc.port])
                    await motor.rotateDegrees(stepDesc.angle * factor, stepDesc.speed, stepDesc.waitFeedback)
                }
                else if (stepDesc.type == 'POSITION') {
                    const motor = await hubDevice.getMotor(hub.PortMap[stepDesc.port])
                    await motor.gotoAngle(stepDesc.angle * factor, stepDesc.speed, stepDesc.waitFeedback)
                }
                else if (stepDesc.type == 'ZERO') {
                    const motor = await hubDevice.getMotor(hub.PortMap[stepDesc.port])
                    await motor.resetZero()
                }
                else if (stepDesc.type == 'COLOR') {
                    const led = await hubDevice.getRgbLed(hub.PortMap.HUB_LED)
                    await led.setColor(stepDesc.color)
                }
                else if (stepDesc.type == 'RGB') {
                    const led = await hubDevice.getRgbLed(hub.PortMap.HUB_LED)
                    await led.setRGBColor(stepDesc.red, stepDesc.green, stepDesc.blue)
                }
                else if (stepDesc.type == 'CALIBRATE') {
                    const motor = await hubDevice.getMotor(hub.PortMap[stepDesc.port])
                    await motor.calibrate()
                }
                else if (stepDesc.type == 'DBLSPEED') {
                    const portId1 = hub.PortMap[stepDesc.port1]
                    const portId2 = hub.PortMap[stepDesc.port2]

                    const motor = await hubDevice.getDblMotor(portId1, portId2)
                    await motor.setSpeed(stepDesc.speed1 *factor, stepDesc.speed2 * factor)
                }
                else if (stepDesc.type == 'DBLSPEEDTIME') {
                    const portId1 = hub.PortMap[stepDesc.port1]
                    const portId2 = hub.PortMap[stepDesc.port2]

                    const motor = await hubDevice.getDblMotor(portId1, portId2)
                    await motor.setSpeedForTime(stepDesc.speed1, stepDesc.speed2, 
                        stepDesc.time, stepDesc.waitFeedback, stepDesc.brakeStyle)
                }
                else if (stepDesc.type == 'DBLROTATE') {
                    const portId1 = hub.PortMap[stepDesc.port1]
                    const portId2 = hub.PortMap[stepDesc.port2]

                    const motor = await hubDevice.getDblMotor(portId1, portId2)
                    await motor.rotateDegrees(stepDesc.angle, stepDesc.speed1 *factor, stepDesc.speed2 * factor, 
                        stepDesc.waitFeedback, stepDesc.brakeStyle)
                }
                else if (stepDesc.type == 'DBLPOSITION') {
                    const portId1 = hub.PortMap[stepDesc.port1]
                    const portId2 = hub.PortMap[stepDesc.port2]

                    const motor = await hubDevice.getDblMotor(portId1, portId2)
                    await motor.gotoAngle(stepDesc.angle1, stepDesc.angle2, stepDesc.speed * factor,
                        stepDesc.waitFeedback, stepDesc.brakeStyle)
                }
                else {
                    return `type ${stepDesc.type} not implemented`
                }
            }
            else {
                return `Hub ${stepDesc.hub} is not connected`
            }
            return null
        }
        /**
         * 
         * @param {Array<HUB.HubDevice>} hubDevices
         * @param {Array<ActionSrv.ActionDesc>} actions 
         * @param {string} actionName 
         * @param {number} factor
         */
        async function execAction(hubDevices, actions, actionName, factor) {
            console.log('execAction', hubDevices, actionName, factor)
            const actionDesc = actions.find(e => e.name == actionName)
            let {steps} = actionDesc
            if (!Array.isArray(steps)) {
                steps = [actionDesc]
            }

            for(const step of steps) {
                if (step.type == 'SETVAR') {
                    console.log('SETVAR', step)
                    const {varName, varValue} = step
                    variables[varName] = varValue
                    //console.log('varChange', {varName, varValue})
                    events.emit('varChange', {varName, varValue})
                }
                else if (step.type == 'TESTVAR') {
                    const {varName} = step
                    const varValue = variables[varName]
                    //console.log('Variable', {varName, varValue})
                    if (varValue == step.varValue && step.eqAction != 'None') {
                        execAction(hubDevices, actions, step.eqAction, 1)
                    }
                    if (varValue != step.varValue && step.neqAction != 'None') {
                        execAction(hubDevices, actions, step.neqAction, 1)
                    }
                }
                else {
                    const ret = await execStep(hubDevices, step, factor)
                    if (ret != null) {
                        $.notify(ret, 'error')
                        break
                    }
                }

            }

            //console.log({actionDesc})
 


        }

        function getVariables() {
            return Object.entries(variables).map(([name, value]) => {
                return {name, value}
            })
        }

        function resetVariables() {
            variables = {}
            events.emit('varChange')
        }

        return {
            execAction,
            on: events.on.bind(events),
            getVariables,
            resetVariables
        }

    }
});

// @ts-check


$$.control.registerControl('rootPage', {

	template: "<div class=\"toolbar\">\n    <div class=\"left\">\n        \n        <button bn-event=\"click: onNewConfig\" bn-icon=\"fa fa-file\" title=\"Reset Config\"></button>\n\n        <button bn-event=\"click: onConfig\" bn-icon=\"fa fa-folder-open\" title=\"Open Config\"></button>\n\n        <button bn-event=\"click: onSaveConfig\" bn-icon=\"fa fa-save\" title=\"Save current config\"></button>\n\n        <div bn-show=\"currentConfig\">\n            <label>Current Config:</label>\n            <span bn-text=\"currentConfig\"></span>\n        </div>\n\n    </div>\n\n    <div></div>\n</div>\n\n<div class=\"toolbar\">\n\n    <div class=\"left\">\n        <button bn-event=\"click: onConnect\">Connect to HUB</button>\n        \n        <button bn-event=\"click: onActions\">Actions</button>\n\n        <button bn-event=\"click: onGamePad\" bn-show=\"gamepadConnected\">Gamepad</button>\n\n        <button bn-event=\"click: onCode\">Code</button>\n\n\n    </div>\n</div>\n\n<div bn-show=\"hasVariables\" class=\"variables\">\n    <table class=\"w3-table-all\">\n        <thead>\n            <th>Variable Name</th>\n            <th>Value</th>\n        </thead>\n        <tbody bn-each=\"variables\">\n            <tr>\n                <td bn-text=\"$scope.$i.name\"></td>\n                <td bn-text=\"$scope.$i.value\"></td>\n            </tr>\n        </tbody>\n    </table>\n</div>\n\n<div>\n    <table class=\"w3-table-all\">\n        <thead>\n            <tr>\n                <th>Hub</th>\n                <th>Actions</th>\n                <th>Battery Level</th>\n                <th>Address</th>\n            </tr>\n        </thead>\n        <tbody bn-each=\"hubDevices\" bn-event=\"click.btnShutdown: onShutDown, click.btnInfo: onInfo, comboboxchange.combo: onHubChange\">\n            <tr>\n                <td>\n                    <div bn-control=\"brainjs.combobox\" bn-data=\"{items: hubs}\" bn-val=\"$scope.$i.hubId\" class=\"combo\"></div>\n                </td>\n                <td>\n                    <button class=\"btnShutdown\">Shutdown</button>\n                    <button class=\"btnInfo\">Info</button>\n                </td>\n                <td bn-text=\"$scope.$i.batteryLevel\"></td>\n                <td bn-text=\"$scope.$i.address\"></td>\n            </tr>\n        </tbody>\n    </table>\n\n</div>",

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

		let code = null

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
					//console.log('onCode')
					pager.pushPage('code', {
						title: 'Code',
						props: {
							hubDevices: Object.values(hubDevices),
							code
						},
						onBack: function (value) {
							//console.log('onBack', value)
							code = value
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





// @ts-check

$$.control.registerControl('stepCtrl', {

    template: "<form bn-event=\"submit: onSubmit\">\n    <div class=\"group\">\n\n        <label>Type</label>\n        <div bn-control=\"brainjs.combobox\" bn-data=\"{items: actionTypes}\" name=\"type\" bn-update=\"comboboxchange\"\n            bn-val=\"type\"></div>\n    </div>\n    \n    <div bn-if=\"isSleep\">\n    \n        <div class=\"group\">\n            <label>Time (ms)</label>\n            <input type=\"number\" required name=\"time\" min=\"0\">\n        </div>\n    \n    </div>\n    \n    \n    <div bn-if=\"isSpeed\">\n        <div class=\"group\">\n            <label>HUB</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: hubs}\" name=\"hub\"  bn-val=\"hub\">\n            </div>\n        </div>\n        <div class=\"group\">\n            <label>Port</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: ports}\" name=\"port\" bn-val=\"port\"></div>\n        </div>\n    \n        <div class=\"group\">\n            <label>Speed</label>\n            <input type=\"number\" required name=\"speed\" min=\"-100\" max=\"100\">\n        </div>\n    </div>\n    \n    <div bn-if=\"isSpeedtime\">\n        <div class=\"group\">\n            <label>HUB</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: hubs}\" name=\"hub\"  bn-val=\"hub\">\n            </div>\n        </div>\n        <div class=\"group\">\n            <label>Port</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: ports}\" name=\"port\" bn-val=\"port\"></div>\n        </div>\n    \n        <div class=\"group\">\n            <label>Speed</label>\n            <input type=\"number\" required name=\"speed\" min=\"-100\" max=\"100\">\n        </div>\n        <div class=\"group\">\n            <label>Time (ms)</label>\n            <input type=\"number\" required name=\"time\" min=\"0\">\n        </div>\n        <div class=\"group\">\n            <label>Wait End</label>\n            <input type=\"checkbox\" name=\"waitFeedback\">\n        </div>\n        <div class=\"group\">\n            <label>Braking Style</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: brakeStyles}\" name=\"brakeStyle\" bn-val=\"brakeStyle\"></div>\n        </div>\n    </div>\n    \n    <div bn-if=\"isDblspeedtime\">\n        <div class=\"group\">\n            <label>HUB</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: hubs}\" name=\"hub\"  bn-val=\"hub\">\n            </div>\n        </div>\n        <div class=\"group\">\n            <label>Port1</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: ports}\" name=\"port1\" bn-val=\"port1\"></div>\n        </div>\n    \n        <div class=\"group\">\n            <label>Port2</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: ports}\" name=\"port2\" bn-val=\"port2\"></div>\n        </div>\n    \n        <div class=\"group\">\n            <label>Speed1</label>\n            <input type=\"number\" required name=\"speed1\" min=\"-100\" max=\"100\">\n        </div>\n    \n        <div class=\"group\">\n            <label>Speed2</label>\n            <input type=\"number\" required name=\"speed2\" min=\"-100\" max=\"100\">\n        </div>\n    \n        <div class=\"group\">\n            <label>Time (ms)</label>\n            <input type=\"number\" required name=\"time\" min=\"0\">\n        </div>\n        <div class=\"group\">\n            <label>Wait End</label>\n            <input type=\"checkbox\" name=\"waitFeedback\">\n        </div>\n        <div class=\"group\">\n            <label>Braking Style</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: brakeStyles}\" name=\"brakeStyle\" bn-val=\"brakeStyle\"></div>\n        </div>\n    </div>\n    \n    <div bn-if=\"isPower\">\n        <div class=\"group\">\n            <label>HUB</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: hubs}\" name=\"hub\"  bn-val=\"hub\">\n            </div>\n        </div>\n        <div class=\"group\">\n            <label>Port</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: ports}\" name=\"port\" bn-val=\"port\"></div>\n        </div>\n    \n        <div class=\"group\">\n            <label>Power</label>\n            <input type=\"number\" required name=\"power\" min=\"-100\" max=\"100\">\n        </div>\n    </div>\n    \n    <div bn-if=\"isRotate\">\n        <div class=\"group\">\n            <label>HUB</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: hubs}\" name=\"hub\"  bn-val=\"hub\">\n            </div>\n        </div>\n        <div class=\"group\">\n            <label>Port</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: ports}\" name=\"port\" bn-val=\"port\"></div>\n        </div>\n    \n        <div class=\"group\">\n            <label>Speed</label>\n            <input type=\"number\" required name=\"speed\" min=\"-100\" max=\"100\">\n        </div>\n    \n        <div class=\"group\">\n            <label>Angle (°)</label>\n            <input type=\"number\" required name=\"angle\" step=\"1\">\n        </div>\n    \n        <div class=\"group\">\n            <label>Wait End</label>\n            <input type=\"checkbox\" name=\"waitFeedback\">\n        </div>\n    \n        <div class=\"group\">\n            <label>Braking Style</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: brakeStyles}\" name=\"brakeStyle\" bn-val=\"brakeStyle\"></div>\n        </div>\n    </div>\n    \n    <div bn-if=\"isDblrotate\">\n        <div class=\"group\">\n            <label>HUB</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: hubs}\" name=\"hub\"  bn-val=\"hub\">\n            </div>\n        </div>\n        <div class=\"group\">\n            <label>Port1</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: ports}\" name=\"port1\" bn-val=\"port1\"></div>\n        </div>\n    \n        <div class=\"group\">\n            <label>Port2</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: ports}\" name=\"port2\" bn-val=\"port2\"></div>\n        </div>\n    \n        <div class=\"group\">\n            <label>Speed1</label>\n            <input type=\"number\" required name=\"speed1\" min=\"-100\" max=\"100\">\n        </div>\n    \n        <div class=\"group\">\n            <label>Speed2</label>\n            <input type=\"number\" required name=\"speed2\" min=\"-100\" max=\"100\">\n        </div>\n    \n        <div class=\"group\">\n            <label>Angle (°)</label>\n            <input type=\"number\" required name=\"angle\" step=\"1\">\n        </div>\n    \n        <div class=\"group\">\n            <label>Wait End</label>\n            <input type=\"checkbox\" name=\"waitFeedback\">\n        </div>\n    \n        <div class=\"group\">\n            <label>Braking Style</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: brakeStyles}\" name=\"brakeStyle\" bn-val=\"brakeStyle\"></div>\n        </div>\n    </div>\n    \n    <div bn-if=\"isPosition\">\n        <div class=\"group\">\n            <label>HUB</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: hubs}\" name=\"hub\"  bn-val=\"hub\">\n            </div>\n        </div>\n        <div class=\"group\">\n            <label>Port</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: ports}\" name=\"port\" bn-val=\"port\"></div>\n        </div>\n    \n        <div class=\"group\">\n            <label>Speed</label>\n            <input type=\"number\" required name=\"speed\" min=\"-100\" max=\"100\">\n        </div>\n    \n        <div class=\"group\">\n            <label>Angle (°)</label>\n            <input type=\"number\" required name=\"angle\" step=\"1\">\n        </div>\n    \n        <div class=\"group\">\n            <label>Wait End</label>\n            <input type=\"checkbox\" name=\"waitFeedback\">\n        </div>\n    \n        <div class=\"group\">\n            <label>Braking Style</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: brakeStyles}\" name=\"brakeStyle\" bn-val=\"brakeStyle\"></div>\n        </div>\n    </div>\n    \n    <div bn-if=\"isDblposition\">\n        <div class=\"group\">\n            <label>HUB</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: hubs}\" name=\"hub\"  bn-val=\"hub\">\n            </div>\n        </div>\n        <div class=\"group\">\n            <label>Port1</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: ports}\" name=\"port1\" bn-val=\"port1\"></div>\n        </div>\n    \n        <div class=\"group\">\n            <label>Port2</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: ports}\" name=\"port2\" bn-val=\"port2\"></div>\n        </div>\n    \n        <div class=\"group\">\n            <label>Speed</label>\n            <input type=\"number\" required name=\"speed\" min=\"-100\" max=\"100\">\n        </div>\n    \n        <div class=\"group\">\n            <label>Angle1 (°)</label>\n            <input type=\"number\" required name=\"angle1\" step=\"1\">\n        </div>\n    \n        <div class=\"group\">\n            <label>Angle2 (°)</label>\n            <input type=\"number\" required name=\"angle2\" step=\"1\">\n        </div>\n    \n        <div class=\"group\">\n            <label>Wait End</label>\n            <input type=\"checkbox\" name=\"waitFeedback\">\n        </div>\n    \n        <div class=\"group\">\n            <label>Braking Style</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: brakeStyles}\" name=\"brakeStyle\" bn-val=\"brakeStyle\"></div>\n        </div>\n    </div>\n    \n    <div bn-if=\"isCalibrate\">\n        <div class=\"group\">\n            <label>HUB</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: hubs}\" name=\"hub\"  bn-val=\"hub\">\n            </div>\n        </div>\n        <div class=\"group\">\n            <label>Port</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: ports}\" name=\"port\" bn-val=\"port\"></div>\n        </div>\n    \n    </div>\n    \n    \n    <div bn-if=\"isZero\">\n        <div class=\"group\">\n            <label>HUB</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: hubs}\" name=\"hub\"  bn-val=\"hub\">\n            </div>\n        </div>\n        <div class=\"group\">\n            <label>Port</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: ports}\" name=\"port\" bn-val=\"port\"></div>\n        </div>\n    \n    </div>\n    \n    <div bn-if=\"isColor\">\n        <div class=\"group\">\n            <label>HUB</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: hubs}\" name=\"hub\"  bn-val=\"hub\">\n            </div>\n        </div>\n        <div class=\"group\">\n            <label>Color</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: ledColors}\" name=\"color\"></div>\n        </div>\n    \n    </div>\n    \n    <div bn-if=\"isRgb\">\n        <div class=\"group\">\n            <label>HUB</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: hubs}\" name=\"hub\"  bn-val=\"hub\">\n            </div>\n        </div>\n        <div class=\"group\">\n            <label>Red</label>\n            <input type=\"number\" min=\"0\" max=\"255\" name=\"red\">\n        </div>\n        <div class=\"group\">\n            <label>Green</label>\n            <input type=\"number\" min=\"0\" max=\"255\" name=\"green\">\n        </div>\n        <div class=\"group\">\n            <label>Blue</label>\n            <input type=\"number\" min=\"0\" max=\"255\" name=\"blue\">\n        </div>\n    </div>\n\n    <div bn-if=\"isBrightness\">\n        <div class=\"group\">\n            <label>HUB</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: hubs}\" name=\"hub\"  bn-val=\"hub\">\n            </div>\n        </div>\n        <div class=\"group\">\n            <label>Port</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: ports}\" name=\"port\" bn-val=\"port\"></div>\n        </div>  \n        <div class=\"group\">\n            <label>Brightness</label>\n            <input type=\"number\" min=\"0\" name=\"brightness\">\n        </div>\n\n    </div>\n    \n    <div bn-if=\"isDblspeed\">\n        <div class=\"group\">\n            <label>HUB</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: hubs}\" name=\"hub\"  bn-val=\"hub\">\n            </div>\n        </div>\n        <div class=\"group\">\n            <label>Port1</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: ports}\" name=\"port1\" bn-val=\"port1\"></div>\n        </div>\n    \n        <div class=\"group\">\n            <label>Port2</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: ports}\" name=\"port2\" bn-val=\"port2\"></div>\n        </div>\n    \n        <div class=\"group\">\n            <label>Speed1</label>\n            <input type=\"number\" required name=\"speed1\" min=\"-100\" max=\"100\">\n        </div>\n    \n        <div class=\"group\">\n            <label>Speed2</label>\n            <input type=\"number\" required name=\"speed2\" min=\"-100\" max=\"100\">\n        </div>\n    </div>\n\n    <div bn-if=\"isTestvar\">\n        <div class=\"group\">\n            <label>Variable Name</label>\n            <input type=\"text\" name=\"varName\" required>\n        </div>\n        <div class=\"group\">\n            <label>If variable =</label>\n            <input type=\"text\" name=\"varValue\" required>\n        </div>\n        <div class=\"group\">\n            <label>Action</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: availableActions}\" name=\"eqAction\" bn-val=\"eqAction\"></div>\n        </div>\n        <div class=\"group\">\n            <label>Else Action</label>\n            <div bn-control=\"brainjs.combobox\" bn-data=\"{items: availableActions}\" name=\"neqAction\" bn-val=\"neqAction\"></div>\n        </div>\n    </div>\n\n    <div bn-if=\"isSetvar\">\n        <div class=\"group\">\n            <label>Variable Name</label>\n            <input type=\"text\" name=\"varName\" required>\n        </div>\n        <div class=\"group\">\n            <label>Value</label>\n            <input type=\"text\" name=\"varValue\" required>\n        </div>\n    </div>\n</form>",

    deps: ['breizbot.pager', 'hub'],

    props: {
        data: null
    },

    /**
     * 
     * @param {Breizbot.Services.Pager.Interface} pager 
     * @param {HUB} hub
     */
    init: function (elt, pager, hub) {

        //console.log('stepCtrl props', this.props)
        let { data, availableActions } = this.props

        data = data || {}

        availableActions.unshift('None')

        const actionTypes = [
            'SLEEP',
            'POWER',
            'SPEED',
            'DBLSPEED',
            'SPEEDTIME',
            'DBLSPEEDTIME',
            'ROTATE',
            'DBLROTATE',
            'POSITION',
            'DBLPOSITION',
            'CALIBRATE',
            'ZERO',
            'COLOR',
            'RGB',
            'BRIGHTNESS',
            'TESTVAR',
            'SETVAR'
        ]
        const ports = 'ABCD'.split('')
        const hubs = ['HUB1', 'HUB2']
        const ledColors = Object.entries(hub.Color).map(([label, value]) => Object.assign({label, value}))
        //console.log(ledColors)

        const brakeStyles = Object.entries(hub.BrakingStyle).map(([label, value]) => Object.assign({label, value}))
        //console.log(brakeStyles)

        const dataInfo = {
            port: data.port || 'A',
            port1: data.port1 || 'A',
            port2: data.port2 || 'B',
            type: data.type || 'SPEED',
            hub: data.hub || 'HUB1',
            brakeStyle: data.brakeStyle || hub.BrakingStyle.BRAKE,
            actionTypes,
            brakeStyles,
            ledColors,
            ports,
            states: ['STATE1', 'STATE2', 'STATE3'],
            hubs,
            availableActions,
            eqAction: data.eqAction || 'None',
            neqAction: data.neqAction || 'None',
            state: data.state || 'STATE1'
        }
        for(const a of actionTypes) {
            const name = a.charAt(0) + a.slice(1).toLowerCase()
            dataInfo['is' + name] = function() {
                return this.type == a
            }
        }
        const ctrl = $$.viewController(elt, {
            data: dataInfo,
            events: {
                onSubmit: function(ev) {
                    console.log('onSubmit')
                    ev.preventDefault()
                }
            }
        })

        elt.setFormData(data)

    }

});





// @ts-check

$$.control.registerControl('actionCtrl', {

    template: "<div class=\"scrollPanel\">\n\n    <div bn-each=\"steps\" bn-index=\"idx\" \n        bn-event=\"click.removeBtn: onRemoveStep, click.upBtn: onMoveUp, click.downBtn: onMoveDown\">\n\n        <div class=\"stepItem\">\n            <div class=\"menubar\" >\n                <div>\n                    <button bn-icon=\"fas fa-level-up-alt\" class=\"upBtn\" title=\"MoveUp\"\n                        bn-show=\"canMoveUp\"></button>\n                    <button bn-icon=\"fas fa-level-down-alt\" class=\"downBtn\" title=\"MoveDown\"\n                        bn-show=\"canMoveDown\"></button>\n                    <button bn-icon=\"fa fa-trash-alt\" class=\"removeBtn\" title=\"Remove\" \n                    bn-show=\"showMenubar\"></button>\n\n                </div>\n            </div>\n            <div bn-control=\"stepCtrl\" bn-data=\"{data: $scope.$i, availableActions}\"></div>\n        </div>\n\n    </div>\n</div>",

    deps: ['breizbot.pager'],

    props: {
        steps: [],
        availableActions: []
    },

    /**
     * 
     * @param {Breizbot.Services.Pager.Interface} pager 
     */
    init: function (elt, pager) {

        console.log('actionCtrl props', this.props)
        const { steps, availableActions } = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                steps,
                availableActions,
                showMenubar: function (scope) {
                    return scope.idx > 0
                },
                canMoveUp: function (scope) {
                    return scope.idx > 0
                },
                canMoveDown: function (scope) {
                    return scope.idx < this.steps.length - 1
                }
            },
            events: {
                onMoveUp: function () {
                    //console.log('onMoveUp')
                    const idx = $(this).closest('.stepItem').index()
                    ctrl.model.steps = getSteps()
                    const temp = ctrl.model.steps[idx]
                    ctrl.model.steps[idx] = ctrl.model.steps[idx - 1]
                    ctrl.model.steps[idx - 1] = temp
                    ctrl.update()
                },
                onMoveDown: function () {
                    //console.log('onMoveDown')
                    const idx = $(this).closest('.stepItem').index()
                    ctrl.model.steps = getSteps()
                    const temp = ctrl.model.steps[idx]
                    ctrl.model.steps[idx] = ctrl.model.steps[idx + 1]
                    ctrl.model.steps[idx + 1] = temp
                    ctrl.update()
                },
                onRemoveStep: function () {
                    const idx = $(this).closest('.stepItem').index()
                    console.log('onRemoveStep', idx)
                    ctrl.model.steps.splice(idx, 1)
                    ctrl.update()
                }
            }
        })

        function getSteps() {
            const steps = []
            elt.find('form').each(function () {
                steps.push($(this).getFormData())
            })
            //console.log('steps', steps)
            return steps
        }

        this.getButtons = function () {
            return {
                addStep: {
                    title: 'Add Step',
                    icon: 'fa fa-plus',
                    onClick: function () {
                        //console.log('Add step')
                        ctrl.model.steps = getSteps()
                        ctrl.model.steps.push({})
                        ctrl.update()
                    }
                },
                apply: {
                    title: 'Apply',
                    icon: 'fas fa-check',
                    onClick: function () {
                        let isOk = true
                        elt.find('form').each(function () {
                            /**@type {HTMLFormElement} */
                            const form = $(this).get(0)
                            //console.log('isOk', form.checkValidity())
                            isOk = isOk && form.reportValidity()
                        })
                        if (isOk) {
                            pager.popPage(getSteps())
                        }
                        
                    }
                }

            }
        }
    }
})
// @ts-check

$$.control.registerControl('actionsCtrl', {

	template: "<div bn-show=\"!hasActions\" class=\"message\">\n    No actions defined\n</div>\n\n<div class=\"scrollPanel\" bn-show=\"hasActions\">\n    <div bn-each=\"actions\" class=\"items\" bn-event=\"click.item: onItemClick, contextmenuchange.item:onItemContextMenu\">\n        <div class=\"w3-card-2 item\" bn-control=\"brainjs.contextmenu\" bn-data=\"{\n                    items: {\n                        edit: {name: \'Edit\', icon: \'fas fa-edit\'},\n                        delete: {name: \'Remove\', icon: \'fas fa-trash-alt\'},\n                        duplicate: {name: \'Duplicate\', icon: \'fas fa-clone\'}\n                    }\n                }\">\n            <div>\n                <strong bn-text=\"$scope.$i.name\"></strong>\n            </div>\n        </div>\n    </div>\n</div>",

	deps: ['breizbot.pager', 'actionSrv'],

	props: {
		actions: null,
		isEdition: true,
		hubDevices: null
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {ActionSrv.Interface} actionSrv
	 */
	init: function (elt, pager, actionSrv) {

		console.log('props', this.props)

		const { isEdition, hubDevices } = this.props

		const actions = Array.from(this.props.actions || [])

		if (!isEdition) {
			actions.unshift({ name: 'Zero' })
			actions.unshift({ name: 'None' })
		}

		const ctrl = $$.viewController(elt, {
			data: {
				actions,
				hasActions: function () {
					return this.actions.length > 0
				}
			},
			events: {
				onItemContextMenu: async function (ev, data) {
					const idx = $(this).closest('.item').index()
					const action = ctrl.model.actions[idx]
					//console.log('onItemContextMenu', idx, action)

					if (data.cmd == 'delete') {
						ctrl.model.actions.splice(idx, 1)
						ctrl.update()
					}
					if (data.cmd == 'duplicate') {
						const name = await $$.ui.showPrompt({ label: 'New Name', title: 'Add action' })
						if (name == null) return
						const newAction = Object.assign({}, action, {name})
						//console.log('newAction', newAction)
						ctrl.model.actions.push(newAction)
						ctrl.update()
					}
					if (data.cmd == 'edit') {
						let { steps } = action
						if (!Array.isArray(steps)) {
							steps = [action]
						}
						const availableActions = ctrl.model.actions.map((e) =>  e.name)
						//console.log('availableActions', availableActions)

						pager.pushPage('actionCtrl', {
							title: action.name,
							props: {
								steps,
								availableActions
							},
							onReturn: function (data) {
								//console.log('onReturn', data)
								ctrl.model.actions[idx] = { name: action.name, steps: data }
							}
						})
					}

				},
				onItemClick: function (ev) {
					const idx = $(this).closest('.item').index()
					//console.log('onItemClick', idx)
					const action = ctrl.model.actions[idx]
					if (isEdition) {
						actionSrv.execAction(hubDevices, ctrl.model.actions, action.name, 1)
					}
					else {
						pager.popPage(action.name)
					}

				}
			}
		})

		if (isEdition) {
			this.getButtons = function () {
				return {
					addAction: {
						title: 'Add Action',
						icon: 'fa fa-plus',
						onClick: async function () {
							//console.log('Add action')
							const name = await $$.ui.showPrompt({ label: 'Name', title: 'Add action' })
							if (name == null) return
							const availableActions = ctrl.model.actions.map((e) =>  e.name)
							//console.log('availableActions', availableActions)
							pager.pushPage('actionCtrl', {
								title: name,
								props: {
									steps: [{}],
									availableActions
								},
								onReturn: function (data) {
									ctrl.model.actions.push({ name, steps: data })
									ctrl.update()
								}
							})
						}
					},
					save: {
						title: 'Save',
						icon: 'fa fa-check',
						onClick: function () {
							pager.popPage(ctrl.model.actions)
						}
					}
				}
			}
		}


	}


});





// @ts-check

$$.control.registerControl('code', {

	template: "<div class=\"toolbar\">\n    <button bn-event=\"click: onRun\" class=\"w3-btn w3-blue\">Run</button>\n\n</div>\n<div id=\"blocklyDiv\"></div>\n<div class=\"logPanel\" bn-html=\"getLogs\"></div>\n\n<xml id=\"toolbox\" style=\"display: none;\">\n    <category name=\"Logic\" categorystyle=\"logic_category\">\n        <block type=\"controls_if\"></block>\n        <block type=\"logic_compare\"></block>\n        <block type=\"logic_operation\"></block>\n        <block type=\"logic_negate\"></block>\n        <block type=\"logic_boolean\"></block>\n        <block type=\"logic_ternary\"></block>\n    </category>\n    <category name=\"Loop\" categorystyle=\"loop_category\">\n        <block type=\"controls_repeat_ext\">\n            <value name=\"TIMES\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">10</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"controls_whileUntil\"></block>\n        <block type=\"controls_for\">\n            <value name=\"FROM\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">1</field>\n                </shadow>\n            </value>\n            <value name=\"TO\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">10</field>\n                </shadow>\n            </value>\n            <value name=\"BY\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">1</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"controls_forEach\"></block>\n        <block type=\"controls_flow_statements\"></block>\n    </category>\n    <category name=\"Math\" categorystyle=\"math_category\">\n        <block type=\"math_number\"></block>\n        <block type=\"math_arithmetic\"></block>\n        <block type=\"math_single\">\n            <field name=\"OP\">ROOT</field>\n            <value name=\"NUM\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">9</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"math_trig\">\n            <field name=\"OP\">SIN</field>\n            <value name=\"NUM\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">45</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"math_constant\">\n            <field name=\"CONSTANT\">PI</field>\n        </block>\n        <block type=\"math_random_int\">\n            <value name=\"FROM\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">1</field>\n                </shadow>\n            </value>\n            <value name=\"TO\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"math_round\">\n            <field name=\"OP\">ROUND</field>\n            <value name=\"NUM\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">3.1</field>\n                </shadow>\n            </value>\n        </block>\n    </category>\n    <category name=\"Text\" categorystyle=\"text_category\">\n        <block type=\"text\"></block>\n        <block type=\"text_print\"></block>\n        <block type=\"text_length\">\n            <value name=\"VALUE\">\n                <shadow type=\"text\">\n                    <field name=\"TEXT\">abc</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"text_changeCase\">\n            <field name=\"CASE\">UPPERCASE</field>\n            <value name=\"TEXT\">\n                <shadow type=\"text\">\n                    <field name=\"TEXT\">abc</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"text_append\">\n            <field name=\"VAR\" id=\"MHveE$^#X7/c|*RA!r{I\">item</field>\n            <value name=\"TEXT\">\n                <shadow type=\"text\">\n                    <field name=\"TEXT\" />\n                </shadow>\n            </value>\n        </block>\n        <block type=\"text_join\">\n            <mutation items=\"2\" />\n        </block>\n        <block type=\"text_indexOf\"></block>\n        <block type=\"text_charAt\"></block>\n        <block type=\"text_getSubstring\"></block>\n        <block type=\"text_prompt_ext\">\n            <mutation type=\"TEXT\" />\n            <field name=\"TYPE\">TEXT</field>\n            <value name=\"TEXT\">\n                <shadow type=\"text\">\n                    <field name=\"TEXT\">abc</field>\n                </shadow>\n            </value>\n        </block>\n    </category>\n    <category name=\"Lists\" categorystyle=\"list_category\">\n        <block type=\"lists_create_with\">\n            <mutation items=\"0\"></mutation>\n        </block>\n        <block type=\"lists_create_with\"></block>\n        <block type=\"lists_repeat\">\n            <value name=\"NUM\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">5</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"lists_length\"></block>\n        <block type=\"lists_isEmpty\"></block>\n        <block type=\"lists_indexOf\">\n            <value name=\"VALUE\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">list</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"lists_getIndex\">\n            <value name=\"VALUE\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">list</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"lists_setIndex\">\n            <value name=\"LIST\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">list</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"lists_getSublist\">\n            <value name=\"LIST\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">list</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"lists_split\">\n            <value name=\"DELIM\">\n                <shadow type=\"text\">\n                    <field name=\"TEXT\">,</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"lists_sort\"></block>\n        <block type=\"lists_reverse\"></block>\n    </category>\n    <category name=\"Variables\" custom=\"VARIABLE\" categorystyle=\"variable_category\"></category>\n    <category name=\"Functions\" custom=\"PROCEDURE\" categorystyle=\"procedure_category\"></category>\n    <category name=\"Motor\" colour=\"355\">\n        <block type=\"create_motor\"></block>\n        <block type=\"motor_power\">\n            <value name=\"POWER\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n    </category>\n    <category name=\"TachoMotor\" colour=\"355\">\n        <block type=\"create_tacho_motor\"></block>\n        <block type=\"motor_speed\">\n            <value name=\"SPEED\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"motor_speed_time\">\n            <value name=\"TIME\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">1000</field>\n                </shadow>\n            </value>\n            <value name=\"SPEED\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"motor_speed_degrees\">\n            <value name=\"DEGREES\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">180</field>\n                </shadow>\n            </value>\n            <value name=\"SPEED\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"motor_speed_position\">\n            <value name=\"ANGLE\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">0</field>\n                </shadow>\n            </value>\n            <value name=\"SPEED\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"motor_reset_position\"></block>\n        <block type=\"motor_get_speed\"></block>\n        <block type=\"motor_get_position\"></block>\n        <block type=\"motor_get_absoluteposition\"></block>\n\n    </category>\n    <category name=\"PairMotor\" colour=\"355\">\n        <block type=\"create_pair_motor\">\n            <FIELD name=\"PORT2\">B</FIELD>\n        </block>\n        <block type=\"pair_motor_speed\">\n            <value name=\"SPEED1\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n            <value name=\"SPEED2\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n\n\n    </category>\n    <category name=\"Hub\" colour=\"355\">\n        <block type=\"hub_color\"></block>\n        <block type=\"hub_get_tilt\"></block>\n        <block type=\"hub_get_voltage\"></block>\n\n\n    </category>\n    <category name=\"System\" colour=\"355\">\n        <block type=\"sleep\">\n            <value name=\"TIME\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">1000</field>\n                </shadow>\n            </value>\n        </block>\n    </category>\n\n</xml>",

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





// @ts-check

$$.control.registerControl('configCtrl', {

	template: "<div bn-show=\"!hasConfigs\" class=\"message\">\n    No configurations defined\n</div>\n\n<div class=\"scrollPanel\" bn-show=\"hasConfigs\">\n    <div bn-each=\"configs\" class=\"items\" bn-event=\"click.item: onItemClick, contextmenuchange.item:onItemContextMenu\">\n        <div class=\"w3-card-2 item\" bn-control=\"brainjs.contextmenu\" bn-data=\"{\n                    items: {\n                        delete: {name: \'Remove\', icon: \'fas fa-trash-alt\'}\n                    }\n                }\">\n            <div>\n                <strong bn-text=\"$scope.$i.name\"></strong>\n            </div>\n        </div>\n    </div>\n</div>",

	deps: ['breizbot.pager', 'breizbot.http'],

	props: {
		currentConfig: ''
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.Http.Interface} http
	 */
	init: function (elt, pager, http) {

		//console.log('props', this.props)

		const {currentConfig} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				configs: [],
				hasConfigs: function() {
					return this.configs.length > 0
				}
			},
			events: {
				onItemContextMenu: async function(ev, data) {
					const idx = $(this).closest('.item').index()
					//console.log('onItemContextMenu', idx, data)
					const config = ctrl.model.configs[idx]
					if (data.cmd == 'delete') {
						if (config.name == currentConfig) {
							$$.ui.showAlert({content: 'Cannot delete active config', title: 'Warning'})
						}
						else {
							await http.post('/delete', config)
							loadConfig()
						}

					}
				
				},
                onItemClick: function (ev) {
                    const idx = $(this).closest('.item').index()
					console.log('onItemClick', idx)
                    const config = ctrl.model.configs[idx]
					pager.popPage(config)


                }	
			}
		})

		async function loadConfig() {
			const configs = await http.get('/')
			console.log({configs})
			ctrl.setData({configs})
		}

		loadConfig()

	}


});





// @ts-check

$$.control.registerControl('hubinfo', {

	template: "<div class=\"scrollBar\">\n    <h1>External Devices</h1>\n    <table class=\"w3-table-all\">\n        <thead>\n            <tr>\n                <th>Port</th>\n                <th>Device Type</th>\n                <th>Action</th>\n            </tr>\n        </thead>\n        <tbody bn-each=\"externalDevices\" bn-event=\"\n            mousedown.motorMouseAction: onMouseUp, \n            mouseup.motorMouseAction:onMouseDown, \n            click.motorAction:onMotorAction, \n            click.ledAction: onLedAction,\n            click.portInfo: onInfo2, \n            click.calibrate:onCalibrate\">\n            <tr>\n                <td bn-text=\"$scope.$i.name\"></td>\n                <td bn-text=\"$scope.$i.type\"></td>\n                <td>\n                    <span bn-if=\"isMotor\" class=\"spanButtons\">\n                        <button class=\"w3-btn w3-green motorMouseAction\" data-action=\"forward\">FWD</button>\n                        <button class=\"w3-btn w3-green motorMouseAction\" data-action=\"backward\">BKWD</button>\n                    </span>\n                    <span bn-if=\"isTachoMotor\" class=\"spanButtons\">\n                        <button class=\"w3-btn w3-green motorAction\" data-action=\"reset\">RESET</button>\n                        <button class=\"w3-btn w3-green motorAction\" data-action=\"gozero\">GO ZERO</button>\n                    </span>\n                    <span bn-if=\"isLed\" class=\"spanButtons\">\n                        <button class=\"w3-btn w3-green ledAction\" data-action=\"on\">ON</button>\n                        <button class=\"w3-btn w3-green ledAction\" data-action=\"off\">OFF</button>\n                    </span>\n\n                    <button class=\"w3-btn w3-blue portInfo\">MODE</button>\n                </td>\n\n            </tr>\n\n        </tbody>\n    </table>\n    <h1>Internal Devices</h1>\n    <table class=\"w3-table-all\">\n        <thead>\n            <tr>\n                <th>Port ID</th>\n                <th>Device Type</th>\n                <th>Action</th>\n            </tr>\n        </thead>\n        <tbody bn-each=\"internalDevices\" bn-event=\"click.w3-btn: onInfo\">\n            <tr>\n                <td bn-text=\"$scope.$i.portId\"></td>\n                <td bn-text=\"$scope.$i.type\"></td>\n                <td>\n                    <button class=\"w3-btn w3-blue\">MODE</button>\n                </td>\n            </tr>\n\n        </tbody>\n    </table></div>",

	deps: ['breizbot.pager', 'hub'],

	props: {
		hubDevice: null
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {HUB} hub
	 */
	init: function (elt, pager, hub) {

		/**@type {HUB.HubDevice} */
		const hubDevice = this.props.hubDevice


		async function initDevices() {
			const devices = hubDevice.getHubDevices()
			console.log('devices', devices)

			const internalDevices = []
			const externalDevices = []

			for (const device of devices) {
				const { portId, type, name } = device
				if (portId < 50) {
					const info = { name, portId, type }
					externalDevices.push(info)
				}
				else {
					internalDevices.push({
						portId,
						type
					})

				}
			}

			ctrl.setData({ internalDevices, externalDevices })
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
					portId,
					hubDevice
				}
			})
		}

		/**
		 * 
		 * @param {JQuery<HTMLElement>} elt 
		 */
		function getExternalPortId(elt) {
			const idx = elt.closest('tr').index()
			return ctrl.model.externalDevices[idx].portId

		}

		async function attachCbk(data) {
			console.log('attach', data)
			const { portId, name, type } = data
			const info = { portId, name, type }
			ctrl.model.externalDevices.push(info)
			ctrl.update()

		}

		function detachCbk(data) {
			console.log('detach', data)
			const idx = ctrl.model.externalDevices.findIndex((dev) => dev.portId == data.portId)
			//console.log('idx', idx)
			ctrl.model.externalDevices.splice(idx, 1)
			ctrl.update()

		}

		hubDevice.on('attach', attachCbk)
		hubDevice.on('detach', detachCbk)

		this.dispose = async function () {
			console.log('hubInfo dispose')
			hubDevice.off('attach', attachCbk)
			hubDevice.off('detach', detachCbk)


		}


		const ctrl = $$.viewController(elt, {
			data: {
				internalDevices: [],
				externalDevices: [],
				isMotor: function (scope) {
					return hub.isMotor(hubDevice.getDevice(scope.$i.portId))
				},
				isLed: function (scope) {
					return hub.isLed(hubDevice.getDevice(scope.$i.portId))
				},
				isTachoMotor: function (scope) {
					return hub.isTachoMotor(hubDevice.getDevice(scope.$i.portId))
				}
			},
			events: {
				onMotorAction: async function () {
					const portId = getExternalPortId($(this))
					const action = $(this).data('action')
					console.log('onMotorAction', portId, action)
					const motor = await hubDevice.getTachoMotor(portId)
					switch (action) {
						case 'reset':
							motor.resetZero()
							break
						case 'gozero':
							motor.gotoAngle(0, 50, false)

					}

				},
				onLedAction: async function () {
					const portId = getExternalPortId($(this))
					const action = $(this).data('action')
					console.log('onLedAction', portId, action)
					const led = await hubDevice.getLed(portId)
					led.setBrightness((action == 'on' ? 100 : 0))
				},
				onCalibrate: async function () {
					const portId = getExternalPortId($(this))
					console.log('onCalibrate', portId)
					const motor = await hubDevice.getMotor(portId)
					await motor.calibrate()
				},
				onMouseUp: async function () {
					//console.log('onMouseUp')
					const action = $(this).data('action')
					const portId = getExternalPortId($(this))
					const motor = await hubDevice.getMotor(portId)
					switch (action) {
						case 'forward':
							motor.setPower(100)
							break
						case 'backward':
							motor.setPower(-100)
							break
					}
				},
				onMouseDown: async function () {
					//console.log('onMouseDown')
					const portId = getExternalPortId($(this))
					const motor = await hubDevice.getMotor(portId)
					motor.setPower(0)
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

		initDevices()

	}


});





// @ts-check

$$.control.registerControl('gamepad', {

	template: "<div>\n    <h2 bn-text=\"id\"></h2>\n</div>\n\n<h3>Axes</h3>\n<div>\n    <table class=\"w3-table-all axeTable\">\n        <thead>\n            <tr>\n                <th>Axe</th>\n                <th>Action</th>\n            </tr>\n        </thead>\n        <tbody bn-each=\"axes\" bn-bind=\"axes\" bn-index=\"idx\" bn-event=\"click.item: onAxeClick\">\n            <tr>\n                <td bn-text=\"getAxeLabel\"></td>\n                <td>\n                    <div bn-text=\"$scope.$i.action\" class=\"item\"></div>\n                </td>                \n            </tr>\n        </tbody>\n    </table>\n</div>\n\n<h3>Buttons</h3>\n<div class=\"commandTable\">\n    <table class=\"w3-table-all\">\n        <thead>\n            <tr>\n                <th>Button</th>\n                <th>Down</th>\n                <th>Up</th>\n            </tr>\n        </thead>\n        <tbody bn-each=\"buttons\" bn-bind=\"buttons\" bn-index=\"idx\" bn-event=\"click.item: onButtonClick\">\n            <tr>\n                <td bn-text=\"getButtonLabel\"></td>\n                <td>\n                    <div bn-text=\"$scope.$i.down\" class=\"item\" data-cmd=\"down\">\n                    </div>\n                </td>\n                <td>\n                    <div bn-text=\"$scope.$i.up\" class=\"item\" data-cmd=\"up\">\n                    </div>\n                </td>\n\n            </tr>\n        </tbody>\n    </table>\n</div>",

	deps: ['breizbot.pager', 'breizbot.gamepad'],

	props: {
		mapping: null,
		actions: null
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.Gamepad.Interface} gamepad
	 */
	init: function (elt, pager, gamepad) {

		const {mapping, actions} = this.props
		console.log(this.props)

		let axes = []
		let buttons = []

		const info = gamepad.getGamepads()[0]
		//console.log({ info })

		if (mapping != null) {
			axes = mapping.axes
			buttons = mapping.buttons
		}

		if (axes.length == 0) {
			for (let i = 0; i < info.axes.length; i++) {
				axes.push({ action: 'None' })
			}
		}

		if (buttons.length == 0) {	
			for (let i = 0; i < info.buttons.length; i++) {
				buttons.push({ up: 'None', down: 'None' })
			}
		}

		
		function onGamepadAxe(data) {
			//console.log('axe', data)
			const { value, id } = data
			if (value != 0) {
				axesElt.find('tr').eq(id).find('td').eq(0).addClass('pressed')
			}
			else {
				axesElt.find('tr').eq(id).find('td').eq(0).removeClass('pressed')
			}
		} 


		function onGamepadButtonDown(data) {
			//console.log('buttonDown', data.id)
			buttonsElt.find('tr').eq(data.id).find('td').eq(0).addClass('pressed')
		}

		function onGamepadButtonUp(data) {
			//console.log('buttonDown', data.id)
			buttonsElt.find('tr').eq(data.id).find('td').eq(0).removeClass('pressed')
		}

		gamepad.on('axe', onGamepadAxe)
		gamepad.on('buttonDown', onGamepadButtonDown)
		gamepad.on('buttonUp', onGamepadButtonUp)

		this.dispose = function() {
			console.log('dispose')
			gamepad.off('axe', onGamepadAxe)
			gamepad.off('buttonDown', onGamepadButtonDown)
			gamepad.off('buttonUp', onGamepadButtonUp)
	
		}

		const ctrl = $$.viewController(elt, {
			data: {
				id: info.id,
				axes,
				buttons,
				getButtonLabel: function(scope) {
					return `Button ${scope.idx + 1}`
				},
				getAxeLabel: function(scope) {
					return `Axe ${scope.idx + 1}`
				}
			},
			events: {
				onButtonClick: function() {
					const idx = $(this).closest('tr').index()
					const cmd = $(this).data('cmd')
					//console.log('onButtonClick', idx, cmd)
					pager.pushPage('actionsCtrl', {
						title: 'Select an action',
						props: {
							isEdition: false,
							actions
						},
						onReturn: function(actionName) {
							//console.log({actionName})
							ctrl.model.buttons[idx][cmd] = actionName
							ctrl.update()
						}
					})
				},
				onAxeClick: function() {
					const idx = $(this).closest('tr').index()
					console.log('onAxeClick', idx)
					pager.pushPage('actionsCtrl', {
						title: 'Select an action',
						props: {
							isEdition: false,
							actions
						},
						onReturn: function(actionName) {
							//console.log({actionName})
							ctrl.model.axes[idx].action = actionName
							ctrl.update()
						}
					})
				}
			}
		})

		/**@type {JQuery} */
		const axesElt = ctrl.scope.axes

		/**@type {JQuery} */
		const buttonsElt = ctrl.scope.buttons

		function getInfo() {
			const ret = {
				id: info.id,
				axes: [],
				buttons: []
			}
			axesElt.find('tr').each(function (idx) {
				const action = $(this).find('.item').text()

				ret.axes.push({
					action
				})
			})

			buttonsElt.find('tr').each(function (idx) {
				const up = $(this).find('[data-cmd="up"]').text()
				const down = $(this).find('[data-cmd="down"]').text()

				ret.buttons.push({
					up,
					down
				})
			})		
			
			console.log({ret})

			return ret
		}

		this.getButtons = function () {
			return {
				check: {
					icon: 'fa fa-check',
					title: 'Apply',
					onClick: function () {
						pager.popPage(getInfo())
					}
				}
			}

		}
	}


});





// @ts-check

$$.control.registerControl('info', {

	template: "<div>\n    <div>\n        Capabilities: <span bn-text=\"capabilities\"></span>\n    </div>\n    <table class=\"w3-table-all\">\n        <thead>\n            <tr>\n                <th>MODE</th>\n                <th>CAPABILITIES</th>\n                <th>UNIT</th>\n                <th>RAW</th>\n                <th>SI</th>\n                <th>VALUE FORMAT</th>\n                <th>Value</th>\n            </tr>\n        </thead>\n        <tbody bn-each=\"modes\" bn-event=\"click.btnGet: onBtnGet\">\n            <tr>\n                <td bn-text=\"$scope.$i.name\"></td>\n                <td bn-text=\"getCapabilites\"></td>\n                <td bn-text=\"$scope.$i.unit\"></td>\n                <td>\n                    <span bn-text=\"$scope.$i.RAW.min\"></span><br>\n                    <span bn-text=\"$scope.$i.RAW.max\"></span>\n                </td>\n                <td>\n                    <span bn-text=\"$scope.$i.PCT.min\"></span><br>\n                    <span bn-text=\"$scope.$i.PCT.max\"></span>\n                </td>\n                <td>\n                    <span bn-text=\"$scope.$i.SI.min\"></span><br>\n                    <span bn-text=\"$scope.$i.SI.max\"></span>\n                </td>\n                <td>\n                    dataType: <span bn-text=\"$scope.$i.VALUE_FORMAT.dataType\"></span><br>\n                    numValues: <span bn-text=\"$scope.$i.VALUE_FORMAT.numValues\"></span>\n                </td>\n                <td>\n                    <div bn-if=\"isInput\">\n                        <button class=\"w3-btn w3-green btnGet\">Get</button>\n                        <span></span>\n                    </div>\n\n                </td>\n            </tr>\n        </tbody>\n    </table>\n</div>",

	deps: ['breizbot.pager', 'hub'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {HUB} hub
	 */
	init: function (elt, pager, hub) {

		const { portId } = this.props

		/**@type {HUB.HubDevice} */
		const hubDevice = this.props.hubDevice

		const ctrl = $$.viewController(elt, {
			data: {
				modes: [],
				capabilities: '',
				isInput: function(scope) {
					return (scope.$i.mode & 0x1) != 0
				},
				getCapabilites: function(scope) {
					if (scope.$i.mode == 2) {
						return 'OUT'
					}
					else if (scope.$i.mode == 1) {
						return 'IN'
					}
					else if (scope.$i.mode == 3) {
						return 'IN/OUT'
					}				
				}
			},
			events: {
				onBtnGet: async function(scope) {
					const mode = $(this).closest('tr').index()
					console.log('onBtnGet', mode)
					const device = hubDevice.getDevice(portId)
					const values = await device.getValue(mode)
					console.log('values', values)
					$(this).closest('td').find('span').text(JSON.stringify(values, null, 4))
					
				}
			}
		})

		async function init() {
			const portInfo = await hubDevice.getPortInformation(portId)
			console.log('portInfo', portInfo)	
			const { modes, capabilities } = portInfo
			ctrl.setData({ modes, capabilities })
		}

		init()
	}


});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjdGlvblNydi5qcyIsIm1haW4uanMiLCJjb250cm9scy9zdGVwQ3RybC9zdGVwQ3RybC5qcyIsInBhZ2VzL2FjdGlvbi9hY3Rpb24uanMiLCJwYWdlcy9hY3Rpb25zL2FjdGlvbnMuanMiLCJwYWdlcy9jb2RlL2NvZGUuanMiLCJwYWdlcy9jb25maWdDdHJsL2NvbmZpZ0N0cmwuanMiLCJwYWdlcy9odWJpbmZvL2h1YmluZm8uanMiLCJwYWdlcy9nYW1lcGFkL2dhbWVwYWQuanMiLCJwYWdlcy9pbmZvL2luZm8uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNWtCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy9AdHMtY2hlY2tcbiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdhY3Rpb25TcnYnLCB7XG5cbiAgICBkZXBzOiBbJ2h1YiddLFxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHsqfSBjb25maWcgXG4gICAgICogQHBhcmFtIHtIVUJ9IGh1YiBcbiAgICAgKiBAcmV0dXJucyBcbiAgICAgKi9cbiAgICBpbml0OiBmdW5jdGlvbiAoY29uZmlnLCBodWIpIHtcblxuICAgICAgICBsZXQgdmFyaWFibGVzID0ge31cbiAgICAgICAgY29uc3QgZXZlbnRzID0gbmV3IEV2ZW50RW1pdHRlcjIoKVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcbiAgICAgICAgICogQHBhcmFtIHtBcnJheTxIVUIuSHViRGV2aWNlPn0gaHViRGV2aWNlc1xuICAgICAgICAgKiBAcGFyYW0ge0FjdGlvblNydi5TdGVwRGVzY30gc3RlcERlc2MgXG4gICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBmYWN0b3JcbiAgICAgICAgICovXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIGV4ZWNTdGVwKGh1YkRldmljZXMsIHN0ZXBEZXNjLCBmYWN0b3IpIHtcbiAgICAgICAgICAgIGlmIChzdGVwRGVzYy50eXBlID09ICdTTEVFUCcpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCAkJC51dGlsLndhaXQoc3RlcERlc2MudGltZSlcbiAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgaHViRGV2aWNlID0gaHViRGV2aWNlcy5maW5kKGUgPT4gZS5uYW1lID09IHN0ZXBEZXNjLmh1YilcbiAgICAgICAgICAgIGlmIChodWJEZXZpY2UpIHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKHtodWJEZXNjfSlcblxuICAgICAgICAgICAgICAgIGlmIChzdGVwRGVzYy50eXBlID09ICdQT1dFUicpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbW90b3IgPSBhd2FpdCBodWJEZXZpY2UuZ2V0TW90b3IoaHViLlBvcnRNYXBbc3RlcERlc2MucG9ydF0pXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IG1vdG9yLnNldFBvd2VyKHN0ZXBEZXNjLnBvd2VyICogZmFjdG9yKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChzdGVwRGVzYy50eXBlID09ICdCUklHSFRORVNTJykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsZWQgPSBhd2FpdCBodWJEZXZpY2UuZ2V0TGVkKGh1Yi5Qb3J0TWFwW3N0ZXBEZXNjLnBvcnRdKVxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBsZWQuc2V0QnJpZ2h0bmVzcyhzdGVwRGVzYy5icmlnaHRuZXNzICogZmFjdG9yKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChzdGVwRGVzYy50eXBlID09ICdTUEVFRCcpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbW90b3IgPSBhd2FpdCBodWJEZXZpY2UuZ2V0TW90b3IoaHViLlBvcnRNYXBbc3RlcERlc2MucG9ydF0pXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IG1vdG9yLnNldFNwZWVkKHN0ZXBEZXNjLnNwZWVkICogZmFjdG9yKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChzdGVwRGVzYy50eXBlID09ICdTUEVFRFRJTUUnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vdG9yID0gYXdhaXQgaHViRGV2aWNlLmdldE1vdG9yKGh1Yi5Qb3J0TWFwW3N0ZXBEZXNjLnBvcnRdKVxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBtb3Rvci5zZXRTcGVlZEZvclRpbWUoc3RlcERlc2Muc3BlZWQsIHN0ZXBEZXNjLnRpbWUsIHN0ZXBEZXNjLndhaXRGZWVkYmFjaywgc3RlcERlc2MuYnJha2VTdHlsZSlcbiAgICAgICAgICAgICAgICB9ICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoc3RlcERlc2MudHlwZSA9PSAnUk9UQVRFJykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtb3RvciA9IGF3YWl0IGh1YkRldmljZS5nZXRNb3RvcihodWIuUG9ydE1hcFtzdGVwRGVzYy5wb3J0XSlcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgbW90b3Iucm90YXRlRGVncmVlcyhzdGVwRGVzYy5hbmdsZSAqIGZhY3Rvciwgc3RlcERlc2Muc3BlZWQsIHN0ZXBEZXNjLndhaXRGZWVkYmFjaylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoc3RlcERlc2MudHlwZSA9PSAnUE9TSVRJT04nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vdG9yID0gYXdhaXQgaHViRGV2aWNlLmdldE1vdG9yKGh1Yi5Qb3J0TWFwW3N0ZXBEZXNjLnBvcnRdKVxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBtb3Rvci5nb3RvQW5nbGUoc3RlcERlc2MuYW5nbGUgKiBmYWN0b3IsIHN0ZXBEZXNjLnNwZWVkLCBzdGVwRGVzYy53YWl0RmVlZGJhY2spXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHN0ZXBEZXNjLnR5cGUgPT0gJ1pFUk8nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vdG9yID0gYXdhaXQgaHViRGV2aWNlLmdldE1vdG9yKGh1Yi5Qb3J0TWFwW3N0ZXBEZXNjLnBvcnRdKVxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBtb3Rvci5yZXNldFplcm8oKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChzdGVwRGVzYy50eXBlID09ICdDT0xPUicpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGVkID0gYXdhaXQgaHViRGV2aWNlLmdldFJnYkxlZChodWIuUG9ydE1hcC5IVUJfTEVEKVxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBsZWQuc2V0Q29sb3Ioc3RlcERlc2MuY29sb3IpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHN0ZXBEZXNjLnR5cGUgPT0gJ1JHQicpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGVkID0gYXdhaXQgaHViRGV2aWNlLmdldFJnYkxlZChodWIuUG9ydE1hcC5IVUJfTEVEKVxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBsZWQuc2V0UkdCQ29sb3Ioc3RlcERlc2MucmVkLCBzdGVwRGVzYy5ncmVlbiwgc3RlcERlc2MuYmx1ZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoc3RlcERlc2MudHlwZSA9PSAnQ0FMSUJSQVRFJykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtb3RvciA9IGF3YWl0IGh1YkRldmljZS5nZXRNb3RvcihodWIuUG9ydE1hcFtzdGVwRGVzYy5wb3J0XSlcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgbW90b3IuY2FsaWJyYXRlKClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoc3RlcERlc2MudHlwZSA9PSAnREJMU1BFRUQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBvcnRJZDEgPSBodWIuUG9ydE1hcFtzdGVwRGVzYy5wb3J0MV1cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcG9ydElkMiA9IGh1Yi5Qb3J0TWFwW3N0ZXBEZXNjLnBvcnQyXVxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vdG9yID0gYXdhaXQgaHViRGV2aWNlLmdldERibE1vdG9yKHBvcnRJZDEsIHBvcnRJZDIpXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IG1vdG9yLnNldFNwZWVkKHN0ZXBEZXNjLnNwZWVkMSAqZmFjdG9yLCBzdGVwRGVzYy5zcGVlZDIgKiBmYWN0b3IpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHN0ZXBEZXNjLnR5cGUgPT0gJ0RCTFNQRUVEVElNRScpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcG9ydElkMSA9IGh1Yi5Qb3J0TWFwW3N0ZXBEZXNjLnBvcnQxXVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwb3J0SWQyID0gaHViLlBvcnRNYXBbc3RlcERlc2MucG9ydDJdXG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbW90b3IgPSBhd2FpdCBodWJEZXZpY2UuZ2V0RGJsTW90b3IocG9ydElkMSwgcG9ydElkMilcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgbW90b3Iuc2V0U3BlZWRGb3JUaW1lKHN0ZXBEZXNjLnNwZWVkMSwgc3RlcERlc2Muc3BlZWQyLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ZXBEZXNjLnRpbWUsIHN0ZXBEZXNjLndhaXRGZWVkYmFjaywgc3RlcERlc2MuYnJha2VTdHlsZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoc3RlcERlc2MudHlwZSA9PSAnREJMUk9UQVRFJykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwb3J0SWQxID0gaHViLlBvcnRNYXBbc3RlcERlc2MucG9ydDFdXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBvcnRJZDIgPSBodWIuUG9ydE1hcFtzdGVwRGVzYy5wb3J0Ml1cblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtb3RvciA9IGF3YWl0IGh1YkRldmljZS5nZXREYmxNb3Rvcihwb3J0SWQxLCBwb3J0SWQyKVxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBtb3Rvci5yb3RhdGVEZWdyZWVzKHN0ZXBEZXNjLmFuZ2xlLCBzdGVwRGVzYy5zcGVlZDEgKmZhY3Rvciwgc3RlcERlc2Muc3BlZWQyICogZmFjdG9yLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ZXBEZXNjLndhaXRGZWVkYmFjaywgc3RlcERlc2MuYnJha2VTdHlsZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoc3RlcERlc2MudHlwZSA9PSAnREJMUE9TSVRJT04nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBvcnRJZDEgPSBodWIuUG9ydE1hcFtzdGVwRGVzYy5wb3J0MV1cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcG9ydElkMiA9IGh1Yi5Qb3J0TWFwW3N0ZXBEZXNjLnBvcnQyXVxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vdG9yID0gYXdhaXQgaHViRGV2aWNlLmdldERibE1vdG9yKHBvcnRJZDEsIHBvcnRJZDIpXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IG1vdG9yLmdvdG9BbmdsZShzdGVwRGVzYy5hbmdsZTEsIHN0ZXBEZXNjLmFuZ2xlMiwgc3RlcERlc2Muc3BlZWQgKiBmYWN0b3IsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGVwRGVzYy53YWl0RmVlZGJhY2ssIHN0ZXBEZXNjLmJyYWtlU3R5bGUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYHR5cGUgJHtzdGVwRGVzYy50eXBlfSBub3QgaW1wbGVtZW50ZWRgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGBIdWIgJHtzdGVwRGVzYy5odWJ9IGlzIG5vdCBjb25uZWN0ZWRgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbnVsbFxuICAgICAgICB9XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcbiAgICAgICAgICogQHBhcmFtIHtBcnJheTxIVUIuSHViRGV2aWNlPn0gaHViRGV2aWNlc1xuICAgICAgICAgKiBAcGFyYW0ge0FycmF5PEFjdGlvblNydi5BY3Rpb25EZXNjPn0gYWN0aW9ucyBcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGFjdGlvbk5hbWUgXG4gICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBmYWN0b3JcbiAgICAgICAgICovXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIGV4ZWNBY3Rpb24oaHViRGV2aWNlcywgYWN0aW9ucywgYWN0aW9uTmFtZSwgZmFjdG9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZXhlY0FjdGlvbicsIGh1YkRldmljZXMsIGFjdGlvbk5hbWUsIGZhY3RvcilcbiAgICAgICAgICAgIGNvbnN0IGFjdGlvbkRlc2MgPSBhY3Rpb25zLmZpbmQoZSA9PiBlLm5hbWUgPT0gYWN0aW9uTmFtZSlcbiAgICAgICAgICAgIGxldCB7c3RlcHN9ID0gYWN0aW9uRGVzY1xuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHN0ZXBzKSkge1xuICAgICAgICAgICAgICAgIHN0ZXBzID0gW2FjdGlvbkRlc2NdXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvcihjb25zdCBzdGVwIG9mIHN0ZXBzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0ZXAudHlwZSA9PSAnU0VUVkFSJykge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU0VUVkFSJywgc3RlcClcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qge3Zhck5hbWUsIHZhclZhbHVlfSA9IHN0ZXBcbiAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzW3Zhck5hbWVdID0gdmFyVmFsdWVcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygndmFyQ2hhbmdlJywge3Zhck5hbWUsIHZhclZhbHVlfSlcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzLmVtaXQoJ3ZhckNoYW5nZScsIHt2YXJOYW1lLCB2YXJWYWx1ZX0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHN0ZXAudHlwZSA9PSAnVEVTVFZBUicpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qge3Zhck5hbWV9ID0gc3RlcFxuICAgICAgICAgICAgICAgICAgICBjb25zdCB2YXJWYWx1ZSA9IHZhcmlhYmxlc1t2YXJOYW1lXVxuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdWYXJpYWJsZScsIHt2YXJOYW1lLCB2YXJWYWx1ZX0pXG4gICAgICAgICAgICAgICAgICAgIGlmICh2YXJWYWx1ZSA9PSBzdGVwLnZhclZhbHVlICYmIHN0ZXAuZXFBY3Rpb24gIT0gJ05vbmUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleGVjQWN0aW9uKGh1YkRldmljZXMsIGFjdGlvbnMsIHN0ZXAuZXFBY3Rpb24sIDEpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhclZhbHVlICE9IHN0ZXAudmFyVmFsdWUgJiYgc3RlcC5uZXFBY3Rpb24gIT0gJ05vbmUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleGVjQWN0aW9uKGh1YkRldmljZXMsIGFjdGlvbnMsIHN0ZXAubmVxQWN0aW9uLCAxKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXQgPSBhd2FpdCBleGVjU3RlcChodWJEZXZpY2VzLCBzdGVwLCBmYWN0b3IpXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJC5ub3RpZnkocmV0LCAnZXJyb3InKVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKHthY3Rpb25EZXNjfSlcbiBcblxuXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRWYXJpYWJsZXMoKSB7XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LmVudHJpZXModmFyaWFibGVzKS5tYXAoKFtuYW1lLCB2YWx1ZV0pID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge25hbWUsIHZhbHVlfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlc2V0VmFyaWFibGVzKCkge1xuICAgICAgICAgICAgdmFyaWFibGVzID0ge31cbiAgICAgICAgICAgIGV2ZW50cy5lbWl0KCd2YXJDaGFuZ2UnKVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGV4ZWNBY3Rpb24sXG4gICAgICAgICAgICBvbjogZXZlbnRzLm9uLmJpbmQoZXZlbnRzKSxcbiAgICAgICAgICAgIGdldFZhcmlhYmxlcyxcbiAgICAgICAgICAgIHJlc2V0VmFyaWFibGVzXG4gICAgICAgIH1cblxuICAgIH1cbn0pO1xuIiwiLy8gQHRzLWNoZWNrXG5cblxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJsZWZ0XFxcIj5cXG4gICAgICAgIFxcbiAgICAgICAgPGJ1dHRvbiBibi1ldmVudD1cXFwiY2xpY2s6IG9uTmV3Q29uZmlnXFxcIiBibi1pY29uPVxcXCJmYSBmYS1maWxlXFxcIiB0aXRsZT1cXFwiUmVzZXQgQ29uZmlnXFxcIj48L2J1dHRvbj5cXG5cXG4gICAgICAgIDxidXR0b24gYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkNvbmZpZ1xcXCIgYm4taWNvbj1cXFwiZmEgZmEtZm9sZGVyLW9wZW5cXFwiIHRpdGxlPVxcXCJPcGVuIENvbmZpZ1xcXCI+PC9idXR0b24+XFxuXFxuICAgICAgICA8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25TYXZlQ29uZmlnXFxcIiBibi1pY29uPVxcXCJmYSBmYS1zYXZlXFxcIiB0aXRsZT1cXFwiU2F2ZSBjdXJyZW50IGNvbmZpZ1xcXCI+PC9idXR0b24+XFxuXFxuICAgICAgICA8ZGl2IGJuLXNob3c9XFxcImN1cnJlbnRDb25maWdcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5DdXJyZW50IENvbmZpZzo8L2xhYmVsPlxcbiAgICAgICAgICAgIDxzcGFuIGJuLXRleHQ9XFxcImN1cnJlbnRDb25maWdcXFwiPjwvc3Bhbj5cXG4gICAgICAgIDwvZGl2PlxcblxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdj48L2Rpdj5cXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwibGVmdFxcXCI+XFxuICAgICAgICA8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25Db25uZWN0XFxcIj5Db25uZWN0IHRvIEhVQjwvYnV0dG9uPlxcbiAgICAgICAgXFxuICAgICAgICA8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25BY3Rpb25zXFxcIj5BY3Rpb25zPC9idXR0b24+XFxuXFxuICAgICAgICA8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25HYW1lUGFkXFxcIiBibi1zaG93PVxcXCJnYW1lcGFkQ29ubmVjdGVkXFxcIj5HYW1lcGFkPC9idXR0b24+XFxuXFxuICAgICAgICA8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25Db2RlXFxcIj5Db2RlPC9idXR0b24+XFxuXFxuXFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcblxcbjxkaXYgYm4tc2hvdz1cXFwiaGFzVmFyaWFibGVzXFxcIiBjbGFzcz1cXFwidmFyaWFibGVzXFxcIj5cXG4gICAgPHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZS1hbGxcXFwiPlxcbiAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgIDx0aD5WYXJpYWJsZSBOYW1lPC90aD5cXG4gICAgICAgICAgICA8dGg+VmFsdWU8L3RoPlxcbiAgICAgICAgPC90aGVhZD5cXG4gICAgICAgIDx0Ym9keSBibi1lYWNoPVxcXCJ2YXJpYWJsZXNcXFwiPlxcbiAgICAgICAgICAgIDx0cj5cXG4gICAgICAgICAgICAgICAgPHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5uYW1lXFxcIj48L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLnZhbHVlXFxcIj48L3RkPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICA8L3Rib2R5PlxcbiAgICA8L3RhYmxlPlxcbjwvZGl2PlxcblxcbjxkaXY+XFxuICAgIDx0YWJsZSBjbGFzcz1cXFwidzMtdGFibGUtYWxsXFxcIj5cXG4gICAgICAgIDx0aGVhZD5cXG4gICAgICAgICAgICA8dHI+XFxuICAgICAgICAgICAgICAgIDx0aD5IdWI8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+QWN0aW9uczwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5CYXR0ZXJ5IExldmVsPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPkFkZHJlc3M8L3RoPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICA8L3RoZWFkPlxcbiAgICAgICAgPHRib2R5IGJuLWVhY2g9XFxcImh1YkRldmljZXNcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5idG5TaHV0ZG93bjogb25TaHV0RG93biwgY2xpY2suYnRuSW5mbzogb25JbmZvLCBjb21ib2JveGNoYW5nZS5jb21ibzogb25IdWJDaGFuZ2VcXFwiPlxcbiAgICAgICAgICAgIDx0cj5cXG4gICAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGh1YnN9XFxcIiBibi12YWw9XFxcIiRzY29wZS4kaS5odWJJZFxcXCIgY2xhc3M9XFxcImNvbWJvXFxcIj48L2Rpdj5cXG4gICAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYnRuU2h1dGRvd25cXFwiPlNodXRkb3duPC9idXR0b24+XFxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJidG5JbmZvXFxcIj5JbmZvPC9idXR0b24+XFxuICAgICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkuYmF0dGVyeUxldmVsXFxcIj48L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmFkZHJlc3NcXFwiPjwvdGQ+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+XFxuXFxuPC9kaXY+XCIsXG5cblx0ZGVwczogWydicmVpemJvdC5wYWdlcicsICdodWInLCAnYnJlaXpib3QuZ2FtZXBhZCcsICdhY3Rpb25TcnYnLCAnYnJlaXpib3QuaHR0cCddLFxuXG5cdHByb3BzOiB7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXIgXG5cdCAqIEBwYXJhbSB7SFVCfSBodWJcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5HYW1lcGFkLkludGVyZmFjZX0gZ2FtZXBhZFxuXHQgKiBAcGFyYW0ge0FjdGlvblNydi5JbnRlcmZhY2V9IGFjdGlvblNydlxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkh0dHAuSW50ZXJmYWNlfSBodHRwXG5cdCAqIFxuXHQgKi9cblx0aW5pdDogYXN5bmMgZnVuY3Rpb24gKGVsdCwgcGFnZXIsIGh1YiwgZ2FtZXBhZCwgYWN0aW9uU3J2LCBodHRwKSB7XG5cblx0XHQvL2NvbnN0IGNvbmZpZyA9IHt9XG5cblx0XHRpbml0QmxvY2soKVxuXG5cdFx0bGV0IGNvbmZpZyA9IHtcblx0XHRcdGFjdGlvbnM6IFtdLFxuXHRcdFx0bWFwcGluZ3M6IHt9XG5cdFx0fVxuXG5cdFx0bGV0IGNvZGUgPSBudWxsXG5cblx0XHRlbHQuZmluZCgnYnV0dG9uJykuYWRkQ2xhc3MoJ3czLWJ0biB3My1ibHVlJylcblxuXHRcdC8qKkB0eXBlIHt7W1VVSUQ6IHN0cmluZ106IEhVQi5IdWJEZXZpY2V9fSAqL1xuXHRcdGNvbnN0IGh1YkRldmljZXMgPSB7fVxuXHRcdGxldCBVVUlEID0gMVxuXG5cdFx0bGV0IGdhbWVwYWRNYXBwaW5nID0gbnVsbFxuXHRcdGxldCBnYW1lcGFkSWQgPSAnJ1xuXG5cdFx0YWN0aW9uU3J2Lm9uKCd2YXJDaGFuZ2UnLCAoZGF0YSkgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ29uVmFyQ2hhbmdlJywgZGF0YSlcblx0XHRcdGNvbnN0IHZhcmlhYmxlcyA9IGFjdGlvblNydi5nZXRWYXJpYWJsZXMoKVxuXHRcdFx0Y29uc29sZS5sb2coJ3ZhcmlhYmxlcycsIHZhcmlhYmxlcylcblx0XHRcdGN0cmwuc2V0RGF0YSh7IHZhcmlhYmxlcyB9KVxuXHRcdH0pXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGN1cnJlbnRDb25maWc6ICcnLFxuXHRcdFx0XHRnYW1lcGFkQ29ubmVjdGVkOiBmYWxzZSxcblx0XHRcdFx0aHViRGV2aWNlczogW10sXG5cdFx0XHRcdGh1YnM6IFsnSFVCMScsICdIVUIyJ10sXG5cdFx0XHRcdHZhcmlhYmxlczogW10sXG5cdFx0XHRcdGhhc1ZhcmlhYmxlczogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnZhcmlhYmxlcy5sZW5ndGggPiAwXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25Db2RlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Db2RlJylcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnY29kZScsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnQ29kZScsXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRodWJEZXZpY2VzOiBPYmplY3QudmFsdWVzKGh1YkRldmljZXMpLFxuXHRcdFx0XHRcdFx0XHRjb2RlXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0b25CYWNrOiBmdW5jdGlvbiAodmFsdWUpIHtcblx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25CYWNrJywgdmFsdWUpXG5cdFx0XHRcdFx0XHRcdGNvZGUgPSB2YWx1ZVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTmV3Q29uZmlnOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uZmlnID0ge1xuXHRcdFx0XHRcdFx0YWN0aW9uczogW10sXG5cdFx0XHRcdFx0XHRtYXBwaW5nczoge31cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Z2FtZXBhZE1hcHBpbmcgPSBudWxsXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgY3VycmVudENvbmZpZzogJycgfSlcblx0XHRcdFx0XHRhY3Rpb25TcnYucmVzZXRWYXJpYWJsZXMoKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblNhdmVDb25maWc6IGFzeW5jIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblNhdmVDb25maWcnLCBjb25maWcpXG5cdFx0XHRcdFx0aWYgKGN0cmwubW9kZWwuY3VycmVudENvbmZpZyA9PSAnJykge1xuXHRcdFx0XHRcdFx0Y29uc3QgY3VycmVudENvbmZpZyA9IGF3YWl0ICQkLnVpLnNob3dQcm9tcHQoeyB0aXRsZTogJ1NhdmUgQ29uZmlnJywgbGFiZWw6ICdDb25maWcgTmFtZTonIH0pXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKHtjdXJyZW50Q29uZmlnfSlcblx0XHRcdFx0XHRcdGlmIChjdXJyZW50Q29uZmlnKSB7XG5cdFx0XHRcdFx0XHRcdGF3YWl0IGh0dHAucG9zdCgnL2FkZCcsIHsgbmFtZTogY3VycmVudENvbmZpZywgYWN0aW9uczogY29uZmlnLmFjdGlvbnMsIG1hcHBpbmdzOiBjb25maWcubWFwcGluZ3MgfSlcblx0XHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgY3VycmVudENvbmZpZyB9KVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdGF3YWl0IGh0dHAucG9zdCgnL3VwZGF0ZScsIGNvbmZpZylcblx0XHRcdFx0XHRcdCQubm90aWZ5KGBDb25maWcgJyR7Y29uZmlnLm5hbWV9JyB1cGRhdGVkYCwgJ3N1Y2Nlc3MnKVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNvbmZpZzogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uQ29uZmlnJylcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnY29uZmlnQ3RybCcsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnQ29uZmlndXJhdGlvbnMnLFxuXHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0Y3VycmVudENvbmZpZzogY3RybC5tb2RlbC5jdXJyZW50Q29uZmlnXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0b25SZXR1cm46IGZ1bmN0aW9uIChkYXRhKSB7XG5cdFx0XHRcdFx0XHRcdGNvbmZpZyA9IGRhdGFcblx0XHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgY3VycmVudENvbmZpZzogZGF0YS5uYW1lIH0pXG5cdFx0XHRcdFx0XHRcdGdhbWVwYWRNYXBwaW5nID0gY29uZmlnLm1hcHBpbmdzW2dhbWVwYWRJZF1cblx0XHRcdFx0XHRcdFx0YWN0aW9uU3J2LnJlc2V0VmFyaWFibGVzKClcblx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZyh7Z2FtZXBhZE1hcHBpbmd9KVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSHViQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmluZGV4KClcblxuXHRcdFx0XHRcdGNvbnN0IGh1YklkID0gJCh0aGlzKS5nZXRWYWx1ZSgpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25IdWJDaGFuZ2UnLCBpZHgsIGh1YklkKVxuXG5cdFx0XHRcdFx0Y29uc3QgaHViRGV2aWNlID0gaHViRGV2aWNlc1tjdHJsLm1vZGVsLmh1YkRldmljZXNbaWR4XS5VVUlEXVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdodWJEZXZpY2UnLCBodWJEZXZpY2UpXG5cdFx0XHRcdFx0aHViRGV2aWNlLm5hbWUgPSBodWJJZFxuXHRcdFx0XHRcdGN0cmwubW9kZWwuaHViRGV2aWNlc1tpZHhdLmh1YklkID0gaHViSWRcblx0XHRcdFx0fSxcblx0XHRcdFx0b25TaHV0RG93bjogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5pbmRleCgpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25TaHV0RG93bicsIGlkeClcblxuXHRcdFx0XHRcdC8qKkB0eXBlIHtBY3Rpb25TcnYuSHViRGVzY30gKi9cblx0XHRcdFx0XHRjb25zdCBodWJEZXNjID0gY3RybC5tb2RlbC5odWJEZXZpY2VzW2lkeF1cblx0XHRcdFx0XHRjb25zdCBodWJEZXZpY2UgPSBodWJEZXZpY2VzW2h1YkRlc2MuVVVJRF1cblx0XHRcdFx0XHRodWJEZXZpY2Uuc2h1dGRvd24oKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkluZm86IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuaW5kZXgoKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uSW5mbycsIGlkeClcblx0XHRcdFx0XHQvKipAdHlwZSB7QWN0aW9uU3J2Lkh1YkRlc2N9ICovXG5cdFx0XHRcdFx0Y29uc3QgaHViRGVzYyA9IGN0cmwubW9kZWwuaHViRGV2aWNlc1tpZHhdXG5cdFx0XHRcdFx0Y29uc3QgaHViRGV2aWNlID0gaHViRGV2aWNlc1todWJEZXNjLlVVSURdXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ2h1YkRldmljZScsIGh1YkRldmljZSlcblxuXHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdodWJpbmZvJywge1xuXHRcdFx0XHRcdFx0dGl0bGU6IGh1YkRlc2MuaHViSWQsXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRodWJEZXZpY2Vcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkFjdGlvbnM6IGZ1bmN0aW9uICgpIHtcblxuXHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdhY3Rpb25zQ3RybCcsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnQWN0aW9ucycsXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRhY3Rpb25zOiBjb25maWcuYWN0aW9ucyxcblx0XHRcdFx0XHRcdFx0aHViRGV2aWNlczogT2JqZWN0LnZhbHVlcyhodWJEZXZpY2VzKVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdG9uUmV0dXJuOiBhc3luYyBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25SZXR1cm4nLCBkYXRhKVxuXHRcdFx0XHRcdFx0XHRjb25maWcuYWN0aW9ucyA9IGRhdGFcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uR2FtZVBhZDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGdhbWVwYWQub2ZmKCdidXR0b25VcCcsIG9uR2FtZXBhZEJ1dHRvblVwKVxuXHRcdFx0XHRcdGdhbWVwYWQub2ZmKCdidXR0b25Eb3duJywgb25HYW1lcGFkQnV0dG9uRG93bilcblx0XHRcdFx0XHRnYW1lcGFkLm9mZignYXhlJywgb25HYW1lcGFkQXhlKVxuXG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2dhbWVwYWQnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0dhbWVwYWQnLFxuXHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0bWFwcGluZzogZ2FtZXBhZE1hcHBpbmcsXG5cdFx0XHRcdFx0XHRcdGFjdGlvbnM6IGNvbmZpZy5hY3Rpb25zXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0b25CYWNrOiBpbml0Q2JrLFxuXHRcdFx0XHRcdFx0b25SZXR1cm46IGFzeW5jIChtYXBwaW5nKSA9PiB7XG5cdFx0XHRcdFx0XHRcdGdhbWVwYWRNYXBwaW5nID0gbWFwcGluZ1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25SZXR1cm4nLCBnYW1lcGFkTWFwcGluZylcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ2NvbmZpZycsIGNvbmZpZylcblx0XHRcdFx0XHRcdFx0Y29uZmlnLm1hcHBpbmdzW21hcHBpbmcuaWRdID0gZ2FtZXBhZE1hcHBpbmdcblx0XHRcdFx0XHRcdFx0aW5pdENiaygpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblxuXG5cdFx0XHRcdG9uQ29ubmVjdDogYXN5bmMgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IGh1YkRldmljZSA9IGF3YWl0IGh1Yi5jb25uZWN0KClcblx0XHRcdFx0XHRjb25zdCBpZCA9IFVVSUQrK1xuXG5cdFx0XHRcdFx0aHViRGV2aWNlc1tpZF0gPSBodWJEZXZpY2VcblxuXHRcdFx0XHRcdGh1YkRldmljZS5vbignZXJyb3InLCAoZGF0YSkgPT4ge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coZGF0YSlcblx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdFx0Y29uc3QgbmJIdWJzID0gY3RybC5tb2RlbC5odWJEZXZpY2VzLmxlbmd0aFxuXHRcdFx0XHRcdGNvbnN0IGh1YklkID0gYEhVQiR7bmJIdWJzICsgMX1gXG5cdFx0XHRcdFx0aHViRGV2aWNlLm5hbWUgPSBodWJJZFxuXHRcdFx0XHRcdGN0cmwubW9kZWwuaHViRGV2aWNlcy5wdXNoKHsgVVVJRDogaWQsIGh1YklkLCBiYXR0ZXJ5TGV2ZWw6IDAsIGFkZHJlc3M6ICdVbmtub3duJyB9KVxuXHRcdFx0XHRcdGN0cmwudXBkYXRlKClcblxuXHRcdFx0XHRcdGh1YkRldmljZS5vbignYmF0dGVyeUxldmVsJywgKGRhdGEpID0+IHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2JhdHRlcnlMZXZlbCcsIGRhdGEpXG5cdFx0XHRcdFx0XHRjb25zdCBodWJEZXNjID0gY3RybC5tb2RlbC5odWJEZXZpY2VzLmZpbmQoKGUpID0+IGUuVVVJRCA9PSBpZClcblx0XHRcdFx0XHRcdGh1YkRlc2MuYmF0dGVyeUxldmVsID0gZGF0YS5iYXR0ZXJ5TGV2ZWxcblx0XHRcdFx0XHRcdGN0cmwudXBkYXRlKClcblx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdFx0aHViRGV2aWNlLm9uKCdhZGRyZXNzJywgKGRhdGEpID0+IHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdhZGRyZXNzJywgZGF0YSlcblx0XHRcdFx0XHRcdGNvbnN0IGh1YkRlc2MgPSBjdHJsLm1vZGVsLmh1YkRldmljZXMuZmluZCgoZSkgPT4gZS5VVUlEID09IGlkKVxuXHRcdFx0XHRcdFx0aHViRGVzYy5hZGRyZXNzID0gZGF0YS5hZGRyZXNzXG5cdFx0XHRcdFx0XHRjdHJsLnVwZGF0ZSgpXG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdGF3YWl0IGh1YkRldmljZS5zdGFydE5vdGlmaWNhdGlvbigpXG5cblx0XHRcdFx0XHRodWJEZXZpY2Uub24oJ2Rpc2Nvbm5lY3RlZCcsICgpID0+IHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdkaXNjb25uZWN0ZWQnKVxuXHRcdFx0XHRcdFx0Y29uc3QgaWR4ID0gY3RybC5tb2RlbC5odWJEZXZpY2VzLmZpbmRJbmRleCgoZSkgPT4gZS5VVUlEID09IGlkKVxuXHRcdFx0XHRcdFx0Y3RybC5tb2RlbC5odWJEZXZpY2VzLnNwbGljZShpZHgsIDEpXG5cdFx0XHRcdFx0XHRjdHJsLnVwZGF0ZSgpXG5cdFx0XHRcdFx0XHRkZWxldGUgaHViRGV2aWNlc1tpZF1cblx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdH1cblxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGZ1bmN0aW9uIGluaXRCbG9jaygpIHtcblx0XHRcdEJsb2NrbHkuQmxvY2tzWydjcmVhdGVfdGFjaG9fbW90b3InXSA9IHtcblx0XHRcdFx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQoXCJUYWNob01vdG9yXCIpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQoXCJIVUJcIilcblx0XHRcdFx0XHRcdC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZERyb3Bkb3duKFtbXCJIVUIxXCIsIFwiSFVCMVwiXSwgW1wiSFVCMlwiLCBcIkhVQjJcIl1dKSwgXCJIVUJcIilcblx0XHRcdFx0XHRcdC5hcHBlbmRGaWVsZChcIlBPUlRcIilcblx0XHRcdFx0XHRcdC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZERyb3Bkb3duKFtbXCJBXCIsIFwiQVwiXSwgW1wiQlwiLCBcIkJcIl0sIFtcIkNcIiwgXCJDXCJdLCBbXCJEXCIsIFwiRFwiXV0pLCBcIlBPUlRcIik7XG5cdFx0XHRcdFx0dGhpcy5zZXRPdXRwdXQodHJ1ZSwgXCJNb3RvclwiKTtcblx0XHRcdFx0XHR0aGlzLnNldENvbG91cigyMzApO1xuXHRcdFx0XHRcdHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcblx0XHRcdFx0XHR0aGlzLnNldEhlbHBVcmwoXCJcIik7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdEJsb2NrbHkuQmxvY2tzWydjcmVhdGVfbW90b3InXSA9IHtcblx0XHRcdFx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQoXCJNb3RvclwiKVxuXHRcdFx0XHRcdFx0LmFwcGVuZEZpZWxkKFwiSFVCXCIpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGREcm9wZG93bihbW1wiSFVCMVwiLCBcIkhVQjFcIl0sIFtcIkhVQjJcIiwgXCJIVUIyXCJdXSksIFwiSFVCXCIpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQoXCJQT1JUXCIpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGREcm9wZG93bihbW1wiQVwiLCBcIkFcIl0sIFtcIkJcIiwgXCJCXCJdLCBbXCJDXCIsIFwiQ1wiXSwgW1wiRFwiLCBcIkRcIl1dKSwgXCJQT1JUXCIpO1xuXHRcdFx0XHRcdHRoaXMuc2V0T3V0cHV0KHRydWUsIFwiTW90b3JcIik7XG5cdFx0XHRcdFx0dGhpcy5zZXRDb2xvdXIoMjMwKTtcblx0XHRcdFx0XHR0aGlzLnNldFRvb2x0aXAoXCJcIik7XG5cdFx0XHRcdFx0dGhpcy5zZXRIZWxwVXJsKFwiXCIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cdFx0XHRCbG9ja2x5LkJsb2Nrc1snY3JlYXRlX3BhaXJfbW90b3InXSA9IHtcblx0XHRcdFx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQoXCJQYWlyTW90b3JcIilcblx0XHRcdFx0XHRcdC5hcHBlbmRGaWVsZChcIkhVQlwiKVxuXHRcdFx0XHRcdFx0LmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkRHJvcGRvd24oW1tcIkhVQjFcIiwgXCJIVUIxXCJdLCBbXCJIVUIyXCIsIFwiSFVCMlwiXV0pLCBcIkhVQlwiKVxuXHRcdFx0XHRcdFx0LmFwcGVuZEZpZWxkKFwiUE9SVDFcIilcblx0XHRcdFx0XHRcdC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZERyb3Bkb3duKFtbXCJBXCIsIFwiQVwiXSwgW1wiQlwiLCBcIkJcIl0sIFtcIkNcIiwgXCJDXCJdLCBbXCJEXCIsIFwiRFwiXV0pLCBcIlBPUlQxXCIpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQoXCJQT1JUMlwiKVxuXHRcdFx0XHRcdFx0LmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkRHJvcGRvd24oW1tcIkFcIiwgXCJBXCJdLCBbXCJCXCIsIFwiQlwiXSwgW1wiQ1wiLCBcIkNcIl0sIFtcIkRcIiwgXCJEXCJdXSksIFwiUE9SVDJcIilcblx0XHRcdFx0XHR0aGlzLnNldE91dHB1dCh0cnVlLCBcIk1vdG9yXCIpO1xuXHRcdFx0XHRcdHRoaXMuc2V0Q29sb3VyKDIzMCk7XG5cdFx0XHRcdFx0dGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuXHRcdFx0XHRcdHRoaXMuc2V0SGVscFVybChcIlwiKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0QmxvY2tseS5CbG9ja3NbJ3BhaXJfbW90b3Jfc3BlZWQnXSA9IHtcblx0XHRcdFx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGRWYXJpYWJsZShcIml0ZW1cIiksIFwiVkFSXCIpO1xuXHRcdFx0XHRcdHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlNQRUVEMVwiKVxuXHRcdFx0XHRcdFx0LnNldENoZWNrKFwiTnVtYmVyXCIpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQoXCJTcGVlZDFcIik7XG5cdFx0XHRcdFx0dGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiU1BFRUQyXCIpXG5cdFx0XHRcdFx0XHQuc2V0Q2hlY2soXCJOdW1iZXJcIilcblx0XHRcdFx0XHRcdC5hcHBlbmRGaWVsZChcIlNwZWVkMlwiKTtcblx0XHRcdFx0XHR0aGlzLnNldElucHV0c0lubGluZSh0cnVlKTtcblx0XHRcdFx0XHR0aGlzLnNldFByZXZpb3VzU3RhdGVtZW50KHRydWUsIG51bGwpO1xuXHRcdFx0XHRcdHRoaXMuc2V0TmV4dFN0YXRlbWVudCh0cnVlLCBudWxsKTtcblx0XHRcdFx0XHR0aGlzLnNldENvbG91cigyMzApO1xuXHRcdFx0XHRcdHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcblx0XHRcdFx0XHR0aGlzLnNldEhlbHBVcmwoXCJcIik7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdEJsb2NrbHkuQmxvY2tzWydodWJfY29sb3InXSA9IHtcblx0XHRcdFx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQoXCJIVUJcIilcblx0XHRcdFx0XHRcdC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZERyb3Bkb3duKFtbXCJIVUIxXCIsIFwiSFVCMVwiXSwgW1wiSFVCMlwiLCBcIkhVQjJcIl1dKSwgXCJIVUJcIilcblx0XHRcdFx0XHRcdC5hcHBlbmRGaWVsZChcIkNvbG9yXCIpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGREcm9wZG93bihbW1wiQkxBQ0tcIiwgXCJCTEFDS1wiXSwgW1wiUFVSUExFXCIsIFwiUFVSUExFXCJdLCBbXCJCTFVFXCIsIFwiQkxVRVwiXSwgW1wiTElHSFRfQkxVRVwiLCBcIkxJR0hUX0JMVUVcIl0sIFtcIkNZQU5cIiwgXCJDWUFOXCJdLCBbXCJHUkVFTlwiLCBcIkdSRUVOXCJdLCBbXCJQSU5LXCIsIFwiUElOS1wiXSwgW1wiWUVMTE9XXCIsIFwiWUVMTE9XXCJdLCBbXCJPUkFOR0VcIiwgXCJPUkFOR0VcIl0sIFtcIlJFRFwiLCBcIlJFRFwiXSwgW1wiV0hJVEVcIiwgXCJXSElURVwiXV0pLCBcIkNPTE9SXCIpO1xuXHRcdFx0XHRcdHRoaXMuc2V0UHJldmlvdXNTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG5cdFx0XHRcdFx0dGhpcy5zZXROZXh0U3RhdGVtZW50KHRydWUsIG51bGwpO1xuXHRcdFx0XHRcdHRoaXMuc2V0Q29sb3VyKDIzMCk7XG5cdFx0XHRcdFx0dGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuXHRcdFx0XHRcdHRoaXMuc2V0SGVscFVybChcIlwiKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0QmxvY2tseS5CbG9ja3NbJ2h1Yl9nZXRfdGlsdCddID0ge1xuXHRcdFx0XHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0dGhpcy5hcHBlbmREdW1teUlucHV0KClcblx0XHRcdFx0XHRcdC5hcHBlbmRGaWVsZChcIkhVQlwiKVxuXHRcdFx0XHRcdFx0LmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkRHJvcGRvd24oW1tcIkhVQjFcIiwgXCJIVUIxXCJdLCBbXCJIVUIyXCIsIFwiSFVCMlwiXV0pLCBcIkhVQlwiKVxuXHRcdFx0XHRcdFx0LmFwcGVuZEZpZWxkKFwiVGlsdFwiKVxuXHRcdFx0XHRcdFx0LmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkRHJvcGRvd24oW1tcIlBpdGNoXCIsIFwicGl0Y2hcIl0sIFtcIlJvbGxcIiwgXCJyb2xsXCJdLCBbXCJZYXdcIiwgXCJ5YXdcIl1dKSwgXCJUWVBFXCIpO1xuXHRcdFx0XHRcdHRoaXMuc2V0T3V0cHV0KHRydWUsIFwiTnVtYmVyXCIpO1xuXHRcdFx0XHRcdHRoaXMuc2V0Q29sb3VyKDIzMCk7XG5cdFx0XHRcdFx0dGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuXHRcdFx0XHRcdHRoaXMuc2V0SGVscFVybChcIlwiKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXG5cdFx0XHRCbG9ja2x5LkJsb2Nrc1snaHViX2dldF92b2x0YWdlJ10gPSB7XG5cdFx0XHRcdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHR0aGlzLmFwcGVuZER1bW15SW5wdXQoKVxuXHRcdFx0XHRcdFx0LmFwcGVuZEZpZWxkKFwiSFVCXCIpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGREcm9wZG93bihbW1wiSFVCMVwiLCBcIkhVQjFcIl0sIFtcIkhVQjJcIiwgXCJIVUIyXCJdXSksIFwiSFVCXCIpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQoXCJWb2x0YWdlIChtVilcIilcblx0XHRcdFx0XHR0aGlzLnNldE91dHB1dCh0cnVlLCBcIk51bWJlclwiKTtcblx0XHRcdFx0XHR0aGlzLnNldENvbG91cigyMzApO1xuXHRcdFx0XHRcdHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcblx0XHRcdFx0XHR0aGlzLnNldEhlbHBVcmwoXCJcIik7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblxuXHRcdFx0QmxvY2tseS5CbG9ja3NbJ21vdG9yX3NwZWVkX3RpbWUnXSA9IHtcblx0XHRcdFx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGRWYXJpYWJsZShcIml0ZW1cIiksIFwiVkFSXCIpO1xuXHRcdFx0XHRcdHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlNQRUVEXCIpXG5cdFx0XHRcdFx0XHQuc2V0Q2hlY2soXCJOdW1iZXJcIilcblx0XHRcdFx0XHRcdC5hcHBlbmRGaWVsZChcIlNwZWVkXCIpO1xuXHRcdFx0XHRcdHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlRJTUVcIilcblx0XHRcdFx0XHRcdC5zZXRDaGVjayhcIk51bWJlclwiKVxuXHRcdFx0XHRcdFx0LmFwcGVuZEZpZWxkKFwiVGltZSAobXMpXCIpO1xuXHRcdFx0XHRcdHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQoXCJXYWl0XCIpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGRDaGVja2JveChcIlRSVUVcIiksIFwiV0FJVE1FXCIpO1xuXHRcdFx0XHRcdHRoaXMuc2V0UHJldmlvdXNTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG5cdFx0XHRcdFx0dGhpcy5zZXROZXh0U3RhdGVtZW50KHRydWUsIG51bGwpO1xuXHRcdFx0XHRcdHRoaXMuc2V0Q29sb3VyKDIzMCk7XG5cdFx0XHRcdFx0dGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuXHRcdFx0XHRcdHRoaXMuc2V0SGVscFVybChcIlwiKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0QmxvY2tseS5CbG9ja3NbJ21vdG9yX3NwZWVkX2RlZ3JlZXMnXSA9IHtcblx0XHRcdFx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGRWYXJpYWJsZShcIml0ZW1cIiksIFwiVkFSXCIpO1xuXHRcdFx0XHRcdHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlNQRUVEXCIpXG5cdFx0XHRcdFx0XHQuc2V0Q2hlY2soXCJOdW1iZXJcIilcblx0XHRcdFx0XHRcdC5hcHBlbmRGaWVsZChcIlNwZWVkXCIpO1xuXHRcdFx0XHRcdHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIkRFR1JFRVNcIilcblx0XHRcdFx0XHRcdC5zZXRDaGVjayhcIk51bWJlclwiKVxuXHRcdFx0XHRcdFx0LmFwcGVuZEZpZWxkKFwiRGVncmVlc1wiKTtcblx0XHRcdFx0XHR0aGlzLmFwcGVuZER1bW15SW5wdXQoKVxuXHRcdFx0XHRcdFx0LmFwcGVuZEZpZWxkKFwiV2FpdFwiKVxuXHRcdFx0XHRcdFx0LmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkQ2hlY2tib3goXCJUUlVFXCIpLCBcIldBSVRcIik7XG5cdFx0XHRcdFx0dGhpcy5zZXRQcmV2aW91c1N0YXRlbWVudCh0cnVlLCBudWxsKTtcblx0XHRcdFx0XHR0aGlzLnNldE5leHRTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG5cdFx0XHRcdFx0dGhpcy5zZXRDb2xvdXIoMjMwKTtcblx0XHRcdFx0XHR0aGlzLnNldFRvb2x0aXAoXCJcIik7XG5cdFx0XHRcdFx0dGhpcy5zZXRIZWxwVXJsKFwiXCIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cdFx0XHRCbG9ja2x5LkJsb2Nrc1snbW90b3Jfc3BlZWRfcG9zaXRpb24nXSA9IHtcblx0XHRcdFx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGRWYXJpYWJsZShcIml0ZW1cIiksIFwiVkFSXCIpO1xuXHRcdFx0XHRcdHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlNQRUVEXCIpXG5cdFx0XHRcdFx0XHQuc2V0Q2hlY2soXCJOdW1iZXJcIilcblx0XHRcdFx0XHRcdC5hcHBlbmRGaWVsZChcIlNwZWVkXCIpO1xuXHRcdFx0XHRcdHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIkFOR0xFXCIpXG5cdFx0XHRcdFx0XHQuc2V0Q2hlY2soXCJOdW1iZXJcIilcblx0XHRcdFx0XHRcdC5hcHBlbmRGaWVsZChcIkFuZ2xlXCIpO1xuXHRcdFx0XHRcdHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQoXCJXYWl0XCIpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGRDaGVja2JveChcIlRSVUVcIiksIFwiV0FJVE1FXCIpO1xuXHRcdFx0XHRcdHRoaXMuc2V0UHJldmlvdXNTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG5cdFx0XHRcdFx0dGhpcy5zZXROZXh0U3RhdGVtZW50KHRydWUsIG51bGwpO1xuXHRcdFx0XHRcdHRoaXMuc2V0Q29sb3VyKDIzMCk7XG5cdFx0XHRcdFx0dGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuXHRcdFx0XHRcdHRoaXMuc2V0SGVscFVybChcIlwiKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0QmxvY2tseS5CbG9ja3NbJ21vdG9yX3Jlc2V0X3Bvc2l0aW9uJ10gPSB7XG5cdFx0XHRcdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHR0aGlzLmFwcGVuZER1bW15SW5wdXQoKVxuXHRcdFx0XHRcdFx0LmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkVmFyaWFibGUoXCJpdGVtXCIpLCBcIlZBUlwiKVxuXHRcdFx0XHRcdFx0LmFwcGVuZEZpZWxkKFwicmVzZXQgcG9zaXRpb25cIilcblx0XHRcdFx0XHR0aGlzLnNldFByZXZpb3VzU3RhdGVtZW50KHRydWUsIG51bGwpO1xuXHRcdFx0XHRcdHRoaXMuc2V0TmV4dFN0YXRlbWVudCh0cnVlLCBudWxsKTtcblx0XHRcdFx0XHR0aGlzLnNldENvbG91cigyMzApO1xuXHRcdFx0XHRcdHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcblx0XHRcdFx0XHR0aGlzLnNldEhlbHBVcmwoXCJcIik7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdEJsb2NrbHkuQmxvY2tzWydtb3Rvcl9nZXRfc3BlZWQnXSA9IHtcblx0XHRcdFx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGRWYXJpYWJsZShcIml0ZW1cIiksIFwiVkFSXCIpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQoXCJTcGVlZFwiKTtcblx0XHRcdFx0XHR0aGlzLnNldE91dHB1dCh0cnVlLCBudWxsKTtcblx0XHRcdFx0XHR0aGlzLnNldENvbG91cigyMzApO1xuXHRcdFx0XHRcdHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcblx0XHRcdFx0XHR0aGlzLnNldEhlbHBVcmwoXCJcIik7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdEJsb2NrbHkuQmxvY2tzWydtb3Rvcl9nZXRfcG9zaXRpb24nXSA9IHtcblx0XHRcdFx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGRWYXJpYWJsZShcIml0ZW1cIiksIFwiVkFSXCIpXG5cdFx0XHRcdFx0XHQuYXBwZW5kRmllbGQoXCJQb3NpdGlvblwiKTtcblx0XHRcdFx0XHR0aGlzLnNldE91dHB1dCh0cnVlLCBudWxsKTtcblx0XHRcdFx0XHR0aGlzLnNldENvbG91cigyMzApO1xuXHRcdFx0XHRcdHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcblx0XHRcdFx0XHR0aGlzLnNldEhlbHBVcmwoXCJcIik7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdEJsb2NrbHkuQmxvY2tzWydtb3Rvcl9nZXRfYWJzb2x1dGVwb3NpdGlvbiddID0ge1xuXHRcdFx0XHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0dGhpcy5hcHBlbmREdW1teUlucHV0KClcblx0XHRcdFx0XHRcdC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZFZhcmlhYmxlKFwiaXRlbVwiKSwgXCJWQVJcIilcblx0XHRcdFx0XHRcdC5hcHBlbmRGaWVsZChcIkFic29sdXRlIFBvc2l0aW9uXCIpO1xuXHRcdFx0XHRcdHRoaXMuc2V0T3V0cHV0KHRydWUsIG51bGwpO1xuXHRcdFx0XHRcdHRoaXMuc2V0Q29sb3VyKDIzMCk7XG5cdFx0XHRcdFx0dGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuXHRcdFx0XHRcdHRoaXMuc2V0SGVscFVybChcIlwiKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0QmxvY2tseS5CbG9ja3NbJ3NsZWVwJ10gPSB7XG5cdFx0XHRcdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHR0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJUSU1FXCIpXG5cdFx0XHRcdFx0XHQuc2V0Q2hlY2soXCJOdW1iZXJcIilcblx0XHRcdFx0XHRcdC5hcHBlbmRGaWVsZChcIlNsZWVwIChtcylcIik7XG5cdFx0XHRcdFx0dGhpcy5zZXRQcmV2aW91c1N0YXRlbWVudCh0cnVlLCBudWxsKTtcblx0XHRcdFx0XHR0aGlzLnNldE5leHRTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG5cdFx0XHRcdFx0dGhpcy5zZXRDb2xvdXIoMjMwKTtcblx0XHRcdFx0XHR0aGlzLnNldFRvb2x0aXAoXCJcIik7XG5cdFx0XHRcdFx0dGhpcy5zZXRIZWxwVXJsKFwiXCIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cblx0XHRcdEJsb2NrbHkuQmxvY2tzWydtb3Rvcl9zcGVlZCddID0ge1xuXHRcdFx0XHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0dGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiU1BFRURcIilcblx0XHRcdFx0XHRcdC5zZXRDaGVjayhcIk51bWJlclwiKVxuXHRcdFx0XHRcdFx0LmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkVmFyaWFibGUoXCJpdGVtXCIpLCBcIlZBUlwiKVxuXHRcdFx0XHRcdFx0LmFwcGVuZEZpZWxkKFwiU3BlZWRcIik7XG5cdFx0XHRcdFx0dGhpcy5zZXRQcmV2aW91c1N0YXRlbWVudCh0cnVlLCBudWxsKTtcblx0XHRcdFx0XHR0aGlzLnNldE5leHRTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG5cdFx0XHRcdFx0dGhpcy5zZXRDb2xvdXIoMjMwKTtcblx0XHRcdFx0XHR0aGlzLnNldFRvb2x0aXAoXCJcIik7XG5cdFx0XHRcdFx0dGhpcy5zZXRIZWxwVXJsKFwiXCIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cdFx0XHRCbG9ja2x5LkJsb2Nrc1snbW90b3JfcG93ZXInXSA9IHtcblx0XHRcdFx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlBPV0VSXCIpXG5cdFx0XHRcdFx0XHQuc2V0Q2hlY2soXCJOdW1iZXJcIilcblx0XHRcdFx0XHRcdC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZFZhcmlhYmxlKFwiaXRlbVwiKSwgXCJWQVJcIilcblx0XHRcdFx0XHRcdC5hcHBlbmRGaWVsZChcIlBvd2VyXCIpO1xuXHRcdFx0XHRcdHRoaXMuc2V0UHJldmlvdXNTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG5cdFx0XHRcdFx0dGhpcy5zZXROZXh0U3RhdGVtZW50KHRydWUsIG51bGwpO1xuXHRcdFx0XHRcdHRoaXMuc2V0Q29sb3VyKDIzMCk7XG5cdFx0XHRcdFx0dGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuXHRcdFx0XHRcdHRoaXMuc2V0SGVscFVybChcIlwiKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uTmFtZSBcblx0XHQgKiBAcGFyYW0ge251bWJlcn0gZmFjdG9yIFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGV4ZWNBY3Rpb24oYWN0aW9uTmFtZSwgZmFjdG9yKSB7XG5cblx0XHRcdGFjdGlvblNydi5leGVjQWN0aW9uKE9iamVjdC52YWx1ZXMoaHViRGV2aWNlcyksIGNvbmZpZy5hY3Rpb25zLCBhY3Rpb25OYW1lLCBmYWN0b3IpXG5cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBvbkdhbWVwYWRCdXR0b25Eb3duKGRhdGEpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ29uR2FtZXBhZEJ1dHRvbkRvd24nLCBkYXRhKVxuXHRcdFx0aWYgKGdhbWVwYWRNYXBwaW5nKSB7XG5cdFx0XHRcdGNvbnN0IHsgZG93biB9ID0gZ2FtZXBhZE1hcHBpbmcuYnV0dG9uc1tkYXRhLmlkXVxuXHRcdFx0XHRpZiAoZG93biAhPSAnTm9uZScpIHtcblx0XHRcdFx0XHRleGVjQWN0aW9uKGRvd24sIDEpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBvbkdhbWVwYWRCdXR0b25VcChkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdvbkdhbWVwYWRCdXR0b25VcCcsIGRhdGEpXG5cblx0XHRcdGlmIChnYW1lcGFkTWFwcGluZykge1xuXHRcdFx0XHRjb25zdCB7IHVwLCBkb3duIH0gPSBnYW1lcGFkTWFwcGluZy5idXR0b25zW2RhdGEuaWRdXG5cdFx0XHRcdGlmICh1cCA9PSAnWmVybycpIHtcblx0XHRcdFx0XHRpZiAoZG93biAhPSAnTm9uZScpIHtcblx0XHRcdFx0XHRcdGV4ZWNBY3Rpb24oZG93biwgMClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAodXAgIT0gJ05vbmUnKSB7XG5cdFx0XHRcdFx0ZXhlY0FjdGlvbih1cCwgMSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIG9uR2FtZXBhZEF4ZShkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdvbkdhbWVwYWRBeGUnLCBkYXRhKVxuXHRcdFx0aWYgKGdhbWVwYWRNYXBwaW5nKSB7XG5cdFx0XHRcdGNvbnN0IHsgYWN0aW9uIH0gPSBnYW1lcGFkTWFwcGluZy5heGVzW2RhdGEuaWRdXG5cdFx0XHRcdGlmIChhY3Rpb24gIT0gJ05vbmUnKSB7XG5cdFx0XHRcdFx0ZXhlY0FjdGlvbihhY3Rpb24sIGRhdGEudmFsdWUpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblxuXHRcdGZ1bmN0aW9uIGluaXRDYmsoKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnaW5pdENiaycpXG5cdFx0XHRnYW1lcGFkLm9uKCdidXR0b25VcCcsIG9uR2FtZXBhZEJ1dHRvblVwKVxuXHRcdFx0Z2FtZXBhZC5vbignYnV0dG9uRG93bicsIG9uR2FtZXBhZEJ1dHRvbkRvd24pXG5cdFx0XHRnYW1lcGFkLm9uKCdheGUnLCBvbkdhbWVwYWRBeGUpXG5cblx0XHR9XG5cblxuXG5cdFx0Z2FtZXBhZC5vbignY29ubmVjdGVkJywgKGV2KSA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZygnZ2FtZXBhZCBjb25ubmVjdGVkJywgZXYpXG5cdFx0XHRnYW1lcGFkSWQgPSBldi5pZFxuXHRcdFx0Z2FtZXBhZE1hcHBpbmcgPSBjb25maWcubWFwcGluZ3NbZ2FtZXBhZElkXVxuXHRcdFx0Y29uc29sZS5sb2coeyBnYW1lcGFkTWFwcGluZyB9KVxuXG5cdFx0XHRjdHJsLnNldERhdGEoeyBnYW1lcGFkQ29ubmVjdGVkOiB0cnVlIH0pXG5cdFx0XHRnYW1lcGFkLmNoZWNrR2FtZVBhZFN0YXR1cygpXG5cdFx0XHRpbml0Q2JrKClcblxuXG5cdFx0fSlcblxuXHRcdGdhbWVwYWQub24oJ2Rpc2Nvbm5lY3RlZCcsIChldikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2dhbWVwYWQgZGlzY29ubmVjdGVkJylcblx0XHRcdGN0cmwuc2V0RGF0YSh7IGdhbWVwYWRDb25uZWN0ZWQ6IGZhbHNlIH0pXG5cdFx0XHRnYW1lcGFkTWFwcGluZyA9IG51bGxcblxuXHRcdH0pXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIvLyBAdHMtY2hlY2tcblxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3N0ZXBDdHJsJywge1xuXG4gICAgdGVtcGxhdGU6IFwiPGZvcm0gYm4tZXZlbnQ9XFxcInN1Ym1pdDogb25TdWJtaXRcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuXFxuICAgICAgICA8bGFiZWw+VHlwZTwvbGFiZWw+XFxuICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogYWN0aW9uVHlwZXN9XFxcIiBuYW1lPVxcXCJ0eXBlXFxcIiBibi11cGRhdGU9XFxcImNvbWJvYm94Y2hhbmdlXFxcIlxcbiAgICAgICAgICAgIGJuLXZhbD1cXFwidHlwZVxcXCI+PC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgICBcXG4gICAgPGRpdiBibi1pZj1cXFwiaXNTbGVlcFxcXCI+XFxuICAgIFxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5UaW1lIChtcyk8L2xhYmVsPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJudW1iZXJcXFwiIHJlcXVpcmVkIG5hbWU9XFxcInRpbWVcXFwiIG1pbj1cXFwiMFxcXCI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgXFxuICAgIDwvZGl2PlxcbiAgICBcXG4gICAgXFxuICAgIDxkaXYgYm4taWY9XFxcImlzU3BlZWRcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5IVUI8L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBodWJzfVxcXCIgbmFtZT1cXFwiaHViXFxcIiAgYm4tdmFsPVxcXCJodWJcXFwiPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPlBvcnQ8L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBwb3J0c31cXFwiIG5hbWU9XFxcInBvcnRcXFwiIGJuLXZhbD1cXFwicG9ydFxcXCI+PC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPlNwZWVkPC9sYWJlbD5cXG4gICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwibnVtYmVyXFxcIiByZXF1aXJlZCBuYW1lPVxcXCJzcGVlZFxcXCIgbWluPVxcXCItMTAwXFxcIiBtYXg9XFxcIjEwMFxcXCI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICAgIFxcbiAgICA8ZGl2IGJuLWlmPVxcXCJpc1NwZWVkdGltZVxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPkhVQjwvbGFiZWw+XFxuICAgICAgICAgICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGh1YnN9XFxcIiBuYW1lPVxcXCJodWJcXFwiICBibi12YWw9XFxcImh1YlxcXCI+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+UG9ydDwvbGFiZWw+XFxuICAgICAgICAgICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IHBvcnRzfVxcXCIgbmFtZT1cXFwicG9ydFxcXCIgYm4tdmFsPVxcXCJwb3J0XFxcIj48L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICBcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+U3BlZWQ8L2xhYmVsPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJudW1iZXJcXFwiIHJlcXVpcmVkIG5hbWU9XFxcInNwZWVkXFxcIiBtaW49XFxcIi0xMDBcXFwiIG1heD1cXFwiMTAwXFxcIj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5UaW1lIChtcyk8L2xhYmVsPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJudW1iZXJcXFwiIHJlcXVpcmVkIG5hbWU9XFxcInRpbWVcXFwiIG1pbj1cXFwiMFxcXCI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+V2FpdCBFbmQ8L2xhYmVsPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgbmFtZT1cXFwid2FpdEZlZWRiYWNrXFxcIj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5CcmFraW5nIFN0eWxlPC9sYWJlbD5cXG4gICAgICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogYnJha2VTdHlsZXN9XFxcIiBuYW1lPVxcXCJicmFrZVN0eWxlXFxcIiBibi12YWw9XFxcImJyYWtlU3R5bGVcXFwiPjwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgICBcXG4gICAgPGRpdiBibi1pZj1cXFwiaXNEYmxzcGVlZHRpbWVcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5IVUI8L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBodWJzfVxcXCIgbmFtZT1cXFwiaHViXFxcIiAgYm4tdmFsPVxcXCJodWJcXFwiPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPlBvcnQxPC9sYWJlbD5cXG4gICAgICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogcG9ydHN9XFxcIiBuYW1lPVxcXCJwb3J0MVxcXCIgYm4tdmFsPVxcXCJwb3J0MVxcXCI+PC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPlBvcnQyPC9sYWJlbD5cXG4gICAgICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogcG9ydHN9XFxcIiBuYW1lPVxcXCJwb3J0MlxcXCIgYm4tdmFsPVxcXCJwb3J0MlxcXCI+PC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPlNwZWVkMTwvbGFiZWw+XFxuICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcIm51bWJlclxcXCIgcmVxdWlyZWQgbmFtZT1cXFwic3BlZWQxXFxcIiBtaW49XFxcIi0xMDBcXFwiIG1heD1cXFwiMTAwXFxcIj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICBcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+U3BlZWQyPC9sYWJlbD5cXG4gICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwibnVtYmVyXFxcIiByZXF1aXJlZCBuYW1lPVxcXCJzcGVlZDJcXFwiIG1pbj1cXFwiLTEwMFxcXCIgbWF4PVxcXCIxMDBcXFwiPlxcbiAgICAgICAgPC9kaXY+XFxuICAgIFxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5UaW1lIChtcyk8L2xhYmVsPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJudW1iZXJcXFwiIHJlcXVpcmVkIG5hbWU9XFxcInRpbWVcXFwiIG1pbj1cXFwiMFxcXCI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+V2FpdCBFbmQ8L2xhYmVsPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgbmFtZT1cXFwid2FpdEZlZWRiYWNrXFxcIj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5CcmFraW5nIFN0eWxlPC9sYWJlbD5cXG4gICAgICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogYnJha2VTdHlsZXN9XFxcIiBuYW1lPVxcXCJicmFrZVN0eWxlXFxcIiBibi12YWw9XFxcImJyYWtlU3R5bGVcXFwiPjwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgICBcXG4gICAgPGRpdiBibi1pZj1cXFwiaXNQb3dlclxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPkhVQjwvbGFiZWw+XFxuICAgICAgICAgICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGh1YnN9XFxcIiBuYW1lPVxcXCJodWJcXFwiICBibi12YWw9XFxcImh1YlxcXCI+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+UG9ydDwvbGFiZWw+XFxuICAgICAgICAgICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IHBvcnRzfVxcXCIgbmFtZT1cXFwicG9ydFxcXCIgYm4tdmFsPVxcXCJwb3J0XFxcIj48L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICBcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+UG93ZXI8L2xhYmVsPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJudW1iZXJcXFwiIHJlcXVpcmVkIG5hbWU9XFxcInBvd2VyXFxcIiBtaW49XFxcIi0xMDBcXFwiIG1heD1cXFwiMTAwXFxcIj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gICAgXFxuICAgIDxkaXYgYm4taWY9XFxcImlzUm90YXRlXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+SFVCPC9sYWJlbD5cXG4gICAgICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogaHVic31cXFwiIG5hbWU9XFxcImh1YlxcXCIgIGJuLXZhbD1cXFwiaHViXFxcIj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5Qb3J0PC9sYWJlbD5cXG4gICAgICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogcG9ydHN9XFxcIiBuYW1lPVxcXCJwb3J0XFxcIiBibi12YWw9XFxcInBvcnRcXFwiPjwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIFxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5TcGVlZDwvbGFiZWw+XFxuICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcIm51bWJlclxcXCIgcmVxdWlyZWQgbmFtZT1cXFwic3BlZWRcXFwiIG1pbj1cXFwiLTEwMFxcXCIgbWF4PVxcXCIxMDBcXFwiPlxcbiAgICAgICAgPC9kaXY+XFxuICAgIFxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5BbmdsZSAowrApPC9sYWJlbD5cXG4gICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwibnVtYmVyXFxcIiByZXF1aXJlZCBuYW1lPVxcXCJhbmdsZVxcXCIgc3RlcD1cXFwiMVxcXCI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPldhaXQgRW5kPC9sYWJlbD5cXG4gICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIG5hbWU9XFxcIndhaXRGZWVkYmFja1xcXCI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPkJyYWtpbmcgU3R5bGU8L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBicmFrZVN0eWxlc31cXFwiIG5hbWU9XFxcImJyYWtlU3R5bGVcXFwiIGJuLXZhbD1cXFwiYnJha2VTdHlsZVxcXCI+PC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICAgIFxcbiAgICA8ZGl2IGJuLWlmPVxcXCJpc0RibHJvdGF0ZVxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPkhVQjwvbGFiZWw+XFxuICAgICAgICAgICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGh1YnN9XFxcIiBuYW1lPVxcXCJodWJcXFwiICBibi12YWw9XFxcImh1YlxcXCI+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+UG9ydDE8L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBwb3J0c31cXFwiIG5hbWU9XFxcInBvcnQxXFxcIiBibi12YWw9XFxcInBvcnQxXFxcIj48L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICBcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+UG9ydDI8L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBwb3J0c31cXFwiIG5hbWU9XFxcInBvcnQyXFxcIiBibi12YWw9XFxcInBvcnQyXFxcIj48L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICBcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+U3BlZWQxPC9sYWJlbD5cXG4gICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwibnVtYmVyXFxcIiByZXF1aXJlZCBuYW1lPVxcXCJzcGVlZDFcXFwiIG1pbj1cXFwiLTEwMFxcXCIgbWF4PVxcXCIxMDBcXFwiPlxcbiAgICAgICAgPC9kaXY+XFxuICAgIFxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5TcGVlZDI8L2xhYmVsPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJudW1iZXJcXFwiIHJlcXVpcmVkIG5hbWU9XFxcInNwZWVkMlxcXCIgbWluPVxcXCItMTAwXFxcIiBtYXg9XFxcIjEwMFxcXCI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPkFuZ2xlICjCsCk8L2xhYmVsPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJudW1iZXJcXFwiIHJlcXVpcmVkIG5hbWU9XFxcImFuZ2xlXFxcIiBzdGVwPVxcXCIxXFxcIj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICBcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+V2FpdCBFbmQ8L2xhYmVsPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgbmFtZT1cXFwid2FpdEZlZWRiYWNrXFxcIj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICBcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+QnJha2luZyBTdHlsZTwvbGFiZWw+XFxuICAgICAgICAgICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGJyYWtlU3R5bGVzfVxcXCIgbmFtZT1cXFwiYnJha2VTdHlsZVxcXCIgYm4tdmFsPVxcXCJicmFrZVN0eWxlXFxcIj48L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gICAgXFxuICAgIDxkaXYgYm4taWY9XFxcImlzUG9zaXRpb25cXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5IVUI8L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBodWJzfVxcXCIgbmFtZT1cXFwiaHViXFxcIiAgYm4tdmFsPVxcXCJodWJcXFwiPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPlBvcnQ8L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBwb3J0c31cXFwiIG5hbWU9XFxcInBvcnRcXFwiIGJuLXZhbD1cXFwicG9ydFxcXCI+PC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPlNwZWVkPC9sYWJlbD5cXG4gICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwibnVtYmVyXFxcIiByZXF1aXJlZCBuYW1lPVxcXCJzcGVlZFxcXCIgbWluPVxcXCItMTAwXFxcIiBtYXg9XFxcIjEwMFxcXCI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPkFuZ2xlICjCsCk8L2xhYmVsPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJudW1iZXJcXFwiIHJlcXVpcmVkIG5hbWU9XFxcImFuZ2xlXFxcIiBzdGVwPVxcXCIxXFxcIj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICBcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+V2FpdCBFbmQ8L2xhYmVsPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgbmFtZT1cXFwid2FpdEZlZWRiYWNrXFxcIj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICBcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+QnJha2luZyBTdHlsZTwvbGFiZWw+XFxuICAgICAgICAgICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGJyYWtlU3R5bGVzfVxcXCIgbmFtZT1cXFwiYnJha2VTdHlsZVxcXCIgYm4tdmFsPVxcXCJicmFrZVN0eWxlXFxcIj48L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gICAgXFxuICAgIDxkaXYgYm4taWY9XFxcImlzRGJscG9zaXRpb25cXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5IVUI8L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBodWJzfVxcXCIgbmFtZT1cXFwiaHViXFxcIiAgYm4tdmFsPVxcXCJodWJcXFwiPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPlBvcnQxPC9sYWJlbD5cXG4gICAgICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogcG9ydHN9XFxcIiBuYW1lPVxcXCJwb3J0MVxcXCIgYm4tdmFsPVxcXCJwb3J0MVxcXCI+PC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPlBvcnQyPC9sYWJlbD5cXG4gICAgICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogcG9ydHN9XFxcIiBuYW1lPVxcXCJwb3J0MlxcXCIgYm4tdmFsPVxcXCJwb3J0MlxcXCI+PC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPlNwZWVkPC9sYWJlbD5cXG4gICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwibnVtYmVyXFxcIiByZXF1aXJlZCBuYW1lPVxcXCJzcGVlZFxcXCIgbWluPVxcXCItMTAwXFxcIiBtYXg9XFxcIjEwMFxcXCI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPkFuZ2xlMSAowrApPC9sYWJlbD5cXG4gICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwibnVtYmVyXFxcIiByZXF1aXJlZCBuYW1lPVxcXCJhbmdsZTFcXFwiIHN0ZXA9XFxcIjFcXFwiPlxcbiAgICAgICAgPC9kaXY+XFxuICAgIFxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5BbmdsZTIgKMKwKTwvbGFiZWw+XFxuICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcIm51bWJlclxcXCIgcmVxdWlyZWQgbmFtZT1cXFwiYW5nbGUyXFxcIiBzdGVwPVxcXCIxXFxcIj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICBcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+V2FpdCBFbmQ8L2xhYmVsPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgbmFtZT1cXFwid2FpdEZlZWRiYWNrXFxcIj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICBcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+QnJha2luZyBTdHlsZTwvbGFiZWw+XFxuICAgICAgICAgICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGJyYWtlU3R5bGVzfVxcXCIgbmFtZT1cXFwiYnJha2VTdHlsZVxcXCIgYm4tdmFsPVxcXCJicmFrZVN0eWxlXFxcIj48L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gICAgXFxuICAgIDxkaXYgYm4taWY9XFxcImlzQ2FsaWJyYXRlXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+SFVCPC9sYWJlbD5cXG4gICAgICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogaHVic31cXFwiIG5hbWU9XFxcImh1YlxcXCIgIGJuLXZhbD1cXFwiaHViXFxcIj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5Qb3J0PC9sYWJlbD5cXG4gICAgICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogcG9ydHN9XFxcIiBuYW1lPVxcXCJwb3J0XFxcIiBibi12YWw9XFxcInBvcnRcXFwiPjwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIFxcbiAgICA8L2Rpdj5cXG4gICAgXFxuICAgIFxcbiAgICA8ZGl2IGJuLWlmPVxcXCJpc1plcm9cXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5IVUI8L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBodWJzfVxcXCIgbmFtZT1cXFwiaHViXFxcIiAgYm4tdmFsPVxcXCJodWJcXFwiPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPlBvcnQ8L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBwb3J0c31cXFwiIG5hbWU9XFxcInBvcnRcXFwiIGJuLXZhbD1cXFwicG9ydFxcXCI+PC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgXFxuICAgIDwvZGl2PlxcbiAgICBcXG4gICAgPGRpdiBibi1pZj1cXFwiaXNDb2xvclxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPkhVQjwvbGFiZWw+XFxuICAgICAgICAgICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGh1YnN9XFxcIiBuYW1lPVxcXCJodWJcXFwiICBibi12YWw9XFxcImh1YlxcXCI+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+Q29sb3I8L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBsZWRDb2xvcnN9XFxcIiBuYW1lPVxcXCJjb2xvclxcXCI+PC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgXFxuICAgIDwvZGl2PlxcbiAgICBcXG4gICAgPGRpdiBibi1pZj1cXFwiaXNSZ2JcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5IVUI8L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBodWJzfVxcXCIgbmFtZT1cXFwiaHViXFxcIiAgYm4tdmFsPVxcXCJodWJcXFwiPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPlJlZDwvbGFiZWw+XFxuICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcIm51bWJlclxcXCIgbWluPVxcXCIwXFxcIiBtYXg9XFxcIjI1NVxcXCIgbmFtZT1cXFwicmVkXFxcIj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5HcmVlbjwvbGFiZWw+XFxuICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcIm51bWJlclxcXCIgbWluPVxcXCIwXFxcIiBtYXg9XFxcIjI1NVxcXCIgbmFtZT1cXFwiZ3JlZW5cXFwiPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPkJsdWU8L2xhYmVsPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJudW1iZXJcXFwiIG1pbj1cXFwiMFxcXCIgbWF4PVxcXCIyNTVcXFwiIG5hbWU9XFxcImJsdWVcXFwiPlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGJuLWlmPVxcXCJpc0JyaWdodG5lc3NcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5IVUI8L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBodWJzfVxcXCIgbmFtZT1cXFwiaHViXFxcIiAgYm4tdmFsPVxcXCJodWJcXFwiPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPlBvcnQ8L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBwb3J0c31cXFwiIG5hbWU9XFxcInBvcnRcXFwiIGJuLXZhbD1cXFwicG9ydFxcXCI+PC9kaXY+XFxuICAgICAgICA8L2Rpdj4gIFxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5CcmlnaHRuZXNzPC9sYWJlbD5cXG4gICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwibnVtYmVyXFxcIiBtaW49XFxcIjBcXFwiIG5hbWU9XFxcImJyaWdodG5lc3NcXFwiPlxcbiAgICAgICAgPC9kaXY+XFxuXFxuICAgIDwvZGl2PlxcbiAgICBcXG4gICAgPGRpdiBibi1pZj1cXFwiaXNEYmxzcGVlZFxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPkhVQjwvbGFiZWw+XFxuICAgICAgICAgICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGh1YnN9XFxcIiBuYW1lPVxcXCJodWJcXFwiICBibi12YWw9XFxcImh1YlxcXCI+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+UG9ydDE8L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBwb3J0c31cXFwiIG5hbWU9XFxcInBvcnQxXFxcIiBibi12YWw9XFxcInBvcnQxXFxcIj48L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICBcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+UG9ydDI8L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBwb3J0c31cXFwiIG5hbWU9XFxcInBvcnQyXFxcIiBibi12YWw9XFxcInBvcnQyXFxcIj48L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICBcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+U3BlZWQxPC9sYWJlbD5cXG4gICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwibnVtYmVyXFxcIiByZXF1aXJlZCBuYW1lPVxcXCJzcGVlZDFcXFwiIG1pbj1cXFwiLTEwMFxcXCIgbWF4PVxcXCIxMDBcXFwiPlxcbiAgICAgICAgPC9kaXY+XFxuICAgIFxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5TcGVlZDI8L2xhYmVsPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJudW1iZXJcXFwiIHJlcXVpcmVkIG5hbWU9XFxcInNwZWVkMlxcXCIgbWluPVxcXCItMTAwXFxcIiBtYXg9XFxcIjEwMFxcXCI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuXFxuICAgIDxkaXYgYm4taWY9XFxcImlzVGVzdHZhclxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPlZhcmlhYmxlIE5hbWU8L2xhYmVsPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJ2YXJOYW1lXFxcIiByZXF1aXJlZD5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgIDxsYWJlbD5JZiB2YXJpYWJsZSA9PC9sYWJlbD5cXG4gICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwidmFyVmFsdWVcXFwiIHJlcXVpcmVkPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPkFjdGlvbjwvbGFiZWw+XFxuICAgICAgICAgICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGF2YWlsYWJsZUFjdGlvbnN9XFxcIiBuYW1lPVxcXCJlcUFjdGlvblxcXCIgYm4tdmFsPVxcXCJlcUFjdGlvblxcXCI+PC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+RWxzZSBBY3Rpb248L2xhYmVsPlxcbiAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBhdmFpbGFibGVBY3Rpb25zfVxcXCIgbmFtZT1cXFwibmVxQWN0aW9uXFxcIiBibi12YWw9XFxcIm5lcUFjdGlvblxcXCI+PC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuXFxuICAgIDxkaXYgYm4taWY9XFxcImlzU2V0dmFyXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImdyb3VwXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+VmFyaWFibGUgTmFtZTwvbGFiZWw+XFxuICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcInZhck5hbWVcXFwiIHJlcXVpcmVkPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJncm91cFxcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPlZhbHVlPC9sYWJlbD5cXG4gICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwidmFyVmFsdWVcXFwiIHJlcXVpcmVkPlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZm9ybT5cIixcblxuICAgIGRlcHM6IFsnYnJlaXpib3QucGFnZXInLCAnaHViJ10sXG5cbiAgICBwcm9wczoge1xuICAgICAgICBkYXRhOiBudWxsXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcbiAgICAgKiBAcGFyYW0ge0hVQn0gaHViXG4gICAgICovXG4gICAgaW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIsIGh1Yikge1xuXG4gICAgICAgIC8vY29uc29sZS5sb2coJ3N0ZXBDdHJsIHByb3BzJywgdGhpcy5wcm9wcylcbiAgICAgICAgbGV0IHsgZGF0YSwgYXZhaWxhYmxlQWN0aW9ucyB9ID0gdGhpcy5wcm9wc1xuXG4gICAgICAgIGRhdGEgPSBkYXRhIHx8IHt9XG5cbiAgICAgICAgYXZhaWxhYmxlQWN0aW9ucy51bnNoaWZ0KCdOb25lJylcblxuICAgICAgICBjb25zdCBhY3Rpb25UeXBlcyA9IFtcbiAgICAgICAgICAgICdTTEVFUCcsXG4gICAgICAgICAgICAnUE9XRVInLFxuICAgICAgICAgICAgJ1NQRUVEJyxcbiAgICAgICAgICAgICdEQkxTUEVFRCcsXG4gICAgICAgICAgICAnU1BFRURUSU1FJyxcbiAgICAgICAgICAgICdEQkxTUEVFRFRJTUUnLFxuICAgICAgICAgICAgJ1JPVEFURScsXG4gICAgICAgICAgICAnREJMUk9UQVRFJyxcbiAgICAgICAgICAgICdQT1NJVElPTicsXG4gICAgICAgICAgICAnREJMUE9TSVRJT04nLFxuICAgICAgICAgICAgJ0NBTElCUkFURScsXG4gICAgICAgICAgICAnWkVSTycsXG4gICAgICAgICAgICAnQ09MT1InLFxuICAgICAgICAgICAgJ1JHQicsXG4gICAgICAgICAgICAnQlJJR0hUTkVTUycsXG4gICAgICAgICAgICAnVEVTVFZBUicsXG4gICAgICAgICAgICAnU0VUVkFSJ1xuICAgICAgICBdXG4gICAgICAgIGNvbnN0IHBvcnRzID0gJ0FCQ0QnLnNwbGl0KCcnKVxuICAgICAgICBjb25zdCBodWJzID0gWydIVUIxJywgJ0hVQjInXVxuICAgICAgICBjb25zdCBsZWRDb2xvcnMgPSBPYmplY3QuZW50cmllcyhodWIuQ29sb3IpLm1hcCgoW2xhYmVsLCB2YWx1ZV0pID0+IE9iamVjdC5hc3NpZ24oe2xhYmVsLCB2YWx1ZX0pKVxuICAgICAgICAvL2NvbnNvbGUubG9nKGxlZENvbG9ycylcblxuICAgICAgICBjb25zdCBicmFrZVN0eWxlcyA9IE9iamVjdC5lbnRyaWVzKGh1Yi5CcmFraW5nU3R5bGUpLm1hcCgoW2xhYmVsLCB2YWx1ZV0pID0+IE9iamVjdC5hc3NpZ24oe2xhYmVsLCB2YWx1ZX0pKVxuICAgICAgICAvL2NvbnNvbGUubG9nKGJyYWtlU3R5bGVzKVxuXG4gICAgICAgIGNvbnN0IGRhdGFJbmZvID0ge1xuICAgICAgICAgICAgcG9ydDogZGF0YS5wb3J0IHx8ICdBJyxcbiAgICAgICAgICAgIHBvcnQxOiBkYXRhLnBvcnQxIHx8ICdBJyxcbiAgICAgICAgICAgIHBvcnQyOiBkYXRhLnBvcnQyIHx8ICdCJyxcbiAgICAgICAgICAgIHR5cGU6IGRhdGEudHlwZSB8fCAnU1BFRUQnLFxuICAgICAgICAgICAgaHViOiBkYXRhLmh1YiB8fCAnSFVCMScsXG4gICAgICAgICAgICBicmFrZVN0eWxlOiBkYXRhLmJyYWtlU3R5bGUgfHwgaHViLkJyYWtpbmdTdHlsZS5CUkFLRSxcbiAgICAgICAgICAgIGFjdGlvblR5cGVzLFxuICAgICAgICAgICAgYnJha2VTdHlsZXMsXG4gICAgICAgICAgICBsZWRDb2xvcnMsXG4gICAgICAgICAgICBwb3J0cyxcbiAgICAgICAgICAgIHN0YXRlczogWydTVEFURTEnLCAnU1RBVEUyJywgJ1NUQVRFMyddLFxuICAgICAgICAgICAgaHVicyxcbiAgICAgICAgICAgIGF2YWlsYWJsZUFjdGlvbnMsXG4gICAgICAgICAgICBlcUFjdGlvbjogZGF0YS5lcUFjdGlvbiB8fCAnTm9uZScsXG4gICAgICAgICAgICBuZXFBY3Rpb246IGRhdGEubmVxQWN0aW9uIHx8ICdOb25lJyxcbiAgICAgICAgICAgIHN0YXRlOiBkYXRhLnN0YXRlIHx8ICdTVEFURTEnXG4gICAgICAgIH1cbiAgICAgICAgZm9yKGNvbnN0IGEgb2YgYWN0aW9uVHlwZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBhLmNoYXJBdCgwKSArIGEuc2xpY2UoMSkudG9Mb3dlckNhc2UoKVxuICAgICAgICAgICAgZGF0YUluZm9bJ2lzJyArIG5hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudHlwZSA9PSBhXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuICAgICAgICAgICAgZGF0YTogZGF0YUluZm8sXG4gICAgICAgICAgICBldmVudHM6IHtcbiAgICAgICAgICAgICAgICBvblN1Ym1pdDogZnVuY3Rpb24oZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ29uU3VibWl0JylcbiAgICAgICAgICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICBlbHQuc2V0Rm9ybURhdGEoZGF0YSlcblxuICAgIH1cblxufSk7XG5cblxuXG5cbiIsIi8vIEB0cy1jaGVja1xuXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYWN0aW9uQ3RybCcsIHtcblxuICAgIHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIj5cXG5cXG4gICAgPGRpdiBibi1lYWNoPVxcXCJzdGVwc1xcXCIgYm4taW5kZXg9XFxcImlkeFxcXCIgXFxuICAgICAgICBibi1ldmVudD1cXFwiY2xpY2sucmVtb3ZlQnRuOiBvblJlbW92ZVN0ZXAsIGNsaWNrLnVwQnRuOiBvbk1vdmVVcCwgY2xpY2suZG93bkJ0bjogb25Nb3ZlRG93blxcXCI+XFxuXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwSXRlbVxcXCI+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibWVudWJhclxcXCIgPlxcbiAgICAgICAgICAgICAgICA8ZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBibi1pY29uPVxcXCJmYXMgZmEtbGV2ZWwtdXAtYWx0XFxcIiBjbGFzcz1cXFwidXBCdG5cXFwiIHRpdGxlPVxcXCJNb3ZlVXBcXFwiXFxuICAgICAgICAgICAgICAgICAgICAgICAgYm4tc2hvdz1cXFwiY2FuTW92ZVVwXFxcIj48L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gYm4taWNvbj1cXFwiZmFzIGZhLWxldmVsLWRvd24tYWx0XFxcIiBjbGFzcz1cXFwiZG93bkJ0blxcXCIgdGl0bGU9XFxcIk1vdmVEb3duXFxcIlxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJuLXNob3c9XFxcImNhbk1vdmVEb3duXFxcIj48L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gYm4taWNvbj1cXFwiZmEgZmEtdHJhc2gtYWx0XFxcIiBjbGFzcz1cXFwicmVtb3ZlQnRuXFxcIiB0aXRsZT1cXFwiUmVtb3ZlXFxcIiBcXG4gICAgICAgICAgICAgICAgICAgIGJuLXNob3c9XFxcInNob3dNZW51YmFyXFxcIj48L2J1dHRvbj5cXG5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBibi1jb250cm9sPVxcXCJzdGVwQ3RybFxcXCIgYm4tZGF0YT1cXFwie2RhdGE6ICRzY29wZS4kaSwgYXZhaWxhYmxlQWN0aW9uc31cXFwiPjwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuXFxuICAgIDwvZGl2PlxcbjwvZGl2PlwiLFxuXG4gICAgZGVwczogWydicmVpemJvdC5wYWdlciddLFxuXG4gICAgcHJvcHM6IHtcbiAgICAgICAgc3RlcHM6IFtdLFxuICAgICAgICBhdmFpbGFibGVBY3Rpb25zOiBbXVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXIgXG4gICAgICovXG4gICAgaW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIpIHtcblxuICAgICAgICBjb25zb2xlLmxvZygnYWN0aW9uQ3RybCBwcm9wcycsIHRoaXMucHJvcHMpXG4gICAgICAgIGNvbnN0IHsgc3RlcHMsIGF2YWlsYWJsZUFjdGlvbnMgfSA9IHRoaXMucHJvcHNcblxuICAgICAgICBjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgc3RlcHMsXG4gICAgICAgICAgICAgICAgYXZhaWxhYmxlQWN0aW9ucyxcbiAgICAgICAgICAgICAgICBzaG93TWVudWJhcjogZnVuY3Rpb24gKHNjb3BlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzY29wZS5pZHggPiAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjYW5Nb3ZlVXA6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2NvcGUuaWR4ID4gMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY2FuTW92ZURvd246IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2NvcGUuaWR4IDwgdGhpcy5zdGVwcy5sZW5ndGggLSAxXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGV2ZW50czoge1xuICAgICAgICAgICAgICAgIG9uTW92ZVVwOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ29uTW92ZVVwJylcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCcuc3RlcEl0ZW0nKS5pbmRleCgpXG4gICAgICAgICAgICAgICAgICAgIGN0cmwubW9kZWwuc3RlcHMgPSBnZXRTdGVwcygpXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlbXAgPSBjdHJsLm1vZGVsLnN0ZXBzW2lkeF1cbiAgICAgICAgICAgICAgICAgICAgY3RybC5tb2RlbC5zdGVwc1tpZHhdID0gY3RybC5tb2RlbC5zdGVwc1tpZHggLSAxXVxuICAgICAgICAgICAgICAgICAgICBjdHJsLm1vZGVsLnN0ZXBzW2lkeCAtIDFdID0gdGVtcFxuICAgICAgICAgICAgICAgICAgICBjdHJsLnVwZGF0ZSgpXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbk1vdmVEb3duOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ29uTW92ZURvd24nKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJy5zdGVwSXRlbScpLmluZGV4KClcbiAgICAgICAgICAgICAgICAgICAgY3RybC5tb2RlbC5zdGVwcyA9IGdldFN0ZXBzKClcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGVtcCA9IGN0cmwubW9kZWwuc3RlcHNbaWR4XVxuICAgICAgICAgICAgICAgICAgICBjdHJsLm1vZGVsLnN0ZXBzW2lkeF0gPSBjdHJsLm1vZGVsLnN0ZXBzW2lkeCArIDFdXG4gICAgICAgICAgICAgICAgICAgIGN0cmwubW9kZWwuc3RlcHNbaWR4ICsgMV0gPSB0ZW1wXG4gICAgICAgICAgICAgICAgICAgIGN0cmwudXBkYXRlKClcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uUmVtb3ZlU3RlcDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJy5zdGVwSXRlbScpLmluZGV4KClcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ29uUmVtb3ZlU3RlcCcsIGlkeClcbiAgICAgICAgICAgICAgICAgICAgY3RybC5tb2RlbC5zdGVwcy5zcGxpY2UoaWR4LCAxKVxuICAgICAgICAgICAgICAgICAgICBjdHJsLnVwZGF0ZSgpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFN0ZXBzKCkge1xuICAgICAgICAgICAgY29uc3Qgc3RlcHMgPSBbXVxuICAgICAgICAgICAgZWx0LmZpbmQoJ2Zvcm0nKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzdGVwcy5wdXNoKCQodGhpcykuZ2V0Rm9ybURhdGEoKSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdzdGVwcycsIHN0ZXBzKVxuICAgICAgICAgICAgcmV0dXJuIHN0ZXBzXG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmdldEJ1dHRvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGFkZFN0ZXA6IHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdBZGQgU3RlcCcsXG4gICAgICAgICAgICAgICAgICAgIGljb246ICdmYSBmYS1wbHVzJyxcbiAgICAgICAgICAgICAgICAgICAgb25DbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnQWRkIHN0ZXAnKVxuICAgICAgICAgICAgICAgICAgICAgICAgY3RybC5tb2RlbC5zdGVwcyA9IGdldFN0ZXBzKClcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0cmwubW9kZWwuc3RlcHMucHVzaCh7fSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0cmwudXBkYXRlKClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYXBwbHk6IHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdBcHBseScsXG4gICAgICAgICAgICAgICAgICAgIGljb246ICdmYXMgZmEtY2hlY2snLFxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaXNPayA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsdC5maW5kKCdmb3JtJykuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLyoqQHR5cGUge0hUTUxGb3JtRWxlbWVudH0gKi9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3JtID0gJCh0aGlzKS5nZXQoMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdpc09rJywgZm9ybS5jaGVja1ZhbGlkaXR5KCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNPayA9IGlzT2sgJiYgZm9ybS5yZXBvcnRWYWxpZGl0eSgpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzT2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWdlci5wb3BQYWdlKGdldFN0ZXBzKCkpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSkiLCIvLyBAdHMtY2hlY2tcblxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2FjdGlvbnNDdHJsJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgYm4tc2hvdz1cXFwiIWhhc0FjdGlvbnNcXFwiIGNsYXNzPVxcXCJtZXNzYWdlXFxcIj5cXG4gICAgTm8gYWN0aW9ucyBkZWZpbmVkXFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiIGJuLXNob3c9XFxcImhhc0FjdGlvbnNcXFwiPlxcbiAgICA8ZGl2IGJuLWVhY2g9XFxcImFjdGlvbnNcXFwiIGNsYXNzPVxcXCJpdGVtc1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLml0ZW06IG9uSXRlbUNsaWNrLCBjb250ZXh0bWVudWNoYW5nZS5pdGVtOm9uSXRlbUNvbnRleHRNZW51XFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInczLWNhcmQtMiBpdGVtXFxcIiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBibi1kYXRhPVxcXCJ7XFxuICAgICAgICAgICAgICAgICAgICBpdGVtczoge1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGVkaXQ6IHtuYW1lOiBcXCdFZGl0XFwnLCBpY29uOiBcXCdmYXMgZmEtZWRpdFxcJ30sXFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlOiB7bmFtZTogXFwnUmVtb3ZlXFwnLCBpY29uOiBcXCdmYXMgZmEtdHJhc2gtYWx0XFwnfSxcXG4gICAgICAgICAgICAgICAgICAgICAgICBkdXBsaWNhdGU6IHtuYW1lOiBcXCdEdXBsaWNhdGVcXCcsIGljb246IFxcJ2ZhcyBmYS1jbG9uZVxcJ31cXG4gICAgICAgICAgICAgICAgICAgIH1cXG4gICAgICAgICAgICAgICAgfVxcXCI+XFxuICAgICAgICAgICAgPGRpdj5cXG4gICAgICAgICAgICAgICAgPHN0cm9uZyBibi10ZXh0PVxcXCIkc2NvcGUuJGkubmFtZVxcXCI+PC9zdHJvbmc+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuPC9kaXY+XCIsXG5cblx0ZGVwczogWydicmVpemJvdC5wYWdlcicsICdhY3Rpb25TcnYnXSxcblxuXHRwcm9wczoge1xuXHRcdGFjdGlvbnM6IG51bGwsXG5cdFx0aXNFZGl0aW9uOiB0cnVlLFxuXHRcdGh1YkRldmljZXM6IG51bGxcblx0fSxcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcblx0ICogQHBhcmFtIHtBY3Rpb25TcnYuSW50ZXJmYWNlfSBhY3Rpb25TcnZcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHBhZ2VyLCBhY3Rpb25TcnYpIHtcblxuXHRcdGNvbnNvbGUubG9nKCdwcm9wcycsIHRoaXMucHJvcHMpXG5cblx0XHRjb25zdCB7IGlzRWRpdGlvbiwgaHViRGV2aWNlcyB9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgYWN0aW9ucyA9IEFycmF5LmZyb20odGhpcy5wcm9wcy5hY3Rpb25zIHx8IFtdKVxuXG5cdFx0aWYgKCFpc0VkaXRpb24pIHtcblx0XHRcdGFjdGlvbnMudW5zaGlmdCh7IG5hbWU6ICdaZXJvJyB9KVxuXHRcdFx0YWN0aW9ucy51bnNoaWZ0KHsgbmFtZTogJ05vbmUnIH0pXG5cdFx0fVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRhY3Rpb25zLFxuXHRcdFx0XHRoYXNBY3Rpb25zOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuYWN0aW9ucy5sZW5ndGggPiAwXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25JdGVtQ29udGV4dE1lbnU6IGFzeW5jIGZ1bmN0aW9uIChldiwgZGF0YSkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnLml0ZW0nKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3QgYWN0aW9uID0gY3RybC5tb2RlbC5hY3Rpb25zW2lkeF1cblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkl0ZW1Db250ZXh0TWVudScsIGlkeCwgYWN0aW9uKVxuXG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdkZWxldGUnKSB7XG5cdFx0XHRcdFx0XHRjdHJsLm1vZGVsLmFjdGlvbnMuc3BsaWNlKGlkeCwgMSlcblx0XHRcdFx0XHRcdGN0cmwudXBkYXRlKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdkdXBsaWNhdGUnKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBuYW1lID0gYXdhaXQgJCQudWkuc2hvd1Byb21wdCh7IGxhYmVsOiAnTmV3IE5hbWUnLCB0aXRsZTogJ0FkZCBhY3Rpb24nIH0pXG5cdFx0XHRcdFx0XHRpZiAobmFtZSA9PSBudWxsKSByZXR1cm5cblx0XHRcdFx0XHRcdGNvbnN0IG5ld0FjdGlvbiA9IE9iamVjdC5hc3NpZ24oe30sIGFjdGlvbiwge25hbWV9KVxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnbmV3QWN0aW9uJywgbmV3QWN0aW9uKVxuXHRcdFx0XHRcdFx0Y3RybC5tb2RlbC5hY3Rpb25zLnB1c2gobmV3QWN0aW9uKVxuXHRcdFx0XHRcdFx0Y3RybC51cGRhdGUoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZGF0YS5jbWQgPT0gJ2VkaXQnKSB7XG5cdFx0XHRcdFx0XHRsZXQgeyBzdGVwcyB9ID0gYWN0aW9uXG5cdFx0XHRcdFx0XHRpZiAoIUFycmF5LmlzQXJyYXkoc3RlcHMpKSB7XG5cdFx0XHRcdFx0XHRcdHN0ZXBzID0gW2FjdGlvbl1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGNvbnN0IGF2YWlsYWJsZUFjdGlvbnMgPSBjdHJsLm1vZGVsLmFjdGlvbnMubWFwKChlKSA9PiAgZS5uYW1lKVxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnYXZhaWxhYmxlQWN0aW9ucycsIGF2YWlsYWJsZUFjdGlvbnMpXG5cblx0XHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdhY3Rpb25DdHJsJywge1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogYWN0aW9uLm5hbWUsXG5cdFx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdFx0c3RlcHMsXG5cdFx0XHRcdFx0XHRcdFx0YXZhaWxhYmxlQWN0aW9uc1xuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRvblJldHVybjogZnVuY3Rpb24gKGRhdGEpIHtcblx0XHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblJldHVybicsIGRhdGEpXG5cdFx0XHRcdFx0XHRcdFx0Y3RybC5tb2RlbC5hY3Rpb25zW2lkeF0gPSB7IG5hbWU6IGFjdGlvbi5uYW1lLCBzdGVwczogZGF0YSB9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSXRlbUNsaWNrOiBmdW5jdGlvbiAoZXYpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJy5pdGVtJykuaW5kZXgoKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uSXRlbUNsaWNrJywgaWR4KVxuXHRcdFx0XHRcdGNvbnN0IGFjdGlvbiA9IGN0cmwubW9kZWwuYWN0aW9uc1tpZHhdXG5cdFx0XHRcdFx0aWYgKGlzRWRpdGlvbikge1xuXHRcdFx0XHRcdFx0YWN0aW9uU3J2LmV4ZWNBY3Rpb24oaHViRGV2aWNlcywgY3RybC5tb2RlbC5hY3Rpb25zLCBhY3Rpb24ubmFtZSwgMSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKGFjdGlvbi5uYW1lKVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGlmIChpc0VkaXRpb24pIHtcblx0XHRcdHRoaXMuZ2V0QnV0dG9ucyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRhZGRBY3Rpb246IHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnQWRkIEFjdGlvbicsXG5cdFx0XHRcdFx0XHRpY29uOiAnZmEgZmEtcGx1cycsXG5cdFx0XHRcdFx0XHRvbkNsaWNrOiBhc3luYyBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ0FkZCBhY3Rpb24nKVxuXHRcdFx0XHRcdFx0XHRjb25zdCBuYW1lID0gYXdhaXQgJCQudWkuc2hvd1Byb21wdCh7IGxhYmVsOiAnTmFtZScsIHRpdGxlOiAnQWRkIGFjdGlvbicgfSlcblx0XHRcdFx0XHRcdFx0aWYgKG5hbWUgPT0gbnVsbCkgcmV0dXJuXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGF2YWlsYWJsZUFjdGlvbnMgPSBjdHJsLm1vZGVsLmFjdGlvbnMubWFwKChlKSA9PiAgZS5uYW1lKVxuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdhdmFpbGFibGVBY3Rpb25zJywgYXZhaWxhYmxlQWN0aW9ucylcblx0XHRcdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2FjdGlvbkN0cmwnLCB7XG5cdFx0XHRcdFx0XHRcdFx0dGl0bGU6IG5hbWUsXG5cdFx0XHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0XHRcdHN0ZXBzOiBbe31dLFxuXHRcdFx0XHRcdFx0XHRcdFx0YXZhaWxhYmxlQWN0aW9uc1xuXHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0b25SZXR1cm46IGZ1bmN0aW9uIChkYXRhKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjdHJsLm1vZGVsLmFjdGlvbnMucHVzaCh7IG5hbWUsIHN0ZXBzOiBkYXRhIH0pXG5cdFx0XHRcdFx0XHRcdFx0XHRjdHJsLnVwZGF0ZSgpXG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0c2F2ZToge1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdTYXZlJyxcblx0XHRcdFx0XHRcdGljb246ICdmYSBmYS1jaGVjaycsXG5cdFx0XHRcdFx0XHRvbkNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoY3RybC5tb2RlbC5hY3Rpb25zKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiLy8gQHRzLWNoZWNrXG5cbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdjb2RlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcbiAgICA8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25SdW5cXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCI+UnVuPC9idXR0b24+XFxuXFxuPC9kaXY+XFxuPGRpdiBpZD1cXFwiYmxvY2tseURpdlxcXCI+PC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwibG9nUGFuZWxcXFwiIGJuLWh0bWw9XFxcImdldExvZ3NcXFwiPjwvZGl2Plxcblxcbjx4bWwgaWQ9XFxcInRvb2xib3hcXFwiIHN0eWxlPVxcXCJkaXNwbGF5OiBub25lO1xcXCI+XFxuICAgIDxjYXRlZ29yeSBuYW1lPVxcXCJMb2dpY1xcXCIgY2F0ZWdvcnlzdHlsZT1cXFwibG9naWNfY2F0ZWdvcnlcXFwiPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImNvbnRyb2xzX2lmXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxvZ2ljX2NvbXBhcmVcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibG9naWNfb3BlcmF0aW9uXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxvZ2ljX25lZ2F0ZVxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsb2dpY19ib29sZWFuXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxvZ2ljX3Rlcm5hcnlcXFwiPjwvYmxvY2s+XFxuICAgIDwvY2F0ZWdvcnk+XFxuICAgIDxjYXRlZ29yeSBuYW1lPVxcXCJMb29wXFxcIiBjYXRlZ29yeXN0eWxlPVxcXCJsb29wX2NhdGVnb3J5XFxcIj5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJjb250cm9sc19yZXBlYXRfZXh0XFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVElNRVNcXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjEwPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwiY29udHJvbHNfd2hpbGVVbnRpbFxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJjb250cm9sc19mb3JcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJGUk9NXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj4xPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVE9cXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjEwPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiQllcXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjE8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJjb250cm9sc19mb3JFYWNoXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImNvbnRyb2xzX2Zsb3dfc3RhdGVtZW50c1xcXCI+PC9ibG9jaz5cXG4gICAgPC9jYXRlZ29yeT5cXG4gICAgPGNhdGVnb3J5IG5hbWU9XFxcIk1hdGhcXFwiIGNhdGVnb3J5c3R5bGU9XFxcIm1hdGhfY2F0ZWdvcnlcXFwiPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcIm1hdGhfYXJpdGhtZXRpY1xcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJtYXRoX3NpbmdsZVxcXCI+XFxuICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk9QXFxcIj5ST09UPC9maWVsZD5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiTlVNXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj45PC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibWF0aF90cmlnXFxcIj5cXG4gICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiT1BcXFwiPlNJTjwvZmllbGQ+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIk5VTVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+NDU8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJtYXRoX2NvbnN0YW50XFxcIj5cXG4gICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiQ09OU1RBTlRcXFwiPlBJPC9maWVsZD5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibWF0aF9yYW5kb21faW50XFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiRlJPTVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlRPXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj4xMDA8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJtYXRoX3JvdW5kXFxcIj5cXG4gICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiT1BcXFwiPlJPVU5EPC9maWVsZD5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiTlVNXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj4zLjE8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgPC9jYXRlZ29yeT5cXG4gICAgPGNhdGVnb3J5IG5hbWU9XFxcIlRleHRcXFwiIGNhdGVnb3J5c3R5bGU9XFxcInRleHRfY2F0ZWdvcnlcXFwiPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcInRleHRcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwidGV4dF9wcmludFxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJ0ZXh0X2xlbmd0aFxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlZBTFVFXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJ0ZXh0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJURVhUXFxcIj5hYmM8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJ0ZXh0X2NoYW5nZUNhc2VcXFwiPlxcbiAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJDQVNFXFxcIj5VUFBFUkNBU0U8L2ZpZWxkPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJURVhUXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJ0ZXh0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJURVhUXFxcIj5hYmM8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJ0ZXh0X2FwcGVuZFxcXCI+XFxuICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlZBUlxcXCIgaWQ9XFxcIk1IdmVFJF4jWDcvY3wqUkEhcntJXFxcIj5pdGVtPC9maWVsZD5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVEVYVFxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwidGV4dFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVEVYVFxcXCIgLz5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwidGV4dF9qb2luXFxcIj5cXG4gICAgICAgICAgICA8bXV0YXRpb24gaXRlbXM9XFxcIjJcXFwiIC8+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcInRleHRfaW5kZXhPZlxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJ0ZXh0X2NoYXJBdFxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJ0ZXh0X2dldFN1YnN0cmluZ1xcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJ0ZXh0X3Byb21wdF9leHRcXFwiPlxcbiAgICAgICAgICAgIDxtdXRhdGlvbiB0eXBlPVxcXCJURVhUXFxcIiAvPlxcbiAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJUWVBFXFxcIj5URVhUPC9maWVsZD5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVEVYVFxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwidGV4dFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVEVYVFxcXCI+YWJjPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgIDwvY2F0ZWdvcnk+XFxuICAgIDxjYXRlZ29yeSBuYW1lPVxcXCJMaXN0c1xcXCIgY2F0ZWdvcnlzdHlsZT1cXFwibGlzdF9jYXRlZ29yeVxcXCI+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfY3JlYXRlX3dpdGhcXFwiPlxcbiAgICAgICAgICAgIDxtdXRhdGlvbiBpdGVtcz1cXFwiMFxcXCI+PC9tdXRhdGlvbj5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfY3JlYXRlX3dpdGhcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfcmVwZWF0XFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiTlVNXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj41PC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfbGVuZ3RoXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxpc3RzX2lzRW1wdHlcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfaW5kZXhPZlxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlZBTFVFXFxcIj5cXG4gICAgICAgICAgICAgICAgPGJsb2NrIHR5cGU9XFxcInZhcmlhYmxlc19nZXRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlZBUlxcXCI+bGlzdDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfZ2V0SW5kZXhcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJWQUxVRVxcXCI+XFxuICAgICAgICAgICAgICAgIDxibG9jayB0eXBlPVxcXCJ2YXJpYWJsZXNfZ2V0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJWQVJcXFwiPmxpc3Q8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxpc3RzX3NldEluZGV4XFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiTElTVFxcXCI+XFxuICAgICAgICAgICAgICAgIDxibG9jayB0eXBlPVxcXCJ2YXJpYWJsZXNfZ2V0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJWQVJcXFwiPmxpc3Q8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxpc3RzX2dldFN1Ymxpc3RcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJMSVNUXFxcIj5cXG4gICAgICAgICAgICAgICAgPGJsb2NrIHR5cGU9XFxcInZhcmlhYmxlc19nZXRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlZBUlxcXCI+bGlzdDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfc3BsaXRcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJERUxJTVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwidGV4dFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVEVYVFxcXCI+LDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxpc3RzX3NvcnRcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfcmV2ZXJzZVxcXCI+PC9ibG9jaz5cXG4gICAgPC9jYXRlZ29yeT5cXG4gICAgPGNhdGVnb3J5IG5hbWU9XFxcIlZhcmlhYmxlc1xcXCIgY3VzdG9tPVxcXCJWQVJJQUJMRVxcXCIgY2F0ZWdvcnlzdHlsZT1cXFwidmFyaWFibGVfY2F0ZWdvcnlcXFwiPjwvY2F0ZWdvcnk+XFxuICAgIDxjYXRlZ29yeSBuYW1lPVxcXCJGdW5jdGlvbnNcXFwiIGN1c3RvbT1cXFwiUFJPQ0VEVVJFXFxcIiBjYXRlZ29yeXN0eWxlPVxcXCJwcm9jZWR1cmVfY2F0ZWdvcnlcXFwiPjwvY2F0ZWdvcnk+XFxuICAgIDxjYXRlZ29yeSBuYW1lPVxcXCJNb3RvclxcXCIgY29sb3VyPVxcXCIzNTVcXFwiPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImNyZWF0ZV9tb3RvclxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJtb3Rvcl9wb3dlclxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlBPV0VSXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj4xMDA8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgPC9jYXRlZ29yeT5cXG4gICAgPGNhdGVnb3J5IG5hbWU9XFxcIlRhY2hvTW90b3JcXFwiIGNvbG91cj1cXFwiMzU1XFxcIj5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJjcmVhdGVfdGFjaG9fbW90b3JcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibW90b3Jfc3BlZWRcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJTUEVFRFxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTAwPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibW90b3Jfc3BlZWRfdGltZVxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlRJTUVcXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjEwMDA8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJTUEVFRFxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTAwPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibW90b3Jfc3BlZWRfZGVncmVlc1xcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIkRFR1JFRVNcXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjE4MDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlNQRUVEXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj4xMDA8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJtb3Rvcl9zcGVlZF9wb3NpdGlvblxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIkFOR0xFXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj4wPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiU1BFRURcXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjEwMDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcIm1vdG9yX3Jlc2V0X3Bvc2l0aW9uXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcIm1vdG9yX2dldF9zcGVlZFxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJtb3Rvcl9nZXRfcG9zaXRpb25cXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibW90b3JfZ2V0X2Fic29sdXRlcG9zaXRpb25cXFwiPjwvYmxvY2s+XFxuXFxuICAgIDwvY2F0ZWdvcnk+XFxuICAgIDxjYXRlZ29yeSBuYW1lPVxcXCJQYWlyTW90b3JcXFwiIGNvbG91cj1cXFwiMzU1XFxcIj5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJjcmVhdGVfcGFpcl9tb3RvclxcXCI+XFxuICAgICAgICAgICAgPEZJRUxEIG5hbWU9XFxcIlBPUlQyXFxcIj5CPC9GSUVMRD5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwicGFpcl9tb3Rvcl9zcGVlZFxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlNQRUVEMVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTAwPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiU1BFRUQyXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj4xMDA8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG5cXG5cXG4gICAgPC9jYXRlZ29yeT5cXG4gICAgPGNhdGVnb3J5IG5hbWU9XFxcIkh1YlxcXCIgY29sb3VyPVxcXCIzNTVcXFwiPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImh1Yl9jb2xvclxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJodWJfZ2V0X3RpbHRcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwiaHViX2dldF92b2x0YWdlXFxcIj48L2Jsb2NrPlxcblxcblxcbiAgICA8L2NhdGVnb3J5PlxcbiAgICA8Y2F0ZWdvcnkgbmFtZT1cXFwiU3lzdGVtXFxcIiBjb2xvdXI9XFxcIjM1NVxcXCI+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwic2xlZXBcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJUSU1FXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj4xMDAwPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgIDwvY2F0ZWdvcnk+XFxuXFxuPC94bWw+XCIsXG5cblx0ZGVwczogWydicmVpemJvdC5wYWdlcicsICdicmVpemJvdC5ibG9ja2x5aW50ZXJwcmV0b3InLCAnaHViJ10sXG5cblx0cHJvcHM6IHtcblx0XHRodWJEZXZpY2VzOiBudWxsLFxuXHRcdGNvZGU6IG51bGxcblx0fSxcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5CbG9ja2x5SW50ZXJwcmV0b3IuSW50ZXJmYWNlfSBibG9ja2x5SW50ZXJwcmV0b3Jcblx0ICogQHBhcmFtIHtIVUJ9IGh1YlxuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIsIGJsb2NrbHlJbnRlcnByZXRvciwgaHViKSB7XG5cblx0XHQvKipAdHlwZSB7QXJyYXk8SFVCLkh1YkRldmljZT59ICovXG5cdFx0Y29uc3QgaHViRGV2aWNlcyA9IHRoaXMucHJvcHMuaHViRGV2aWNlc1xuXG5cdFx0Y29uc3QgY29kZSA9IHRoaXMucHJvcHMuY29kZVxuXG5cdFx0Y29uc3QgZGVtb1dvcmtzcGFjZSA9IEJsb2NrbHkuaW5qZWN0KCdibG9ja2x5RGl2Jyxcblx0XHRcdHtcblx0XHRcdFx0bWVkaWE6ICcuLi9saWIvYmxvY2tseS9tZWRpYS8nLFxuXHRcdFx0XHR0b29sYm94OiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG9vbGJveCcpXG5cdFx0XHRcdC8vaG9yaXpvbnRhbExheW91dDogdHJ1ZSxcblx0XHRcdFx0Ly90b29sYm94UG9zaXRpb246ICdlbmQnXG5cdFx0XHR9XG5cdFx0KVxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLnNldExsb2dGdW5jdGlvbigodGV4dCkgPT4ge1xuXHRcdFx0Y3RybC5tb2RlbC5sb2dzLnB1c2godGV4dClcblx0XHRcdGN0cmwudXBkYXRlKClcblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gZ2V0SHViKGJsb2NrKSB7XG5cdFx0XHQvKipAdHlwZSB7c3RyaW5nfSAqL1xuXHRcdFx0Y29uc3QgaHViTmFtZSA9IGJsb2NrLmZpZWxkcy5IVUJcblx0XHRcdGNvbnN0IGh1YkRldmljZSA9IGh1YkRldmljZXMuZmluZChlID0+IGUubmFtZSA9PSBodWJOYW1lKVxuXHRcdFx0aWYgKGh1YkRldmljZSA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0dGhyb3cgYEh1YiAke2h1Yk5hbWV9IGlzIG5vdCBjb25uZWN0ZWRgXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gaHViRGV2aWNlXG5cdFx0fVxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnY3JlYXRlX3BhaXJfbW90b3InLCBhc3luYyAoYmxvY2spID0+IHtcblxuXHRcdFx0LyoqQHR5cGUge3N0cmluZ30gKi9cblx0XHRcdGNvbnN0IHBvcnROYW1lMSA9IGJsb2NrLmZpZWxkcy5QT1JUMVxuXG5cdFx0XHQvKipAdHlwZSB7c3RyaW5nfSAqL1xuXHRcdFx0Y29uc3QgcG9ydE5hbWUyID0gYmxvY2suZmllbGRzLlBPUlQyXG5cblx0XHRcdGNvbnN0IGh1YkRldmljZSA9IGdldEh1YihibG9jaylcblx0XHRcdGNvbnN0IG1vdG9yID0gYXdhaXQgaHViRGV2aWNlLmdldERibE1vdG9yKGh1Yi5Qb3J0TWFwW3BvcnROYW1lMV0sIGh1Yi5Qb3J0TWFwW3BvcnROYW1lMl0pXG5cblx0XHRcdHJldHVybiBtb3RvclxuXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ2NyZWF0ZV90YWNob19tb3RvcicsIGFzeW5jIChibG9jaykgPT4ge1xuXG5cdFx0XHQvKipAdHlwZSB7c3RyaW5nfSAqL1xuXHRcdFx0Y29uc3QgcG9ydE5hbWUgPSBibG9jay5maWVsZHMuUE9SVFxuXG5cdFx0XHRjb25zdCBodWJEZXZpY2UgPSBnZXRIdWIoYmxvY2spXG5cdFx0XHRjb25zdCBtb3RvciA9IGh1YkRldmljZS5nZXREZXZpY2UoaHViLlBvcnRNYXBbcG9ydE5hbWVdKVxuXHRcdFx0aWYgKCFodWIuaXNUYWNob01vdG9yKG1vdG9yKSkge1xuXHRcdFx0XHR0aHJvdyBgRGV2aWNlIGNvbm5lY3RlZCB0byBwb3J0ICcke3BvcnROYW1lfScgaXMgbm90IG9mIGEgVGFjaG9Nb3RvcmBcblx0XHRcdH1cblx0XHRcdHJldHVybiBtb3RvclxuXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ2NyZWF0ZV9tb3RvcicsIGFzeW5jIChibG9jaykgPT4ge1xuXG5cdFx0XHQvKipAdHlwZSB7c3RyaW5nfSAqL1xuXHRcdFx0Y29uc3QgcG9ydE5hbWUgPSBibG9jay5maWVsZHMuUE9SVFxuXG5cdFx0XHRjb25zdCBodWJEZXZpY2UgPSBnZXRIdWIoYmxvY2spXG5cdFx0XHRjb25zdCBtb3RvciA9IGh1YkRldmljZS5nZXREZXZpY2UoaHViLlBvcnRNYXBbcG9ydE5hbWVdKVxuXHRcdFx0aWYgKCFodWIuaXNNb3Rvcihtb3RvcikpIHtcblx0XHRcdFx0dGhyb3cgYERldmljZSBjb25uZWN0ZWQgdG8gcG9ydCAnJHtwb3J0TmFtZX0nIGlzIG5vdCBvZiBhIE1vdG9yYFxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG1vdG9yXG5cblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gZ2V0TW90b3IoYmxvY2spIHtcblx0XHRcdC8qKkB0eXBlIHtzdHJpbmd9ICovXG5cdFx0XHRjb25zdCB2YXJJZCA9IGJsb2NrLmZpZWxkcy5WQVIuaWRcblx0XHRcdC8qKkB0eXBlIHtIVUIuTW90b3J9ICovXG5cdFx0XHRjb25zdCBtb3RvciA9IGJsb2NrbHlJbnRlcnByZXRvci5nZXRWYXJWYWx1ZSh2YXJJZClcblx0XHRcdGlmICh0eXBlb2YgbW90b3IgIT0gJ29iamVjdCcgfHwgIWh1Yi5pc01vdG9yKG1vdG9yKSkge1xuXHRcdFx0XHRjb25zdCB2YXJOYW1lID0gYmxvY2tseUludGVycHJldG9yLmdldFZhck5hbWUodmFySWQpXG5cdFx0XHRcdHRocm93IGB2YXJpYWJsZSAnJHt2YXJOYW1lfScgaXMgbm90IG9mIHR5cGUgTW90b3JgXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbW90b3Jcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRUYWNob01vdG9yKGJsb2NrKSB7XG5cdFx0XHQvKipAdHlwZSB7c3RyaW5nfSAqL1xuXHRcdFx0Y29uc3QgdmFySWQgPSBibG9jay5maWVsZHMuVkFSLmlkXG5cdFx0XHQvKipAdHlwZSB7SFVCLlRhY2hvTW90b3J9ICovXG5cdFx0XHRjb25zdCBtb3RvciA9IGJsb2NrbHlJbnRlcnByZXRvci5nZXRWYXJWYWx1ZSh2YXJJZClcblx0XHRcdGlmICh0eXBlb2YgbW90b3IgIT0gJ29iamVjdCcgfHwgIWh1Yi5pc1RhY2hvTW90b3IobW90b3IpKSB7XG5cdFx0XHRcdGNvbnN0IHZhck5hbWUgPSBibG9ja2x5SW50ZXJwcmV0b3IuZ2V0VmFyTmFtZSh2YXJJZClcblx0XHRcdFx0dGhyb3cgYHZhcmlhYmxlICcke3Zhck5hbWV9JyBpcyBub3Qgb2YgdHlwZSBUYWNob01vdG9yYFxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG1vdG9yXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0UGFpck1vdG9yKGJsb2NrKSB7XG5cdFx0XHQvKipAdHlwZSB7c3RyaW5nfSAqL1xuXHRcdFx0Y29uc3QgdmFySWQgPSBibG9jay5maWVsZHMuVkFSLmlkXG5cdFx0XHQvKipAdHlwZSB7SFVCLkRvdWJsZU1vdG9yfSAqL1xuXHRcdFx0Y29uc3QgbW90b3IgPSBibG9ja2x5SW50ZXJwcmV0b3IuZ2V0VmFyVmFsdWUodmFySWQpXG5cdFx0XHRjb25zb2xlLmxvZygnbW90b3InLCBtb3Rvcilcblx0XHRcdGlmICh0eXBlb2YgbW90b3IgIT0gJ29iamVjdCcgfHwgIWh1Yi5pc0RvdWJsZU1vdG9yKG1vdG9yKSkge1xuXHRcdFx0XHRjb25zdCB2YXJOYW1lID0gYmxvY2tseUludGVycHJldG9yLmdldFZhck5hbWUodmFySWQpXG5cdFx0XHRcdHRocm93IGB2YXJpYWJsZSAnJHt2YXJOYW1lfScgaXMgbm90IG9mIHR5cGUgUGFpck1vdG9yYFxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG1vdG9yXG5cdFx0fVxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnbW90b3JfcG93ZXInLCBhc3luYyAoYmxvY2spID0+IHtcblxuXHRcdFx0LyoqQHR5cGUge251bWJlcn0gKi9cblx0XHRcdGNvbnN0IHBvd2VyID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5QT1dFUilcblxuXHRcdFx0Y29uc3QgbW90b3IgPSBnZXRNb3RvcihibG9jaylcblxuXHRcdFx0Y29uc29sZS5sb2coeyBwb3dlciB9KVxuXHRcdFx0YXdhaXQgbW90b3Iuc2V0UG93ZXIocG93ZXIpXG5cblx0XHR9KVxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnbW90b3Jfc3BlZWQnLCBhc3luYyAoYmxvY2spID0+IHtcblxuXHRcdFx0LyoqQHR5cGUge251bWJlcn0gKi9cblx0XHRcdGNvbnN0IHNwZWVkID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5TUEVFRClcblxuXHRcdFx0Y29uc3QgbW90b3IgPSBnZXRUYWNob01vdG9yKGJsb2NrKVxuXG5cdFx0XHRjb25zb2xlLmxvZyh7IHNwZWVkIH0pXG5cdFx0XHRhd2FpdCBtb3Rvci5zZXRTcGVlZChzcGVlZClcblxuXHRcdH0pXG5cblx0XHRibG9ja2x5SW50ZXJwcmV0b3IuYWRkQmxvY2tUeXBlKCdwYWlyX21vdG9yX3NwZWVkJywgYXN5bmMgKGJsb2NrKSA9PiB7XG5cblx0XHRcdC8qKkB0eXBlIHtudW1iZXJ9ICovXG5cdFx0XHRjb25zdCBzcGVlZDEgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLlNQRUVEMSlcblx0XHRcdC8qKkB0eXBlIHtudW1iZXJ9ICovXG5cdFx0XHRjb25zdCBzcGVlZDIgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLlNQRUVEMilcblxuXHRcdFx0Y29uc3QgbW90b3IgPSBnZXRQYWlyTW90b3IoYmxvY2spXG5cblx0XHRcdGNvbnNvbGUubG9nKHsgc3BlZWQxLCBzcGVlZDIsIG1vdG9yIH0pXG5cdFx0XHRhd2FpdCBtb3Rvci5zZXRTcGVlZChzcGVlZDEsIHNwZWVkMilcblxuXHRcdH0pXG5cblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ21vdG9yX3NwZWVkX3RpbWUnLCBhc3luYyAoYmxvY2spID0+IHtcblxuXHRcdFx0LyoqQHR5cGUge251bWJlcn0gKi9cblx0XHRcdGNvbnN0IHNwZWVkID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5TUEVFRClcblxuXHRcdFx0Y29uc3Qgd2FpdEZlZWRiYWNrID0gYmxvY2suZmllbGRzLldBSVRcblxuXHRcdFx0LyoqQHR5cGUge251bWJlcn0gKi9cblx0XHRcdGNvbnN0IHRpbWUgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLlRJTUUpXG5cblx0XHRcdGNvbnN0IG1vdG9yID0gZ2V0VGFjaG9Nb3RvcihibG9jaylcblxuXHRcdFx0Y29uc29sZS5sb2coeyBzcGVlZCwgdGltZSwgd2FpdEZlZWRiYWNrIH0pXG5cdFx0XHRhd2FpdCBtb3Rvci5zZXRTcGVlZEZvclRpbWUoc3BlZWQsIHRpbWUsIHdhaXRGZWVkYmFjaywgaHViLkJyYWtpbmdTdHlsZS5GTE9BVClcblxuXHRcdH0pXG5cblx0XHRibG9ja2x5SW50ZXJwcmV0b3IuYWRkQmxvY2tUeXBlKCdtb3Rvcl9zcGVlZF9kZWdyZWVzJywgYXN5bmMgKGJsb2NrKSA9PiB7XG5cblx0XHRcdGNvbnN0IG1vdG9yID0gZ2V0VGFjaG9Nb3RvcihibG9jaylcblxuXHRcdFx0LyoqQHR5cGUge251bWJlcn0gKi9cblx0XHRcdGNvbnN0IHNwZWVkID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5TUEVFRClcblxuXHRcdFx0Y29uc3Qgd2FpdEZlZWRiYWNrID0gYmxvY2suZmllbGRzLldBSVRcblxuXHRcdFx0LyoqQHR5cGUge251bWJlcn0gKi9cblx0XHRcdGNvbnN0IGRlZ3JlZXMgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLkRFR1JFRVMpXG5cblx0XHRcdGNvbnNvbGUubG9nKHsgc3BlZWQsIGRlZ3JlZXMsIHdhaXRGZWVkYmFjayB9KVxuXHRcdFx0YXdhaXQgbW90b3Iucm90YXRlRGVncmVlcyhkZWdyZWVzLCBzcGVlZCwgd2FpdEZlZWRiYWNrLCBodWIuQnJha2luZ1N0eWxlLkJSQUtFKVxuXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ21vdG9yX3NwZWVkX3Bvc2l0aW9uJywgYXN5bmMgKGJsb2NrKSA9PiB7XG5cblx0XHRcdGNvbnN0IG1vdG9yID0gZ2V0VGFjaG9Nb3RvcihibG9jaylcblxuXHRcdFx0LyoqQHR5cGUge251bWJlcn0gKi9cblx0XHRcdGNvbnN0IHNwZWVkID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5TUEVFRClcblxuXHRcdFx0Y29uc3Qgd2FpdEZlZWRiYWNrID0gYmxvY2suZmllbGRzLldBSVRcblxuXHRcdFx0LyoqQHR5cGUge251bWJlcn0gKi9cblx0XHRcdGNvbnN0IGFuZ2xlID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5BTkdMRSlcblxuXHRcdFx0Y29uc29sZS5sb2coeyBzcGVlZCwgYW5nbGUsIHdhaXRGZWVkYmFjayB9KVxuXHRcdFx0YXdhaXQgbW90b3IuZ290b0FuZ2xlKGFuZ2xlLCBzcGVlZCwgd2FpdEZlZWRiYWNrLCBodWIuQnJha2luZ1N0eWxlLkZMT0FUKVxuXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ21vdG9yX3Jlc2V0X3Bvc2l0aW9uJywgYXN5bmMgKGJsb2NrKSA9PiB7XG5cblx0XHRcdGNvbnN0IG1vdG9yID0gZ2V0VGFjaG9Nb3RvcihibG9jaylcblx0XHRcdGF3YWl0IG1vdG9yLnJlc2V0WmVybygpXG5cblx0XHR9KVxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnbW90b3JfZ2V0X3NwZWVkJywgYXN5bmMgKGJsb2NrKSA9PiB7XG5cblx0XHRcdGNvbnN0IG1vdG9yID0gZ2V0VGFjaG9Nb3RvcihibG9jaylcblx0XHRcdHJldHVybiBtb3Rvci5nZXRTcGVlZCgpXG5cblx0XHR9KVxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnbW90b3JfZ2V0X3Bvc2l0aW9uJywgYXN5bmMgKGJsb2NrKSA9PiB7XG5cblx0XHRcdGNvbnN0IG1vdG9yID0gZ2V0VGFjaG9Nb3RvcihibG9jaylcblx0XHRcdHJldHVybiBtb3Rvci5nZXRQb3NpdGlvbigpXG5cblx0XHR9KVxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnbW90b3JfZ2V0X2Fic29sdXRlcG9zaXRpb24nLCBhc3luYyAoYmxvY2spID0+IHtcblxuXHRcdFx0Y29uc3QgbW90b3IgPSBnZXRUYWNob01vdG9yKGJsb2NrKVxuXHRcdFx0cmV0dXJuIG1vdG9yLmdldEFic29sdXRlUG9zaXRpb24oKVxuXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ2h1Yl9jb2xvcicsIGFzeW5jIChibG9jaykgPT4ge1xuXG5cdFx0XHQvKipAdHlwZSB7c3RyaW5nfSAqL1xuXHRcdFx0Y29uc3QgY29sb3IgPSBibG9jay5maWVsZHMuQ09MT1JcblxuXHRcdFx0Y29uc3QgaHViRGV2aWNlID0gZ2V0SHViKGJsb2NrKVxuXHRcdFx0LyoqQHR5cGUge0hVQi5SZ2JMZWR9ICovXG5cdFx0XHRjb25zdCBsZWQgPSBodWJEZXZpY2UuZ2V0RGV2aWNlKGh1Yi5Qb3J0TWFwLkhVQl9MRUQpXG5cdFx0XHRhd2FpdCBsZWQuc2V0Q29sb3IoaHViLkNvbG9yW2NvbG9yXSlcblxuXHRcdH0pXG5cblx0XHRhc3luYyBmdW5jdGlvbiBnZXRIdWJWYWx1ZShibG9jaywgcG9ydElkLCBtb2RlKSB7XG5cdFx0XHRjb25zdCBodWJEZXZpY2UgPSBnZXRIdWIoYmxvY2spXG5cdFx0XHRjb25zdCBkZXZpY2UgPSBodWJEZXZpY2UuZ2V0RGV2aWNlKHBvcnRJZClcblx0XHRcdHJldHVybiBkZXZpY2UuZ2V0VmFsdWUobW9kZSlcblx0XHR9XG5cblx0XHRibG9ja2x5SW50ZXJwcmV0b3IuYWRkQmxvY2tUeXBlKCdodWJfZ2V0X3ZvbHRhZ2UnLCBhc3luYyAoYmxvY2spID0+IHtcblxuXHRcdFx0cmV0dXJuIGdldEh1YlZhbHVlKGJsb2NrLCBodWIuUG9ydE1hcC5WT0xUQUdFX1NFTlNPUiwgMClcblxuXHRcdH0pXG5cblx0XHRibG9ja2x5SW50ZXJwcmV0b3IuYWRkQmxvY2tUeXBlKCdodWJfZ2V0X3RpbHQnLCBhc3luYyAoYmxvY2spID0+IHtcblxuXHRcdFx0LyoqQHR5cGUge3N0cmluZ30gKi9cblx0XHRcdGNvbnN0IHR5cGUgPSBibG9jay5maWVsZHMuVFlQRVxuXG5cdFx0XHRjb25zdCB2YWx1ZSA9IGF3YWl0IGdldEh1YlZhbHVlKGJsb2NrLCBodWIuUG9ydE1hcC5USUxUX1NFTlNPUiwgaHViLkRldmljZU1vZGUuVElMVF9QT1MpXG5cdFx0XHRyZXR1cm4gdmFsdWVbdHlwZV1cblxuXHRcdH0pXG5cblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ3NsZWVwJywgYXN5bmMgKGJsb2NrKSA9PiB7XG5cdFx0XHRjb25zdCB0aW1lID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5USU1FKVxuXHRcdFx0Y29uc29sZS5sb2coeyB0aW1lIH0pXG5cdFx0XHRhd2FpdCAkJC51dGlsLndhaXQodGltZSlcblx0XHR9KVxuXG5cdFx0aWYgKGNvZGUgIT0gbnVsbCkge1xuXHRcdFx0Y29uc3Qgd29ya3NwYWNlID0gQmxvY2tseS5nZXRNYWluV29ya3NwYWNlKCk7XG5cdFx0XHRCbG9ja2x5LnNlcmlhbGl6YXRpb24ud29ya3NwYWNlcy5sb2FkKGNvZGUsIHdvcmtzcGFjZSk7XG5cdFx0fVxuXG5cdFx0dGhpcy5vbkJhY2sgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdvbkJhY2snKVxuXHRcdFx0cmV0dXJuIGdldENvZGUoKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldENvZGUoKSB7XG5cdFx0XHRyZXR1cm4gQmxvY2tseS5zZXJpYWxpemF0aW9uLndvcmtzcGFjZXMuc2F2ZShCbG9ja2x5LmdldE1haW5Xb3Jrc3BhY2UoKSlcblx0XHR9XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGxvZ3M6IFtdLFxuXHRcdFx0XHRnZXRMb2dzOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMubG9ncy5qb2luKCc8YnI+Jylcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblJ1bjogYXN5bmMgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblJ1bicpXG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGdldENvZGUoKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGxvZ3M6IFtdIH0pXG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGF3YWl0IGJsb2NrbHlJbnRlcnByZXRvci5zdGFydENvZGUoaW5mbylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgZSA9PSAnc3RyaW5nJykge1xuXHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyB0aXRsZTogJ0Vycm9yJywgY29udGVudDogZSB9KVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIi8vIEB0cy1jaGVja1xuXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnY29uZmlnQ3RybCcsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLXNob3c9XFxcIiFoYXNDb25maWdzXFxcIiBjbGFzcz1cXFwibWVzc2FnZVxcXCI+XFxuICAgIE5vIGNvbmZpZ3VyYXRpb25zIGRlZmluZWRcXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCIgYm4tc2hvdz1cXFwiaGFzQ29uZmlnc1xcXCI+XFxuICAgIDxkaXYgYm4tZWFjaD1cXFwiY29uZmlnc1xcXCIgY2xhc3M9XFxcIml0ZW1zXFxcIiBibi1ldmVudD1cXFwiY2xpY2suaXRlbTogb25JdGVtQ2xpY2ssIGNvbnRleHRtZW51Y2hhbmdlLml0ZW06b25JdGVtQ29udGV4dE1lbnVcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwidzMtY2FyZC0yIGl0ZW1cXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIGJuLWRhdGE9XFxcIntcXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7XFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlOiB7bmFtZTogXFwnUmVtb3ZlXFwnLCBpY29uOiBcXCdmYXMgZmEtdHJhc2gtYWx0XFwnfVxcbiAgICAgICAgICAgICAgICAgICAgfVxcbiAgICAgICAgICAgICAgICB9XFxcIj5cXG4gICAgICAgICAgICA8ZGl2PlxcbiAgICAgICAgICAgICAgICA8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5uYW1lXFxcIj48L3N0cm9uZz5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnBhZ2VyJywgJ2JyZWl6Ym90Lmh0dHAnXSxcblxuXHRwcm9wczoge1xuXHRcdGN1cnJlbnRDb25maWc6ICcnXG5cdH0sXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXIgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuSHR0cC5JbnRlcmZhY2V9IGh0dHBcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHBhZ2VyLCBodHRwKSB7XG5cblx0XHQvL2NvbnNvbGUubG9nKCdwcm9wcycsIHRoaXMucHJvcHMpXG5cblx0XHRjb25zdCB7Y3VycmVudENvbmZpZ30gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGNvbmZpZ3M6IFtdLFxuXHRcdFx0XHRoYXNDb25maWdzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5jb25maWdzLmxlbmd0aCA+IDBcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkl0ZW1Db250ZXh0TWVudTogYXN5bmMgZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJy5pdGVtJykuaW5kZXgoKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uSXRlbUNvbnRleHRNZW51JywgaWR4LCBkYXRhKVxuXHRcdFx0XHRcdGNvbnN0IGNvbmZpZyA9IGN0cmwubW9kZWwuY29uZmlnc1tpZHhdXG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdkZWxldGUnKSB7XG5cdFx0XHRcdFx0XHRpZiAoY29uZmlnLm5hbWUgPT0gY3VycmVudENvbmZpZykge1xuXHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe2NvbnRlbnQ6ICdDYW5ub3QgZGVsZXRlIGFjdGl2ZSBjb25maWcnLCB0aXRsZTogJ1dhcm5pbmcnfSlcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRhd2FpdCBodHRwLnBvc3QoJy9kZWxldGUnLCBjb25maWcpXG5cdFx0XHRcdFx0XHRcdGxvYWRDb25maWcoKVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0fSxcbiAgICAgICAgICAgICAgICBvbkl0ZW1DbGljazogZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnLml0ZW0nKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uSXRlbUNsaWNrJywgaWR4KVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb25maWcgPSBjdHJsLm1vZGVsLmNvbmZpZ3NbaWR4XVxuXHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoY29uZmlnKVxuXG5cbiAgICAgICAgICAgICAgICB9XHRcblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gbG9hZENvbmZpZygpIHtcblx0XHRcdGNvbnN0IGNvbmZpZ3MgPSBhd2FpdCBodHRwLmdldCgnLycpXG5cdFx0XHRjb25zb2xlLmxvZyh7Y29uZmlnc30pXG5cdFx0XHRjdHJsLnNldERhdGEoe2NvbmZpZ3N9KVxuXHRcdH1cblxuXHRcdGxvYWRDb25maWcoKVxuXG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiLy8gQHRzLWNoZWNrXG5cbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdodWJpbmZvJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInNjcm9sbEJhclxcXCI+XFxuICAgIDxoMT5FeHRlcm5hbCBEZXZpY2VzPC9oMT5cXG4gICAgPHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZS1hbGxcXFwiPlxcbiAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgIDx0cj5cXG4gICAgICAgICAgICAgICAgPHRoPlBvcnQ8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+RGV2aWNlIFR5cGU8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+QWN0aW9uPC90aD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90aGVhZD5cXG4gICAgICAgIDx0Ym9keSBibi1lYWNoPVxcXCJleHRlcm5hbERldmljZXNcXFwiIGJuLWV2ZW50PVxcXCJcXG4gICAgICAgICAgICBtb3VzZWRvd24ubW90b3JNb3VzZUFjdGlvbjogb25Nb3VzZVVwLCBcXG4gICAgICAgICAgICBtb3VzZXVwLm1vdG9yTW91c2VBY3Rpb246b25Nb3VzZURvd24sIFxcbiAgICAgICAgICAgIGNsaWNrLm1vdG9yQWN0aW9uOm9uTW90b3JBY3Rpb24sIFxcbiAgICAgICAgICAgIGNsaWNrLmxlZEFjdGlvbjogb25MZWRBY3Rpb24sXFxuICAgICAgICAgICAgY2xpY2sucG9ydEluZm86IG9uSW5mbzIsIFxcbiAgICAgICAgICAgIGNsaWNrLmNhbGlicmF0ZTpvbkNhbGlicmF0ZVxcXCI+XFxuICAgICAgICAgICAgPHRyPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLm5hbWVcXFwiPjwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkudHlwZVxcXCI+PC90ZD5cXG4gICAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gYm4taWY9XFxcImlzTW90b3JcXFwiIGNsYXNzPVxcXCJzcGFuQnV0dG9uc1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwidzMtYnRuIHczLWdyZWVuIG1vdG9yTW91c2VBY3Rpb25cXFwiIGRhdGEtYWN0aW9uPVxcXCJmb3J3YXJkXFxcIj5GV0Q8L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJ3My1idG4gdzMtZ3JlZW4gbW90b3JNb3VzZUFjdGlvblxcXCIgZGF0YS1hY3Rpb249XFxcImJhY2t3YXJkXFxcIj5CS1dEPC9idXR0b24+XFxuICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBibi1pZj1cXFwiaXNUYWNob01vdG9yXFxcIiBjbGFzcz1cXFwic3BhbkJ1dHRvbnNcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcInczLWJ0biB3My1ncmVlbiBtb3RvckFjdGlvblxcXCIgZGF0YS1hY3Rpb249XFxcInJlc2V0XFxcIj5SRVNFVDwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcInczLWJ0biB3My1ncmVlbiBtb3RvckFjdGlvblxcXCIgZGF0YS1hY3Rpb249XFxcImdvemVyb1xcXCI+R08gWkVSTzwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gYm4taWY9XFxcImlzTGVkXFxcIiBjbGFzcz1cXFwic3BhbkJ1dHRvbnNcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcInczLWJ0biB3My1ncmVlbiBsZWRBY3Rpb25cXFwiIGRhdGEtYWN0aW9uPVxcXCJvblxcXCI+T048L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJ3My1idG4gdzMtZ3JlZW4gbGVkQWN0aW9uXFxcIiBkYXRhLWFjdGlvbj1cXFwib2ZmXFxcIj5PRkY8L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cXG5cXG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcInczLWJ0biB3My1ibHVlIHBvcnRJbmZvXFxcIj5NT0RFPC9idXR0b24+XFxuICAgICAgICAgICAgICAgIDwvdGQ+XFxuXFxuICAgICAgICAgICAgPC90cj5cXG5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+XFxuICAgIDxoMT5JbnRlcm5hbCBEZXZpY2VzPC9oMT5cXG4gICAgPHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZS1hbGxcXFwiPlxcbiAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgIDx0cj5cXG4gICAgICAgICAgICAgICAgPHRoPlBvcnQgSUQ8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+RGV2aWNlIFR5cGU8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+QWN0aW9uPC90aD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90aGVhZD5cXG4gICAgICAgIDx0Ym9keSBibi1lYWNoPVxcXCJpbnRlcm5hbERldmljZXNcXFwiIGJuLWV2ZW50PVxcXCJjbGljay53My1idG46IG9uSW5mb1xcXCI+XFxuICAgICAgICAgICAgPHRyPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLnBvcnRJZFxcXCI+PC90ZD5cXG4gICAgICAgICAgICAgICAgPHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS50eXBlXFxcIj48L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCI+TU9ERTwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgIDwvdHI+XFxuXFxuICAgICAgICA8L3Rib2R5PlxcbiAgICA8L3RhYmxlPjwvZGl2PlwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInLCAnaHViJ10sXG5cblx0cHJvcHM6IHtcblx0XHRodWJEZXZpY2U6IG51bGxcblx0fSxcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcblx0ICogQHBhcmFtIHtIVUJ9IGh1YlxuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIsIGh1Yikge1xuXG5cdFx0LyoqQHR5cGUge0hVQi5IdWJEZXZpY2V9ICovXG5cdFx0Y29uc3QgaHViRGV2aWNlID0gdGhpcy5wcm9wcy5odWJEZXZpY2VcblxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gaW5pdERldmljZXMoKSB7XG5cdFx0XHRjb25zdCBkZXZpY2VzID0gaHViRGV2aWNlLmdldEh1YkRldmljZXMoKVxuXHRcdFx0Y29uc29sZS5sb2coJ2RldmljZXMnLCBkZXZpY2VzKVxuXG5cdFx0XHRjb25zdCBpbnRlcm5hbERldmljZXMgPSBbXVxuXHRcdFx0Y29uc3QgZXh0ZXJuYWxEZXZpY2VzID0gW11cblxuXHRcdFx0Zm9yIChjb25zdCBkZXZpY2Ugb2YgZGV2aWNlcykge1xuXHRcdFx0XHRjb25zdCB7IHBvcnRJZCwgdHlwZSwgbmFtZSB9ID0gZGV2aWNlXG5cdFx0XHRcdGlmIChwb3J0SWQgPCA1MCkge1xuXHRcdFx0XHRcdGNvbnN0IGluZm8gPSB7IG5hbWUsIHBvcnRJZCwgdHlwZSB9XG5cdFx0XHRcdFx0ZXh0ZXJuYWxEZXZpY2VzLnB1c2goaW5mbylcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRpbnRlcm5hbERldmljZXMucHVzaCh7XG5cdFx0XHRcdFx0XHRwb3J0SWQsXG5cdFx0XHRcdFx0XHR0eXBlXG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGN0cmwuc2V0RGF0YSh7IGludGVybmFsRGV2aWNlcywgZXh0ZXJuYWxEZXZpY2VzIH0pXG5cdFx0fVxuXG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge251bWJlcn0gcG9ydElkIFxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBkZXZpY2VUeXBlTmFtZVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIG9wZW5JbmZvUGFnZShwb3J0SWQsIGRldmljZVR5cGVOYW1lKSB7XG5cdFx0XHRwYWdlci5wdXNoUGFnZSgnaW5mbycsIHtcblx0XHRcdFx0dGl0bGU6IGRldmljZVR5cGVOYW1lLFxuXHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdHBvcnRJZCxcblx0XHRcdFx0XHRodWJEZXZpY2Vcblx0XHRcdFx0fVxuXHRcdFx0fSlcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge0pRdWVyeTxIVE1MRWxlbWVudD59IGVsdCBcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBnZXRFeHRlcm5hbFBvcnRJZChlbHQpIHtcblx0XHRcdGNvbnN0IGlkeCA9IGVsdC5jbG9zZXN0KCd0cicpLmluZGV4KClcblx0XHRcdHJldHVybiBjdHJsLm1vZGVsLmV4dGVybmFsRGV2aWNlc1tpZHhdLnBvcnRJZFxuXG5cdFx0fVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gYXR0YWNoQ2JrKGRhdGEpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdhdHRhY2gnLCBkYXRhKVxuXHRcdFx0Y29uc3QgeyBwb3J0SWQsIG5hbWUsIHR5cGUgfSA9IGRhdGFcblx0XHRcdGNvbnN0IGluZm8gPSB7IHBvcnRJZCwgbmFtZSwgdHlwZSB9XG5cdFx0XHRjdHJsLm1vZGVsLmV4dGVybmFsRGV2aWNlcy5wdXNoKGluZm8pXG5cdFx0XHRjdHJsLnVwZGF0ZSgpXG5cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBkZXRhY2hDYmsoZGF0YSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2RldGFjaCcsIGRhdGEpXG5cdFx0XHRjb25zdCBpZHggPSBjdHJsLm1vZGVsLmV4dGVybmFsRGV2aWNlcy5maW5kSW5kZXgoKGRldikgPT4gZGV2LnBvcnRJZCA9PSBkYXRhLnBvcnRJZClcblx0XHRcdC8vY29uc29sZS5sb2coJ2lkeCcsIGlkeClcblx0XHRcdGN0cmwubW9kZWwuZXh0ZXJuYWxEZXZpY2VzLnNwbGljZShpZHgsIDEpXG5cdFx0XHRjdHJsLnVwZGF0ZSgpXG5cblx0XHR9XG5cblx0XHRodWJEZXZpY2Uub24oJ2F0dGFjaCcsIGF0dGFjaENiaylcblx0XHRodWJEZXZpY2Uub24oJ2RldGFjaCcsIGRldGFjaENiaylcblxuXHRcdHRoaXMuZGlzcG9zZSA9IGFzeW5jIGZ1bmN0aW9uICgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdodWJJbmZvIGRpc3Bvc2UnKVxuXHRcdFx0aHViRGV2aWNlLm9mZignYXR0YWNoJywgYXR0YWNoQ2JrKVxuXHRcdFx0aHViRGV2aWNlLm9mZignZGV0YWNoJywgZGV0YWNoQ2JrKVxuXG5cblx0XHR9XG5cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0aW50ZXJuYWxEZXZpY2VzOiBbXSxcblx0XHRcdFx0ZXh0ZXJuYWxEZXZpY2VzOiBbXSxcblx0XHRcdFx0aXNNb3RvcjogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGh1Yi5pc01vdG9yKGh1YkRldmljZS5nZXREZXZpY2Uoc2NvcGUuJGkucG9ydElkKSlcblx0XHRcdFx0fSxcblx0XHRcdFx0aXNMZWQ6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBodWIuaXNMZWQoaHViRGV2aWNlLmdldERldmljZShzY29wZS4kaS5wb3J0SWQpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRpc1RhY2hvTW90b3I6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBodWIuaXNUYWNob01vdG9yKGh1YkRldmljZS5nZXREZXZpY2Uoc2NvcGUuJGkucG9ydElkKSlcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbk1vdG9yQWN0aW9uOiBhc3luYyBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uc3QgcG9ydElkID0gZ2V0RXh0ZXJuYWxQb3J0SWQoJCh0aGlzKSlcblx0XHRcdFx0XHRjb25zdCBhY3Rpb24gPSAkKHRoaXMpLmRhdGEoJ2FjdGlvbicpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uTW90b3JBY3Rpb24nLCBwb3J0SWQsIGFjdGlvbilcblx0XHRcdFx0XHRjb25zdCBtb3RvciA9IGF3YWl0IGh1YkRldmljZS5nZXRUYWNob01vdG9yKHBvcnRJZClcblx0XHRcdFx0XHRzd2l0Y2ggKGFjdGlvbikge1xuXHRcdFx0XHRcdFx0Y2FzZSAncmVzZXQnOlxuXHRcdFx0XHRcdFx0XHRtb3Rvci5yZXNldFplcm8oKVxuXHRcdFx0XHRcdFx0XHRicmVha1xuXHRcdFx0XHRcdFx0Y2FzZSAnZ296ZXJvJzpcblx0XHRcdFx0XHRcdFx0bW90b3IuZ290b0FuZ2xlKDAsIDUwLCBmYWxzZSlcblxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkxlZEFjdGlvbjogYXN5bmMgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IHBvcnRJZCA9IGdldEV4dGVybmFsUG9ydElkKCQodGhpcykpXG5cdFx0XHRcdFx0Y29uc3QgYWN0aW9uID0gJCh0aGlzKS5kYXRhKCdhY3Rpb24nKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkxlZEFjdGlvbicsIHBvcnRJZCwgYWN0aW9uKVxuXHRcdFx0XHRcdGNvbnN0IGxlZCA9IGF3YWl0IGh1YkRldmljZS5nZXRMZWQocG9ydElkKVxuXHRcdFx0XHRcdGxlZC5zZXRCcmlnaHRuZXNzKChhY3Rpb24gPT0gJ29uJyA/IDEwMCA6IDApKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNhbGlicmF0ZTogYXN5bmMgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IHBvcnRJZCA9IGdldEV4dGVybmFsUG9ydElkKCQodGhpcykpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ2FsaWJyYXRlJywgcG9ydElkKVxuXHRcdFx0XHRcdGNvbnN0IG1vdG9yID0gYXdhaXQgaHViRGV2aWNlLmdldE1vdG9yKHBvcnRJZClcblx0XHRcdFx0XHRhd2FpdCBtb3Rvci5jYWxpYnJhdGUoKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbk1vdXNlVXA6IGFzeW5jIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbk1vdXNlVXAnKVxuXHRcdFx0XHRcdGNvbnN0IGFjdGlvbiA9ICQodGhpcykuZGF0YSgnYWN0aW9uJylcblx0XHRcdFx0XHRjb25zdCBwb3J0SWQgPSBnZXRFeHRlcm5hbFBvcnRJZCgkKHRoaXMpKVxuXHRcdFx0XHRcdGNvbnN0IG1vdG9yID0gYXdhaXQgaHViRGV2aWNlLmdldE1vdG9yKHBvcnRJZClcblx0XHRcdFx0XHRzd2l0Y2ggKGFjdGlvbikge1xuXHRcdFx0XHRcdFx0Y2FzZSAnZm9yd2FyZCc6XG5cdFx0XHRcdFx0XHRcdG1vdG9yLnNldFBvd2VyKDEwMClcblx0XHRcdFx0XHRcdFx0YnJlYWtcblx0XHRcdFx0XHRcdGNhc2UgJ2JhY2t3YXJkJzpcblx0XHRcdFx0XHRcdFx0bW90b3Iuc2V0UG93ZXIoLTEwMClcblx0XHRcdFx0XHRcdFx0YnJlYWtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTW91c2VEb3duOiBhc3luYyBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Nb3VzZURvd24nKVxuXHRcdFx0XHRcdGNvbnN0IHBvcnRJZCA9IGdldEV4dGVybmFsUG9ydElkKCQodGhpcykpXG5cdFx0XHRcdFx0Y29uc3QgbW90b3IgPSBhd2FpdCBodWJEZXZpY2UuZ2V0TW90b3IocG9ydElkKVxuXHRcdFx0XHRcdG1vdG9yLnNldFBvd2VyKDApXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSW5mbzogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3QgeyBwb3J0SWQsIGRldmljZVR5cGVOYW1lIH0gPSBjdHJsLm1vZGVsLmludGVybmFsRGV2aWNlc1tpZHhdXG5cdFx0XHRcdFx0b3BlbkluZm9QYWdlKHBvcnRJZCwgZGV2aWNlVHlwZU5hbWUpXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25JbmZvMjogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3QgeyBwb3J0SWQsIGRldmljZVR5cGVOYW1lIH0gPSBjdHJsLm1vZGVsLmV4dGVybmFsRGV2aWNlc1tpZHhdXG5cdFx0XHRcdFx0b3BlbkluZm9QYWdlKHBvcnRJZCwgZGV2aWNlVHlwZU5hbWUpXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRpbml0RGV2aWNlcygpXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIvLyBAdHMtY2hlY2tcblxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2dhbWVwYWQnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdj5cXG4gICAgPGgyIGJuLXRleHQ9XFxcImlkXFxcIj48L2gyPlxcbjwvZGl2PlxcblxcbjxoMz5BeGVzPC9oMz5cXG48ZGl2PlxcbiAgICA8dGFibGUgY2xhc3M9XFxcInczLXRhYmxlLWFsbCBheGVUYWJsZVxcXCI+XFxuICAgICAgICA8dGhlYWQ+XFxuICAgICAgICAgICAgPHRyPlxcbiAgICAgICAgICAgICAgICA8dGg+QXhlPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPkFjdGlvbjwvdGg+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGhlYWQ+XFxuICAgICAgICA8dGJvZHkgYm4tZWFjaD1cXFwiYXhlc1xcXCIgYm4tYmluZD1cXFwiYXhlc1xcXCIgYm4taW5kZXg9XFxcImlkeFxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLml0ZW06IG9uQXhlQ2xpY2tcXFwiPlxcbiAgICAgICAgICAgIDx0cj5cXG4gICAgICAgICAgICAgICAgPHRkIGJuLXRleHQ9XFxcImdldEF4ZUxhYmVsXFxcIj48L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGJuLXRleHQ9XFxcIiRzY29wZS4kaS5hY3Rpb25cXFwiIGNsYXNzPVxcXCJpdGVtXFxcIj48L2Rpdj5cXG4gICAgICAgICAgICAgICAgPC90ZD4gICAgICAgICAgICAgICAgXFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+XFxuPC9kaXY+XFxuXFxuPGgzPkJ1dHRvbnM8L2gzPlxcbjxkaXYgY2xhc3M9XFxcImNvbW1hbmRUYWJsZVxcXCI+XFxuICAgIDx0YWJsZSBjbGFzcz1cXFwidzMtdGFibGUtYWxsXFxcIj5cXG4gICAgICAgIDx0aGVhZD5cXG4gICAgICAgICAgICA8dHI+XFxuICAgICAgICAgICAgICAgIDx0aD5CdXR0b248L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+RG93bjwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5VcDwvdGg+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGhlYWQ+XFxuICAgICAgICA8dGJvZHkgYm4tZWFjaD1cXFwiYnV0dG9uc1xcXCIgYm4tYmluZD1cXFwiYnV0dG9uc1xcXCIgYm4taW5kZXg9XFxcImlkeFxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLml0ZW06IG9uQnV0dG9uQ2xpY2tcXFwiPlxcbiAgICAgICAgICAgIDx0cj5cXG4gICAgICAgICAgICAgICAgPHRkIGJuLXRleHQ9XFxcImdldEJ1dHRvbkxhYmVsXFxcIj48L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGJuLXRleHQ9XFxcIiRzY29wZS4kaS5kb3duXFxcIiBjbGFzcz1cXFwiaXRlbVxcXCIgZGF0YS1jbWQ9XFxcImRvd25cXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLnVwXFxcIiBjbGFzcz1cXFwiaXRlbVxcXCIgZGF0YS1jbWQ9XFxcInVwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICA8L3RkPlxcblxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICA8L3Rib2R5PlxcbiAgICA8L3RhYmxlPlxcbjwvZGl2PlwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInLCAnYnJlaXpib3QuZ2FtZXBhZCddLFxuXG5cdHByb3BzOiB7XG5cdFx0bWFwcGluZzogbnVsbCxcblx0XHRhY3Rpb25zOiBudWxsXG5cdH0sXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXIgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuR2FtZXBhZC5JbnRlcmZhY2V9IGdhbWVwYWRcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHBhZ2VyLCBnYW1lcGFkKSB7XG5cblx0XHRjb25zdCB7bWFwcGluZywgYWN0aW9uc30gPSB0aGlzLnByb3BzXG5cdFx0Y29uc29sZS5sb2codGhpcy5wcm9wcylcblxuXHRcdGxldCBheGVzID0gW11cblx0XHRsZXQgYnV0dG9ucyA9IFtdXG5cblx0XHRjb25zdCBpbmZvID0gZ2FtZXBhZC5nZXRHYW1lcGFkcygpWzBdXG5cdFx0Ly9jb25zb2xlLmxvZyh7IGluZm8gfSlcblxuXHRcdGlmIChtYXBwaW5nICE9IG51bGwpIHtcblx0XHRcdGF4ZXMgPSBtYXBwaW5nLmF4ZXNcblx0XHRcdGJ1dHRvbnMgPSBtYXBwaW5nLmJ1dHRvbnNcblx0XHR9XG5cblx0XHRpZiAoYXhlcy5sZW5ndGggPT0gMCkge1xuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBpbmZvLmF4ZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0YXhlcy5wdXNoKHsgYWN0aW9uOiAnTm9uZScgfSlcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoYnV0dG9ucy5sZW5ndGggPT0gMCkge1x0XG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGluZm8uYnV0dG9ucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRidXR0b25zLnB1c2goeyB1cDogJ05vbmUnLCBkb3duOiAnTm9uZScgfSlcblx0XHRcdH1cblx0XHR9XG5cblx0XHRcblx0XHRmdW5jdGlvbiBvbkdhbWVwYWRBeGUoZGF0YSkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnYXhlJywgZGF0YSlcblx0XHRcdGNvbnN0IHsgdmFsdWUsIGlkIH0gPSBkYXRhXG5cdFx0XHRpZiAodmFsdWUgIT0gMCkge1xuXHRcdFx0XHRheGVzRWx0LmZpbmQoJ3RyJykuZXEoaWQpLmZpbmQoJ3RkJykuZXEoMCkuYWRkQ2xhc3MoJ3ByZXNzZWQnKVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGF4ZXNFbHQuZmluZCgndHInKS5lcShpZCkuZmluZCgndGQnKS5lcSgwKS5yZW1vdmVDbGFzcygncHJlc3NlZCcpXG5cdFx0XHR9XG5cdFx0fSBcblxuXG5cdFx0ZnVuY3Rpb24gb25HYW1lcGFkQnV0dG9uRG93bihkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdidXR0b25Eb3duJywgZGF0YS5pZClcblx0XHRcdGJ1dHRvbnNFbHQuZmluZCgndHInKS5lcShkYXRhLmlkKS5maW5kKCd0ZCcpLmVxKDApLmFkZENsYXNzKCdwcmVzc2VkJylcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBvbkdhbWVwYWRCdXR0b25VcChkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdidXR0b25Eb3duJywgZGF0YS5pZClcblx0XHRcdGJ1dHRvbnNFbHQuZmluZCgndHInKS5lcShkYXRhLmlkKS5maW5kKCd0ZCcpLmVxKDApLnJlbW92ZUNsYXNzKCdwcmVzc2VkJylcblx0XHR9XG5cblx0XHRnYW1lcGFkLm9uKCdheGUnLCBvbkdhbWVwYWRBeGUpXG5cdFx0Z2FtZXBhZC5vbignYnV0dG9uRG93bicsIG9uR2FtZXBhZEJ1dHRvbkRvd24pXG5cdFx0Z2FtZXBhZC5vbignYnV0dG9uVXAnLCBvbkdhbWVwYWRCdXR0b25VcClcblxuXHRcdHRoaXMuZGlzcG9zZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2Rpc3Bvc2UnKVxuXHRcdFx0Z2FtZXBhZC5vZmYoJ2F4ZScsIG9uR2FtZXBhZEF4ZSlcblx0XHRcdGdhbWVwYWQub2ZmKCdidXR0b25Eb3duJywgb25HYW1lcGFkQnV0dG9uRG93bilcblx0XHRcdGdhbWVwYWQub2ZmKCdidXR0b25VcCcsIG9uR2FtZXBhZEJ1dHRvblVwKVxuXHRcblx0XHR9XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGlkOiBpbmZvLmlkLFxuXHRcdFx0XHRheGVzLFxuXHRcdFx0XHRidXR0b25zLFxuXHRcdFx0XHRnZXRCdXR0b25MYWJlbDogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gYEJ1dHRvbiAke3Njb3BlLmlkeCArIDF9YFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRBeGVMYWJlbDogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gYEF4ZSAke3Njb3BlLmlkeCArIDF9YFxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQnV0dG9uQ2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3QgY21kID0gJCh0aGlzKS5kYXRhKCdjbWQnKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uQnV0dG9uQ2xpY2snLCBpZHgsIGNtZClcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYWN0aW9uc0N0cmwnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ1NlbGVjdCBhbiBhY3Rpb24nLFxuXHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0aXNFZGl0aW9uOiBmYWxzZSxcblx0XHRcdFx0XHRcdFx0YWN0aW9uc1xuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbihhY3Rpb25OYW1lKSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coe2FjdGlvbk5hbWV9KVxuXHRcdFx0XHRcdFx0XHRjdHJsLm1vZGVsLmJ1dHRvbnNbaWR4XVtjbWRdID0gYWN0aW9uTmFtZVxuXHRcdFx0XHRcdFx0XHRjdHJsLnVwZGF0ZSgpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25BeGVDbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmluZGV4KClcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25BeGVDbGljaycsIGlkeClcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYWN0aW9uc0N0cmwnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ1NlbGVjdCBhbiBhY3Rpb24nLFxuXHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0aXNFZGl0aW9uOiBmYWxzZSxcblx0XHRcdFx0XHRcdFx0YWN0aW9uc1xuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbihhY3Rpb25OYW1lKSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coe2FjdGlvbk5hbWV9KVxuXHRcdFx0XHRcdFx0XHRjdHJsLm1vZGVsLmF4ZXNbaWR4XS5hY3Rpb24gPSBhY3Rpb25OYW1lXG5cdFx0XHRcdFx0XHRcdGN0cmwudXBkYXRlKClcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdC8qKkB0eXBlIHtKUXVlcnl9ICovXG5cdFx0Y29uc3QgYXhlc0VsdCA9IGN0cmwuc2NvcGUuYXhlc1xuXG5cdFx0LyoqQHR5cGUge0pRdWVyeX0gKi9cblx0XHRjb25zdCBidXR0b25zRWx0ID0gY3RybC5zY29wZS5idXR0b25zXG5cblx0XHRmdW5jdGlvbiBnZXRJbmZvKCkge1xuXHRcdFx0Y29uc3QgcmV0ID0ge1xuXHRcdFx0XHRpZDogaW5mby5pZCxcblx0XHRcdFx0YXhlczogW10sXG5cdFx0XHRcdGJ1dHRvbnM6IFtdXG5cdFx0XHR9XG5cdFx0XHRheGVzRWx0LmZpbmQoJ3RyJykuZWFjaChmdW5jdGlvbiAoaWR4KSB7XG5cdFx0XHRcdGNvbnN0IGFjdGlvbiA9ICQodGhpcykuZmluZCgnLml0ZW0nKS50ZXh0KClcblxuXHRcdFx0XHRyZXQuYXhlcy5wdXNoKHtcblx0XHRcdFx0XHRhY3Rpb25cblx0XHRcdFx0fSlcblx0XHRcdH0pXG5cblx0XHRcdGJ1dHRvbnNFbHQuZmluZCgndHInKS5lYWNoKGZ1bmN0aW9uIChpZHgpIHtcblx0XHRcdFx0Y29uc3QgdXAgPSAkKHRoaXMpLmZpbmQoJ1tkYXRhLWNtZD1cInVwXCJdJykudGV4dCgpXG5cdFx0XHRcdGNvbnN0IGRvd24gPSAkKHRoaXMpLmZpbmQoJ1tkYXRhLWNtZD1cImRvd25cIl0nKS50ZXh0KClcblxuXHRcdFx0XHRyZXQuYnV0dG9ucy5wdXNoKHtcblx0XHRcdFx0XHR1cCxcblx0XHRcdFx0XHRkb3duXG5cdFx0XHRcdH0pXG5cdFx0XHR9KVx0XHRcblx0XHRcdFxuXHRcdFx0Y29uc29sZS5sb2coe3JldH0pXG5cblx0XHRcdHJldHVybiByZXRcblx0XHR9XG5cblx0XHR0aGlzLmdldEJ1dHRvbnMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRjaGVjazoge1xuXHRcdFx0XHRcdGljb246ICdmYSBmYS1jaGVjaycsXG5cdFx0XHRcdFx0dGl0bGU6ICdBcHBseScsXG5cdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0cGFnZXIucG9wUGFnZShnZXRJbmZvKCkpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHR9XG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiLy8gQHRzLWNoZWNrXG5cbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdpbmZvJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXY+XFxuICAgIDxkaXY+XFxuICAgICAgICBDYXBhYmlsaXRpZXM6IDxzcGFuIGJuLXRleHQ9XFxcImNhcGFiaWxpdGllc1xcXCI+PC9zcGFuPlxcbiAgICA8L2Rpdj5cXG4gICAgPHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZS1hbGxcXFwiPlxcbiAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgIDx0cj5cXG4gICAgICAgICAgICAgICAgPHRoPk1PREU8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+Q0FQQUJJTElUSUVTPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPlVOSVQ8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+UkFXPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPlNJPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPlZBTFVFIEZPUk1BVDwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5WYWx1ZTwvdGg+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGhlYWQ+XFxuICAgICAgICA8dGJvZHkgYm4tZWFjaD1cXFwibW9kZXNcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5idG5HZXQ6IG9uQnRuR2V0XFxcIj5cXG4gICAgICAgICAgICA8dHI+XFxuICAgICAgICAgICAgICAgIDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkubmFtZVxcXCI+PC90ZD5cXG4gICAgICAgICAgICAgICAgPHRkIGJuLXRleHQ9XFxcImdldENhcGFiaWxpdGVzXFxcIj48L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLnVuaXRcXFwiPjwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5SQVcubWluXFxcIj48L3NwYW4+PGJyPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpLlJBVy5tYXhcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpLlBDVC5taW5cXFwiPjwvc3Bhbj48YnI+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuJGkuUENULm1heFxcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuJGkuU0kubWluXFxcIj48L3NwYW4+PGJyPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpLlNJLm1heFxcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgICAgICBkYXRhVHlwZTogPHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpLlZBTFVFX0ZPUk1BVC5kYXRhVHlwZVxcXCI+PC9zcGFuPjxicj5cXG4gICAgICAgICAgICAgICAgICAgIG51bVZhbHVlczogPHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpLlZBTFVFX0ZPUk1BVC5udW1WYWx1ZXNcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBibi1pZj1cXFwiaXNJbnB1dFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwidzMtYnRuIHczLWdyZWVuIGJ0bkdldFxcXCI+R2V0PC9idXR0b24+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4+PC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+XFxuPC9kaXY+XCIsXG5cblx0ZGVwczogWydicmVpemJvdC5wYWdlcicsICdodWInXSxcblxuXHRwcm9wczoge1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyIFxuXHQgKiBAcGFyYW0ge0hVQn0gaHViXG5cdCAqL1xuXHRpbml0OiBmdW5jdGlvbiAoZWx0LCBwYWdlciwgaHViKSB7XG5cblx0XHRjb25zdCB7IHBvcnRJZCB9ID0gdGhpcy5wcm9wc1xuXG5cdFx0LyoqQHR5cGUge0hVQi5IdWJEZXZpY2V9ICovXG5cdFx0Y29uc3QgaHViRGV2aWNlID0gdGhpcy5wcm9wcy5odWJEZXZpY2VcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0bW9kZXM6IFtdLFxuXHRcdFx0XHRjYXBhYmlsaXRpZXM6ICcnLFxuXHRcdFx0XHRpc0lucHV0OiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiAoc2NvcGUuJGkubW9kZSAmIDB4MSkgIT0gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRDYXBhYmlsaXRlczogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRpZiAoc2NvcGUuJGkubW9kZSA9PSAyKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJ09VVCdcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSBpZiAoc2NvcGUuJGkubW9kZSA9PSAxKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJ0lOJ1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIGlmIChzY29wZS4kaS5tb2RlID09IDMpIHtcblx0XHRcdFx0XHRcdHJldHVybiAnSU4vT1VUJ1xuXHRcdFx0XHRcdH1cdFx0XHRcdFxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQnRuR2V0OiBhc3luYyBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdGNvbnN0IG1vZGUgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkJ0bkdldCcsIG1vZGUpXG5cdFx0XHRcdFx0Y29uc3QgZGV2aWNlID0gaHViRGV2aWNlLmdldERldmljZShwb3J0SWQpXG5cdFx0XHRcdFx0Y29uc3QgdmFsdWVzID0gYXdhaXQgZGV2aWNlLmdldFZhbHVlKG1vZGUpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3ZhbHVlcycsIHZhbHVlcylcblx0XHRcdFx0XHQkKHRoaXMpLmNsb3Nlc3QoJ3RkJykuZmluZCgnc3BhbicpLnRleHQoSlNPTi5zdHJpbmdpZnkodmFsdWVzLCBudWxsLCA0KSlcblx0XHRcdFx0XHRcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRhc3luYyBmdW5jdGlvbiBpbml0KCkge1xuXHRcdFx0Y29uc3QgcG9ydEluZm8gPSBhd2FpdCBodWJEZXZpY2UuZ2V0UG9ydEluZm9ybWF0aW9uKHBvcnRJZClcblx0XHRcdGNvbnNvbGUubG9nKCdwb3J0SW5mbycsIHBvcnRJbmZvKVx0XG5cdFx0XHRjb25zdCB7IG1vZGVzLCBjYXBhYmlsaXRpZXMgfSA9IHBvcnRJbmZvXG5cdFx0XHRjdHJsLnNldERhdGEoeyBtb2RlcywgY2FwYWJpbGl0aWVzIH0pXG5cdFx0fVxuXG5cdFx0aW5pdCgpXG5cdH1cblxuXG59KTtcblxuXG5cblxuIl19
