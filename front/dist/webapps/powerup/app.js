(function () {

    Blockly.Blocks['object_getfield'] = {
        init: function () {
            this.appendValueInput("OBJECT")
                .setCheck(null)
                .appendField("in Object");
            this.appendDummyInput()
                .appendField("get field")
                .appendField(new Blockly.FieldTextInput(""), "FIELD");
            this.setInputsInline(true);
            this.setOutput(true, null);
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
        }
    };

    Blockly.Blocks['create_device'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("Device")
                .appendField("HUB")
                .appendField(new Blockly.FieldDropdown([["HUB1", "HUB1"], ["HUB2", "HUB2"]]), "HUB")
                .appendField("PORT")
                .appendField(new Blockly.FieldNumber(0, 0, Infinity, 1), "PORT");
            this.setOutput(true, "Device");
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
        }
    };

    Blockly.Blocks['device_getvalue'] = {
        init: function () {
            this.appendValueInput("DEVICE")
                .setCheck(null)
                .appendField("Device");
            this.appendDummyInput()
                .appendField("Mode")
                .appendField(new Blockly.FieldNumber(0, 0, Infinity, 1), "MODE")
                .appendField("getValue");
            this.appendDummyInput();
            this.setInputsInline(true);
            this.setOutput(true, null);
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
        }
    };

    Blockly.Blocks['wait_until_device'] = {
        init: function () {
            this.appendValueInput("DEVICE")
                .setCheck(null)
                .appendField("Wait until Device");
            this.appendDummyInput()
                .appendField("Mode")
                .appendField(new Blockly.FieldNumber(0, 0, Infinity, 1), "MODE");
            this.appendValueInput("TEST")
                .setCheck("Boolean")
                .appendField(new LexicalVariables.FieldParameterFlydown(
                    'value', true,
                    LexicalVariables.FieldFlydown.DISPLAY_BELOW), 'VAR')
                .appendField("Test");
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
            this.lexicalVarPrefix = 'counter'
        },
        blocksInScope: function () {
            const doBlock = this.getInputTargetBlock('TEST');
            //console.log('blocksInScope', doBlock)
            if (doBlock) {
                return [doBlock];
            } else {
                return [];
            }
        },
        declaredNames: function () {
            //console.log('declaredNames', this.getFieldValue('VAR'))

            return [this.getFieldValue('VAR')];
        },


        withLexicalVarsAndPrefix: function (child, proc) {
            //console.log('withLexicalVarsAndPrefix', { child, proc })
            if (this.getInputTargetBlock('TEST') == child) {
                const lexVar = this.getFieldValue('VAR');
                proc(lexVar, this.lexicalVarPrefix);
            }
        }
    };

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
            this.appendValueInput("VAR")
                .setCheck(null)
                .appendField("Pair Motor");
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


    Blockly.Blocks['hub_get_impact_count'] = {
        init: function () {
            this.appendDummyInput()
                .appendField("HUB")
                .appendField(new Blockly.FieldDropdown([["HUB1", "HUB1"], ["HUB2", "HUB2"]]), "HUB")
                .appendField("Impact Count")
            this.setOutput(true, "Number");
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
        }
    };

    Blockly.Blocks['hub_set_impact_count'] = {
        init: function () {
            this.appendValueInput("VAR")
                .setCheck("Number")
                .appendField("HUB")
                .appendField(new Blockly.FieldDropdown([["HUB1", "HUB1"], ["HUB2", "HUB2"]]), "HUB")
                .appendField("Impact Count");
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
        }
    };


    Blockly.Blocks['motor_speed_time'] = {
        init: function () {
            this.appendValueInput("VAR")
                .setCheck(null)
                .appendField("TachoMotor");
            this.appendValueInput("SPEED")
                .setCheck("Number")
                .appendField("Speed");
            this.appendValueInput("TIME")
                .setCheck("Number")
                .appendField("Time (sec)");
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

    Blockly.Blocks['motor_speed_degrees'] = {
        init: function () {
            this.appendValueInput("VAR")
                .setCheck(null)
                .appendField("TachoMotor");
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
            this.appendValueInput("VAR")
                .setCheck(null)
                .appendField("TachoMotor");
            this.appendValueInput("SPEED")
                .setCheck("Number")
                .appendField("Speed");
            this.appendValueInput("ANGLE")
                .setCheck("Number")
                .appendField("Angle");
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

    Blockly.Blocks['motor_speed_abs_position'] = {
        init: function () {
            this.appendValueInput("VAR")
                .setCheck(null)
                .appendField("TachoMotor");
            this.appendValueInput("SPEED")
                .setCheck("Number")
                .appendField("Speed");
            this.appendValueInput("ANGLE")
                .setCheck("Number")
                .appendField("Position");
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

    Blockly.Blocks['motor_reset_position'] = {
        init: function () {
            this.appendValueInput("VAR")
                .setCheck(null)
                .appendField("TachoMotor")
            this.appendDummyInput()
                .appendField("reset position")
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setInputsInline(true);
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
        }
    };

    Blockly.Blocks['motor_get_speed'] = {
        init: function () {
            this.appendValueInput("VAR")
                .appendField("TachoMotor");
            this.appendDummyInput()
                .appendField("Speed");
            this.setOutput(true, null);
            this.setInputsInline(true);
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
        }
    };

    Blockly.Blocks['motor_get_position'] = {
        init: function () {
            this.appendValueInput("VAR")
                .appendField("TachoMotor");
            this.appendDummyInput()
                .appendField("Position");
            this.setOutput(true, null);
            this.setInputsInline(true);
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
        }
    };

    Blockly.Blocks['motor_get_absoluteposition'] = {
        init: function () {
            this.appendValueInput("VAR")
                .appendField("TachoMotor");
            this.appendDummyInput()
                .appendField("Absolute Position");
            this.setOutput(true, null);
            this.setInputsInline(true);
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
        }
    };

    Blockly.Blocks['sleep'] = {
        init: function () {
            this.appendValueInput("TIME")
                .setCheck("Number")
                .appendField("Sleep (sec)");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
        }
    };


    Blockly.Blocks['motor_speed'] = {
        init: function () {
            this.appendValueInput("VAR")
                .setCheck(null)
                .appendField("TachoMotor");
            this.appendValueInput("SPEED")
                .setCheck("Number")
                .appendField("Speed");
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
        }
    };

    Blockly.Blocks['color_sensor_brightness'] = {
        init: function () {
            this.appendValueInput("VAR")
                .setCheck(null)
                .appendField("ColorSensor");
            this.appendValueInput("FIRST_SEG")
                .setCheck("Number")
                .appendField("First Segment");
            this.appendValueInput("SEC_SEG")
                .setCheck("Number")
                .appendField("Second Segment");
            this.appendValueInput("THIRD_SEG")
                .setCheck("Number")
                .appendField("Third Segment");
            //            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
        }
    };

    Blockly.Blocks['distance_sensor_brightness'] = {
        init: function () {
            this.appendValueInput("VAR")
                .setCheck(null)
                .appendField("DistanceSensor");
            this.appendValueInput("TOP_LEFT")
                .setCheck("Number")
                .appendField("Top Left");
            this.appendValueInput("BOTTOM_LEFT")
                .setCheck("Number")
                .appendField("Bottom Left");
            this.appendValueInput("TOP_RIGHT")
                .setCheck("Number")
                .appendField("Top Right");
            this.appendValueInput("BOTTOM_RIGHT")
                .setCheck("Number")
                .appendField("Bottom Right");
            //            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
        }
    };

    Blockly.Blocks['motor_power'] = {
        init: function () {
            this.appendValueInput("VAR")
                .setCheck(null)
                .appendField("Motor");
            this.appendValueInput("POWER")
                .setCheck("Number")
                .appendField("Power");
            this.setInputsInline(true);

            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
        }
    };


    Blockly.Blocks['device_subscribe'] = {
        init: function () {
            this.appendValueInput("DEVICE")
                .setCheck(null)
                .appendField("Device");
            this.appendDummyInput()
                .appendField("Mode")
                .appendField(new Blockly.FieldNumber(0, 0, Infinity, 1), "MODE")
                .appendField("delta")
                .appendField(new Blockly.FieldNumber(1, 1), "DELTA")
                .appendField("subscribe")
                .appendField(new LexicalVariables.FieldParameterFlydown(
                    'value', true,
                    LexicalVariables.FieldFlydown.DISPLAY_BELOW), 'VAR')
            this.appendStatementInput("DO")
                .setCheck(null);
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
            this.lexicalVarPrefix = 'counter'
        },

        blocksInScope: function () {
            const doBlock = this.getInputTargetBlock('DO');
            //console.log('blocksInScope', doBlock)
            if (doBlock) {
                return [doBlock];
            } else {
                return [];
            }
        },
        declaredNames: function () {
            //console.log('declaredNames', this.getFieldValue('VAR'))

            return [this.getFieldValue('VAR')];
        },


        withLexicalVarsAndPrefix: function (child, proc) {
            //console.log('withLexicalVarsAndPrefix', { child, proc })
            if (this.getInputTargetBlock('DO') == child) {
                const lexVar = this.getFieldValue('VAR');
                proc(lexVar, this.lexicalVarPrefix);
            }
        }
    };

})();

// @ts-check


$$.control.registerControl('rootPage', {

	template: "<div class=\"toolbar\">\n\n    <div class=\"left\">\n        <button bn-event=\"click: onConnect\">Connect to HUB</button>\n        \n        <button bn-event=\"click: onCode\">Code</button>\n\n\n    </div>\n</div>\n\n\n<div>\n    <table class=\"w3-table-all\">\n        <thead>\n            <tr>\n                <th>Hub</th>\n                <th>Actions</th>\n                <th>Battery Level</th>\n                <th>Address</th>\n            </tr>\n        </thead>\n        <tbody bn-each=\"hubDevices\" bn-event=\"click.btnShutdown: onShutDown, click.btnInfo: onInfo, comboboxchange.combo: onHubChange\">\n            <tr>\n                <td>\n                    <div bn-control=\"brainjs.combobox\" bn-data=\"{items: hubs}\" bn-val=\"$scope.$i.hubId\" class=\"combo\"></div>\n                </td>\n                <td>\n                    <button class=\"btnShutdown\">Shutdown</button>\n                    <button class=\"btnInfo\">Info</button>\n                </td>\n                <td bn-text=\"$scope.$i.batteryLevel\"></td>\n                <td bn-text=\"$scope.$i.address\"></td>\n            </tr>\n        </tbody>\n    </table>\n\n</div>",

	deps: ['breizbot.pager', 'hub', 'breizbot.blocklyinterpretor'],


	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {HUB} hub
	 * @param {Breizbot.Services.BlocklyInterpretor.Interface} blocklyInterpretor
	 * 
	 */
	init: async function (elt, pager, hub, blocklyInterpretor) {

		//const config = {}

		elt.find('button').addClass('w3-btn w3-blue')

		/**@type {{[UUID: string]: HUB.HubDevice}} */
		const hubDevices = {}
		let UUID = 1

		let config = null


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
							config,
						},
						onBack: function (value) {
							//console.log('onBack', value)
							config = value
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

	}


});





// @ts-check

$$.control.registerControl('code', {

	template: "<div class=\"toolbar\">\n\n    <div>\n        <button bn-event=\"click: onExport\" title=\"Export current config\">Export</button>\n        <button bn-event=\"click: onImport\" title=\"Import config\">Import</button>\n\n        <button bn-event=\"click: onNewConfig\" bn-icon=\"fa fa-file\" title=\"Reset Config\"></button>\n\n        <button bn-event=\"click: onConfig\" bn-icon=\"fa fa-folder-open\" title=\"Open Config\"></button>\n\n        <button bn-event=\"click: onSaveConfig\" bn-icon=\"fa fa-save\" title=\"Save current config\"></button>\n\n        <button bn-event=\"click: onRun\">Run</button>\n\n        <button bn-event=\"click: onStop\">Stop</button>\n\n        <button bn-event=\"click: onGamePad\" bn-show=\"gamepadConnected\">Gamepad</button>\n    </div>\n\n\n    <div>\n        <div bn-show=\"currentConfig\">\n            <label>Current Config:</label>\n            <span bn-text=\"currentConfig\"></span>\n        </div>\n    </div>\n\n\n\n</div>\n<div id=\"blocklyDiv\"></div>\n<div class=\"logPanel\" bn-html=\"getLogs\" bn-bind=\"logPanel\"></div>\n\n<xml id=\"toolbox\" style=\"display: none;\">\n\n    <category name=\"Logic\" categorystyle=\"logic_category\">\n        <block type=\"controls_if\"></block>\n        <block type=\"logic_compare\"></block>\n        <block type=\"logic_operation\"></block>\n        <block type=\"logic_negate\"></block>\n        <block type=\"logic_boolean\"></block>\n        <block type=\"logic_ternary\"></block>\n    </category>\n    <category name=\"Loop\" categorystyle=\"loop_category\">\n        <block type=\"controls_repeat_ext\">\n            <value name=\"TIMES\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">10</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"controls_whileUntil\"></block>\n        <block type=\"controls_for\">\n            <value name=\"START\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">1</field>\n                </shadow>\n            </value>\n            <value name=\"END\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">10</field>\n                </shadow>\n            </value>\n            <value name=\"STEP\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">1</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"controls_forEach\"></block>\n        <block type=\"controls_flow_statements\"></block>\n    </category>\n    <category name=\"Math\" categorystyle=\"math_category\">\n        <block type=\"math_number\"></block>\n        <block type=\"math_arithmetic\"></block>\n        <block type=\"math_round\">\n            <field name=\"OP\">ROUND</field>\n            <value name=\"NUM\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">3.1</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"math_single\">\n            <field name=\"OP\">ROOT</field>\n            <value name=\"NUM\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">9</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"math_trig\">\n            <field name=\"OP\">SIN</field>\n            <value name=\"NUM\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">45</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"math_constant\">\n            <field name=\"CONSTANT\">PI</field>\n        </block>\n        <block type=\"math_random_int\">\n            <value name=\"FROM\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">1</field>\n                </shadow>\n            </value>\n            <value name=\"TO\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"math_on_list\">\n            <mutation op=\"SUM\" />\n            <field name=\"OP\">SUM</field>\n        </block>\n    </category>\n    <category name=\"Text\" categorystyle=\"text_category\">\n        <block type=\"text\"></block>\n        <block type=\"text_print\"></block>\n        <block type=\"text_length\">\n            <value name=\"VALUE\">\n                <shadow type=\"text\">\n                    <field name=\"TEXT\">abc</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"text_changeCase\">\n            <field name=\"CASE\">UPPERCASE</field>\n            <value name=\"TEXT\">\n                <shadow type=\"text\">\n                    <field name=\"TEXT\">abc</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"text_join\">\n            <mutation items=\"2\" />\n        </block>\n        <block type=\"text_indexOf\"></block>\n        <block type=\"text_charAt\"></block>\n        <block type=\"text_getSubstring\"></block>\n        <block type=\"text_prompt_ext\">\n            <mutation type=\"TEXT\" />\n            <field name=\"TYPE\">TEXT</field>\n            <value name=\"TEXT\">\n                <shadow type=\"text\">\n                    <field name=\"TEXT\">abc</field>\n                </shadow>\n            </value>\n        </block>\n    </category>\n    <category name=\"Lists\" categorystyle=\"list_category\">\n        <block type=\"lists_create_with\">\n            <mutation items=\"0\"></mutation>\n        </block>\n        <block type=\"lists_create_with\"></block>\n        <block type=\"lists_repeat\">\n            <value name=\"NUM\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">5</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"lists_length\"></block>\n        <block type=\"lists_isEmpty\"></block>\n        <block type=\"lists_indexOf\">\n            <value name=\"VALUE\">\n                <block type=\"lexical_variable_get\">\n                    <field name=\"VAR\">list</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"lists_getIndex\">\n            <value name=\"VALUE\">\n                <block type=\"lexical_variable_get\">\n                    <field name=\"VAR\">list</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"lists_setIndex\">\n            <value name=\"LIST\">\n                <block type=\"lexical_variable_get\">\n                    <field name=\"VAR\">list</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"lists_getSublist\">\n            <value name=\"LIST\">\n                <block type=\"lexical_variable_get\">\n                    <field name=\"VAR\">list</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"lists_split\">\n            <value name=\"DELIM\">\n                <shadow type=\"text\">\n                    <field name=\"TEXT\">,</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"lists_sort\"></block>\n        <block type=\"lists_reverse\"></block>\n    </category>\n    <category id=\"catVariables\" colour=\"330\" name=\"Variables\">\n        <block type=\"global_declaration\"></block>\n        <block type=\"local_declaration_statement\"></block>\n        <block type=\"lexical_variable_get\"></block>\n        <block type=\"lexical_variable_set\"></block>\n    </category>\n    <category name=\"Functions\" custom=\"PROCEDURE\" categorystyle=\"procedure_category\"></category>\n\n\n    <category name=\"Object\" colour=\"355\">\n        <block type=\"object_getfield\">\n            <value name=\"OBJECT\">\n                <block type=\"lexical_variable_get\">\n                    <field name=\"VAR\">object</field>\n                </block>\n            </value>\n        </block>\n    </category>\n    <category name=\"Device\" colour=\"355\">\n        <block type=\"create_device\"></block>\n        <block type=\"device_getvalue\">\n            <value name=\"DEVICE\">\n                <block type=\"lexical_variable_get\">\n                    <field name=\"VAR\">device</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"wait_until_device\">\n            <value name=\"DEVICE\">\n                <block type=\"lexical_variable_get\">\n                    <field name=\"VAR\">device</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"device_subscribe\">\n            <value name=\"DEVICE\">\n                <block type=\"lexical_variable_get\">\n                    <field name=\"VAR\">device</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"color_sensor_brightness\">\n            <value name=\"VAR\">\n                <block type=\"lexical_variable_get\">\n                    <field name=\"VAR\">sensor</field>\n                </block>\n            </value>\n            <value name=\"FIRST_SEG\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n            <value name=\"SEC_SEG\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n            <value name=\"THIRD_SEG\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"distance_sensor_brightness\">\n            <value name=\"VAR\">\n                <block type=\"lexical_variable_get\">\n                    <field name=\"VAR\">sensor</field>\n                </block>\n            </value>\n            <value name=\"TOP_LEFT\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n            <value name=\"TOP_RIGHT\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n            <value name=\"BOTTOM_LEFT\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n            <value name=\"BOTTOM_RIGHT\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n    </category>\n    <category name=\"Motor\" colour=\"355\">\n        <block type=\"create_motor\"></block>\n        <block type=\"motor_power\">\n            <value name=\"VAR\">\n                <block type=\"lexical_variable_get\">\n                    <field name=\"VAR\">motor</field>\n                </block>\n            </value>\n            <value name=\"POWER\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n    </category>\n    <category name=\"TachoMotor\" colour=\"355\">\n        <block type=\"create_tacho_motor\"></block>\n        <block type=\"motor_speed\">\n            <value name=\"VAR\">\n                <block type=\"lexical_variable_get\">\n                    <field name=\"VAR\">motor</field>\n                </block>\n            </value>\n            <value name=\"SPEED\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"motor_speed_time\">\n            <value name=\"VAR\">\n                <block type=\"lexical_variable_get\">\n                    <field name=\"VAR\">motor</field>\n                </block>\n            </value>\n            <value name=\"TIME\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">1</field>\n                </shadow>\n            </value>\n            <value name=\"SPEED\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"motor_speed_degrees\">\n            <value name=\"VAR\">\n                <block type=\"lexical_variable_get\">\n                    <field name=\"VAR\">motor</field>\n                </block>\n            </value>\n            <value name=\"DEGREES\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">180</field>\n                </shadow>\n            </value>\n            <value name=\"SPEED\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"motor_speed_position\">\n            <value name=\"VAR\">\n                <block type=\"lexical_variable_get\">\n                    <field name=\"VAR\">motor</field>\n                </block>\n            </value>\n            <value name=\"ANGLE\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">0</field>\n                </shadow>\n            </value>\n            <value name=\"SPEED\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"motor_speed_abs_position\">\n            <value name=\"VAR\">\n                <block type=\"lexical_variable_get\">\n                    <field name=\"VAR\">motor</field>\n                </block>\n            </value>\n            <value name=\"ANGLE\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">0</field>\n                </shadow>\n            </value>\n            <value name=\"SPEED\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"motor_reset_position\">\n            <value name=\"VAR\">\n                <block type=\"lexical_variable_get\">\n                    <field name=\"VAR\">motor</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"motor_get_speed\">\n            <value name=\"VAR\">\n                <block type=\"lexical_variable_get\">\n                    <field name=\"VAR\">motor</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"motor_get_position\">\n            <value name=\"VAR\">\n                <block type=\"lexical_variable_get\">\n                    <field name=\"VAR\">motor</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"motor_get_absoluteposition\">\n            <value name=\"VAR\">\n                <block type=\"lexical_variable_get\">\n                    <field name=\"VAR\">motor</field>\n                </block>\n            </value>\n        </block>\n\n    </category>\n    <category name=\"PairMotor\" colour=\"355\">\n        <block type=\"create_pair_motor\">\n            <FIELD name=\"PORT2\">B</FIELD>\n        </block>\n        <block type=\"pair_motor_speed\">\n            <value name=\"VAR\">\n                <block type=\"lexical_variable_get\">\n                    <field name=\"VAR\">motor</field>\n                </block>\n            </value>\n            <value name=\"SPEED1\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n            <value name=\"SPEED2\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n\n\n    </category>\n    <category name=\"Hub\" colour=\"355\">\n        <block type=\"hub_color\"></block>\n        <block type=\"hub_get_tilt\"></block>\n        <block type=\"hub_get_impact_count\"></block>\n        <block type=\"hub_set_impact_count\">\n            <value name=\"VAR\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">0</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"hub_get_voltage\"></block>\n    </category>\n    <category name=\"System\" colour=\"355\">\n        <block type=\"sleep\">\n            <value name=\"TIME\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">1</field>\n                </shadow>\n            </value>\n        </block>\n    </category>\n\n</xml>",

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
			//console.log('motor', motor)
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

			console.log('setSpeed', { speed1, speed2 })
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
			console.log('Timeout')
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

$$.control.registerControl('gamepad', {

	template: "<div>\n    <h2 bn-text=\"id\"></h2>\n</div>\n\n<h3>Axes</h3>\n<div>\n    <table class=\"w3-table-all axeTable\">\n        <thead>\n            <tr>\n                <th>Axe</th>\n                <th>Action</th>\n            </tr>\n        </thead>\n        <tbody bn-each=\"axes\" bn-bind=\"axes\" bn-index=\"idx\">\n            <tr>\n                <td bn-text=\"getAxeLabel\"></td>\n                <td>\n                    <div bn-control=\"brainjs.combobox\" bn-data=\"{items: actions}\" bn-val=\"$scope.$i.action\"\n                        class=\"item\"></div>\n                </td>\n            </tr>\n        </tbody>\n    </table>\n</div>\n\n<h3>Buttons</h3>\n<div class=\"commandTable\">\n    <table class=\"w3-table-all\">\n        <thead>\n            <tr>\n                <th>Button</th>\n                <th>Down</th>\n                <th>Up</th>\n            </tr>\n        </thead>\n        <tbody bn-each=\"buttons\" bn-bind=\"buttons\" bn-index=\"idx\">\n            <tr>\n                <td bn-text=\"getButtonLabel\"></td>\n                <td>\n                    <div class=\"item\">\n                        <div bn-control=\"brainjs.combobox\" bn-data=\"{items: actions}\" bn-val=\"$scope.$i.down\"\n                            class=\"down\"></div>\n                        <input bn-val=\"$scope.$i.downValue\" type=\"number\" class=\"downValue\">\n\n                    </div>\n\n                </td>\n                <td>\n                    <div class=\"item\">\n                        <div bn-control=\"brainjs.combobox\" bn-data=\"{items: actions}\" bn-val=\"$scope.$i.up\" class=\"up\">\n                        </div>\n                        <input bn-val=\"$scope.$i.upValue\" type=\"number\" class=\"upValue\">\n                    </div>\n\n\n                </td>\n\n            </tr>\n        </tbody>\n    </table>\n</div>",

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

		console.log('props', this.props)

		const {mapping, actions} = this.props

		actions.unshift('None')

		console.log(this.props)

		let axes = []
		let buttons = []

		const info = gamepad.getGamepads()[0]
		console.log({ info })

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
				buttons.push({ up: 'None', down: 'None', upValue: 0, downValue: 1 })
			}
		}

		function resetValue() {
			let axes = []
			let buttons = []
			for (let i = 0; i < info.axes.length; i++) {
				axes.push({ action: 'None' })
			}
			for (let i = 0; i < info.buttons.length; i++) {
				buttons.push({ up: 'None', down: 'None', upValue: 0, downValue: 1 })
			}
			ctrl.setData({axes, buttons})
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
				actions,
				getButtonLabel: function(scope) {
					return `Button ${scope.idx + 1}`
				},
				getAxeLabel: function(scope) {
					return `Axe ${scope.idx + 1}`
				}
			},
			events: {

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
				const action = $(this).find('.item').getValue()
				ret.axes.push({
					action
				})
			})

			buttonsElt.find('tr').each(function (idx) {
				const up = $(this).find('.up').getValue()
				const down = $(this).find('.down').getValue()
				const upValue = $(this).find('.upValue').getValue()
				const downValue = $(this).find('.downValue').getValue()

				ret.buttons.push({
					up,
					down,
					upValue,
					downValue
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
				},
				reset: {
					icon: 'fas fa-sync',
					title: 'Reset value',
					onClick: resetValue
				}
			}

		}
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
				//await device.readInfo()
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
					device: hubDevice.getDevice(portId)
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
					/**@type {HUB.TachoMotor} */
					const motor = hubDevice.getDevice(portId)
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
					/**@type {HUB.Led} */
					const led = hubDevice.getDevice(portId)
					led.setBrightness((action == 'on' ? 100 : 0))
				},
				onCalibrate: async function () {
					const portId = getExternalPortId($(this))
					console.log('onCalibrate', portId)
					/**@type {HUB.TachoMotor} */
					const motor = hubDevice.getDevice(portId)
					await motor.calibrate()
				},
				onMouseUp: async function () {
					//console.log('onMouseUp')
					const action = $(this).data('action')
					const portId = getExternalPortId($(this))
					/**@type {HUB.TachoMotor} */
					const motor = hubDevice.getDevice(portId)
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
					/**@type {HUB.TachoMotor} */
					const motor = hubDevice.getDevice(portId)
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

$$.control.registerControl('info', {

	template: "<div>\n    <div>\n        Capabilities: <span bn-text=\"capabilities\"></span>\n    </div>\n    <table class=\"w3-table-all\">\n        <thead>\n            <tr>\n                <th>MODE</th>\n                <th>CAPABILITIES</th>\n                <th>UNIT</th>\n                <th>RAW</th>\n                <th>SI</th>\n                <th>VALUE FORMAT</th>\n                <th>Value</th>\n            </tr>\n        </thead>\n        <tbody bn-each=\"modes\" bn-event=\"click.btnGet: onBtnGet\">\n            <tr>\n                <td bn-text=\"$scope.$i.name\"></td>\n                <td bn-text=\"getCapabilites\"></td>\n                <td bn-text=\"$scope.$i.unit\"></td>\n                <td>\n                    <span bn-text=\"$scope.$i.RAW.min\"></span><br>\n                    <span bn-text=\"$scope.$i.RAW.max\"></span>\n                </td>\n                <td>\n                    <span bn-text=\"$scope.$i.PCT.min\"></span><br>\n                    <span bn-text=\"$scope.$i.PCT.max\"></span>\n                </td>\n                <td>\n                    <span bn-text=\"$scope.$i.SI.min\"></span><br>\n                    <span bn-text=\"$scope.$i.SI.max\"></span>\n                </td>\n                <td>\n                    dataType: <span bn-text=\"$scope.$i.VALUE_FORMAT.dataType\"></span><br>\n                    numValues: <span bn-text=\"$scope.$i.VALUE_FORMAT.numValues\"></span>\n                </td>\n                <td>\n                    <div bn-if=\"isInput\">\n                        <button class=\"w3-btn w3-green btnGet\">Get</button>\n                        <span></span>\n                    </div>\n\n                </td>\n            </tr>\n        </tbody>\n    </table>\n</div>",

	deps: ['breizbot.pager', 'hub'],

	props: {
		device: null
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {HUB} hub
	 */
	init: function (elt, pager, hub) {

		/**@type {HUB.Device} */
		const device = this.props.device


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
					const values = await device.getValue(mode)
					console.log('values', values)
					$(this).closest('td').find('span').text(JSON.stringify(values, null, 4))
					
				}
			}
		})

		async function init() {
			const { modes, capabilities } = await device.readInfo()
			ctrl.setData({ modes, capabilities })
		}

		init()
	}


});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJsb2Nrcy5qcyIsIm1haW4uanMiLCJwYWdlcy9jb2RlL2NvZGUuanMiLCJwYWdlcy9jb25maWdDdHJsL2NvbmZpZ0N0cmwuanMiLCJwYWdlcy9nYW1lcGFkL2dhbWVwYWQuanMiLCJwYWdlcy9odWJpbmZvL2h1YmluZm8uanMiLCJwYWdlcy9pbmZvL2luZm8uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbHVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uICgpIHtcblxuICAgIEJsb2NrbHkuQmxvY2tzWydvYmplY3RfZ2V0ZmllbGQnXSA9IHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiT0JKRUNUXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKG51bGwpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiaW4gT2JqZWN0XCIpO1xuICAgICAgICAgICAgdGhpcy5hcHBlbmREdW1teUlucHV0KClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJnZXQgZmllbGRcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGRUZXh0SW5wdXQoXCJcIiksIFwiRklFTERcIik7XG4gICAgICAgICAgICB0aGlzLnNldElucHV0c0lubGluZSh0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0T3V0cHV0KHRydWUsIG51bGwpO1xuICAgICAgICAgICAgdGhpcy5zZXRDb2xvdXIoMjMwKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SGVscFVybChcIlwiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBCbG9ja2x5LkJsb2Nrc1snY3JlYXRlX2RldmljZSddID0ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZER1bW15SW5wdXQoKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIkRldmljZVwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIkhVQlwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZERyb3Bkb3duKFtbXCJIVUIxXCIsIFwiSFVCMVwiXSwgW1wiSFVCMlwiLCBcIkhVQjJcIl1dKSwgXCJIVUJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJQT1JUXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkTnVtYmVyKDAsIDAsIEluZmluaXR5LCAxKSwgXCJQT1JUXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRPdXRwdXQodHJ1ZSwgXCJEZXZpY2VcIik7XG4gICAgICAgICAgICB0aGlzLnNldENvbG91cigyMzApO1xuICAgICAgICAgICAgdGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRIZWxwVXJsKFwiXCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIEJsb2NrbHkuQmxvY2tzWydkZXZpY2VfZ2V0dmFsdWUnXSA9IHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiREVWSUNFXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKG51bGwpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiRGV2aWNlXCIpO1xuICAgICAgICAgICAgdGhpcy5hcHBlbmREdW1teUlucHV0KClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJNb2RlXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkTnVtYmVyKDAsIDAsIEluZmluaXR5LCAxKSwgXCJNT0RFXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiZ2V0VmFsdWVcIik7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZER1bW15SW5wdXQoKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SW5wdXRzSW5saW5lKHRydWUpO1xuICAgICAgICAgICAgdGhpcy5zZXRPdXRwdXQodHJ1ZSwgbnVsbCk7XG4gICAgICAgICAgICB0aGlzLnNldENvbG91cigyMzApO1xuICAgICAgICAgICAgdGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRIZWxwVXJsKFwiXCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIEJsb2NrbHkuQmxvY2tzWyd3YWl0X3VudGlsX2RldmljZSddID0ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJERVZJQ0VcIilcbiAgICAgICAgICAgICAgICAuc2V0Q2hlY2sobnVsbClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJXYWl0IHVudGlsIERldmljZVwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiTW9kZVwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZE51bWJlcigwLCAwLCBJbmZpbml0eSwgMSksIFwiTU9ERVwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlRFU1RcIilcbiAgICAgICAgICAgICAgICAuc2V0Q2hlY2soXCJCb29sZWFuXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKG5ldyBMZXhpY2FsVmFyaWFibGVzLkZpZWxkUGFyYW1ldGVyRmx5ZG93bihcbiAgICAgICAgICAgICAgICAgICAgJ3ZhbHVlJywgdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgTGV4aWNhbFZhcmlhYmxlcy5GaWVsZEZseWRvd24uRElTUExBWV9CRUxPVyksICdWQVInKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIlRlc3RcIik7XG4gICAgICAgICAgICB0aGlzLnNldElucHV0c0lubGluZSh0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0UHJldmlvdXNTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG4gICAgICAgICAgICB0aGlzLnNldE5leHRTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG4gICAgICAgICAgICB0aGlzLnNldENvbG91cigyMzApO1xuICAgICAgICAgICAgdGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRIZWxwVXJsKFwiXCIpO1xuICAgICAgICAgICAgdGhpcy5sZXhpY2FsVmFyUHJlZml4ID0gJ2NvdW50ZXInXG4gICAgICAgIH0sXG4gICAgICAgIGJsb2Nrc0luU2NvcGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnN0IGRvQmxvY2sgPSB0aGlzLmdldElucHV0VGFyZ2V0QmxvY2soJ1RFU1QnKTtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ2Jsb2Nrc0luU2NvcGUnLCBkb0Jsb2NrKVxuICAgICAgICAgICAgaWYgKGRvQmxvY2spIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2RvQmxvY2tdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGRlY2xhcmVkTmFtZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ2RlY2xhcmVkTmFtZXMnLCB0aGlzLmdldEZpZWxkVmFsdWUoJ1ZBUicpKVxuXG4gICAgICAgICAgICByZXR1cm4gW3RoaXMuZ2V0RmllbGRWYWx1ZSgnVkFSJyldO1xuICAgICAgICB9LFxuXG5cbiAgICAgICAgd2l0aExleGljYWxWYXJzQW5kUHJlZml4OiBmdW5jdGlvbiAoY2hpbGQsIHByb2MpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3dpdGhMZXhpY2FsVmFyc0FuZFByZWZpeCcsIHsgY2hpbGQsIHByb2MgfSlcbiAgICAgICAgICAgIGlmICh0aGlzLmdldElucHV0VGFyZ2V0QmxvY2soJ1RFU1QnKSA9PSBjaGlsZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxleFZhciA9IHRoaXMuZ2V0RmllbGRWYWx1ZSgnVkFSJyk7XG4gICAgICAgICAgICAgICAgcHJvYyhsZXhWYXIsIHRoaXMubGV4aWNhbFZhclByZWZpeCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgQmxvY2tseS5CbG9ja3NbJ2NyZWF0ZV90YWNob19tb3RvciddID0ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZER1bW15SW5wdXQoKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIlRhY2hvTW90b3JcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJIVUJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGREcm9wZG93bihbW1wiSFVCMVwiLCBcIkhVQjFcIl0sIFtcIkhVQjJcIiwgXCJIVUIyXCJdXSksIFwiSFVCXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiUE9SVFwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZERyb3Bkb3duKFtbXCJBXCIsIFwiQVwiXSwgW1wiQlwiLCBcIkJcIl0sIFtcIkNcIiwgXCJDXCJdLCBbXCJEXCIsIFwiRFwiXV0pLCBcIlBPUlRcIik7XG4gICAgICAgICAgICB0aGlzLnNldE91dHB1dCh0cnVlLCBcIk1vdG9yXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRDb2xvdXIoMjMwKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SGVscFVybChcIlwiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBCbG9ja2x5LkJsb2Nrc1snY3JlYXRlX21vdG9yJ10gPSB7XG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiTW90b3JcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJIVUJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGREcm9wZG93bihbW1wiSFVCMVwiLCBcIkhVQjFcIl0sIFtcIkhVQjJcIiwgXCJIVUIyXCJdXSksIFwiSFVCXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiUE9SVFwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZERyb3Bkb3duKFtbXCJBXCIsIFwiQVwiXSwgW1wiQlwiLCBcIkJcIl0sIFtcIkNcIiwgXCJDXCJdLCBbXCJEXCIsIFwiRFwiXV0pLCBcIlBPUlRcIik7XG4gICAgICAgICAgICB0aGlzLnNldE91dHB1dCh0cnVlLCBcIk1vdG9yXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRDb2xvdXIoMjMwKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SGVscFVybChcIlwiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBCbG9ja2x5LkJsb2Nrc1snY3JlYXRlX3BhaXJfbW90b3InXSA9IHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5hcHBlbmREdW1teUlucHV0KClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJQYWlyTW90b3JcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJIVUJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGREcm9wZG93bihbW1wiSFVCMVwiLCBcIkhVQjFcIl0sIFtcIkhVQjJcIiwgXCJIVUIyXCJdXSksIFwiSFVCXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiUE9SVDFcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGREcm9wZG93bihbW1wiQVwiLCBcIkFcIl0sIFtcIkJcIiwgXCJCXCJdLCBbXCJDXCIsIFwiQ1wiXSwgW1wiRFwiLCBcIkRcIl1dKSwgXCJQT1JUMVwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIlBPUlQyXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkRHJvcGRvd24oW1tcIkFcIiwgXCJBXCJdLCBbXCJCXCIsIFwiQlwiXSwgW1wiQ1wiLCBcIkNcIl0sIFtcIkRcIiwgXCJEXCJdXSksIFwiUE9SVDJcIilcbiAgICAgICAgICAgIHRoaXMuc2V0T3V0cHV0KHRydWUsIFwiTW90b3JcIik7XG4gICAgICAgICAgICB0aGlzLnNldENvbG91cigyMzApO1xuICAgICAgICAgICAgdGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRIZWxwVXJsKFwiXCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIEJsb2NrbHkuQmxvY2tzWydwYWlyX21vdG9yX3NwZWVkJ10gPSB7XG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlZBUlwiKVxuICAgICAgICAgICAgICAgIC5zZXRDaGVjayhudWxsKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIlBhaXIgTW90b3JcIik7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJTUEVFRDFcIilcbiAgICAgICAgICAgICAgICAuc2V0Q2hlY2soXCJOdW1iZXJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJTcGVlZDFcIik7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJTUEVFRDJcIilcbiAgICAgICAgICAgICAgICAuc2V0Q2hlY2soXCJOdW1iZXJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJTcGVlZDJcIik7XG4gICAgICAgICAgICB0aGlzLnNldElucHV0c0lubGluZSh0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0UHJldmlvdXNTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG4gICAgICAgICAgICB0aGlzLnNldE5leHRTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG4gICAgICAgICAgICB0aGlzLnNldENvbG91cigyMzApO1xuICAgICAgICAgICAgdGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRIZWxwVXJsKFwiXCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIEJsb2NrbHkuQmxvY2tzWydodWJfY29sb3InXSA9IHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5hcHBlbmREdW1teUlucHV0KClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJIVUJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGREcm9wZG93bihbW1wiSFVCMVwiLCBcIkhVQjFcIl0sIFtcIkhVQjJcIiwgXCJIVUIyXCJdXSksIFwiSFVCXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiQ29sb3JcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGREcm9wZG93bihbW1wiQkxBQ0tcIiwgXCJCTEFDS1wiXSwgW1wiUFVSUExFXCIsIFwiUFVSUExFXCJdLCBbXCJCTFVFXCIsIFwiQkxVRVwiXSwgW1wiTElHSFRfQkxVRVwiLCBcIkxJR0hUX0JMVUVcIl0sIFtcIkNZQU5cIiwgXCJDWUFOXCJdLCBbXCJHUkVFTlwiLCBcIkdSRUVOXCJdLCBbXCJQSU5LXCIsIFwiUElOS1wiXSwgW1wiWUVMTE9XXCIsIFwiWUVMTE9XXCJdLCBbXCJPUkFOR0VcIiwgXCJPUkFOR0VcIl0sIFtcIlJFRFwiLCBcIlJFRFwiXSwgW1wiV0hJVEVcIiwgXCJXSElURVwiXV0pLCBcIkNPTE9SXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRQcmV2aW91c1N0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0TmV4dFN0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0Q29sb3VyKDIzMCk7XG4gICAgICAgICAgICB0aGlzLnNldFRvb2x0aXAoXCJcIik7XG4gICAgICAgICAgICB0aGlzLnNldEhlbHBVcmwoXCJcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgQmxvY2tseS5CbG9ja3NbJ2h1Yl9nZXRfdGlsdCddID0ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZER1bW15SW5wdXQoKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIkhVQlwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZERyb3Bkb3duKFtbXCJIVUIxXCIsIFwiSFVCMVwiXSwgW1wiSFVCMlwiLCBcIkhVQjJcIl1dKSwgXCJIVUJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJUaWx0XCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkRHJvcGRvd24oW1tcIlBpdGNoXCIsIFwicGl0Y2hcIl0sIFtcIlJvbGxcIiwgXCJyb2xsXCJdLCBbXCJZYXdcIiwgXCJ5YXdcIl1dKSwgXCJUWVBFXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRPdXRwdXQodHJ1ZSwgXCJOdW1iZXJcIik7XG4gICAgICAgICAgICB0aGlzLnNldENvbG91cigyMzApO1xuICAgICAgICAgICAgdGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRIZWxwVXJsKFwiXCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgQmxvY2tseS5CbG9ja3NbJ2h1Yl9nZXRfdm9sdGFnZSddID0ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZER1bW15SW5wdXQoKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIkhVQlwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZERyb3Bkb3duKFtbXCJIVUIxXCIsIFwiSFVCMVwiXSwgW1wiSFVCMlwiLCBcIkhVQjJcIl1dKSwgXCJIVUJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJWb2x0YWdlIChtVilcIilcbiAgICAgICAgICAgIHRoaXMuc2V0T3V0cHV0KHRydWUsIFwiTnVtYmVyXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRDb2xvdXIoMjMwKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SGVscFVybChcIlwiKTtcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIEJsb2NrbHkuQmxvY2tzWydodWJfZ2V0X2ltcGFjdF9jb3VudCddID0ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZER1bW15SW5wdXQoKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIkhVQlwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZERyb3Bkb3duKFtbXCJIVUIxXCIsIFwiSFVCMVwiXSwgW1wiSFVCMlwiLCBcIkhVQjJcIl1dKSwgXCJIVUJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJJbXBhY3QgQ291bnRcIilcbiAgICAgICAgICAgIHRoaXMuc2V0T3V0cHV0KHRydWUsIFwiTnVtYmVyXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRDb2xvdXIoMjMwKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SGVscFVybChcIlwiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBCbG9ja2x5LkJsb2Nrc1snaHViX3NldF9pbXBhY3RfY291bnQnXSA9IHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiVkFSXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKFwiTnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiSFVCXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkRHJvcGRvd24oW1tcIkhVQjFcIiwgXCJIVUIxXCJdLCBbXCJIVUIyXCIsIFwiSFVCMlwiXV0pLCBcIkhVQlwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIkltcGFjdCBDb3VudFwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SW5wdXRzSW5saW5lKHRydWUpO1xuICAgICAgICAgICAgdGhpcy5zZXRQcmV2aW91c1N0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0TmV4dFN0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0Q29sb3VyKDIzMCk7XG4gICAgICAgICAgICB0aGlzLnNldFRvb2x0aXAoXCJcIik7XG4gICAgICAgICAgICB0aGlzLnNldEhlbHBVcmwoXCJcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICBCbG9ja2x5LkJsb2Nrc1snbW90b3Jfc3BlZWRfdGltZSddID0ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJWQVJcIilcbiAgICAgICAgICAgICAgICAuc2V0Q2hlY2sobnVsbClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJUYWNob01vdG9yXCIpO1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiU1BFRURcIilcbiAgICAgICAgICAgICAgICAuc2V0Q2hlY2soXCJOdW1iZXJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJTcGVlZFwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlRJTUVcIilcbiAgICAgICAgICAgICAgICAuc2V0Q2hlY2soXCJOdW1iZXJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJUaW1lIChzZWMpXCIpO1xuICAgICAgICAgICAgdGhpcy5hcHBlbmREdW1teUlucHV0KClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJXYWl0XCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkQ2hlY2tib3goXCJUUlVFXCIpLCBcIldBSVRcIik7XG4gICAgICAgICAgICB0aGlzLnNldFByZXZpb3VzU3RhdGVtZW50KHRydWUsIG51bGwpO1xuICAgICAgICAgICAgdGhpcy5zZXROZXh0U3RhdGVtZW50KHRydWUsIG51bGwpO1xuICAgICAgICAgICAgdGhpcy5zZXRDb2xvdXIoMjMwKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SGVscFVybChcIlwiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBCbG9ja2x5LkJsb2Nrc1snbW90b3Jfc3BlZWRfZGVncmVlcyddID0ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJWQVJcIilcbiAgICAgICAgICAgICAgICAuc2V0Q2hlY2sobnVsbClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJUYWNob01vdG9yXCIpO1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiU1BFRURcIilcbiAgICAgICAgICAgICAgICAuc2V0Q2hlY2soXCJOdW1iZXJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJTcGVlZFwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIkRFR1JFRVNcIilcbiAgICAgICAgICAgICAgICAuc2V0Q2hlY2soXCJOdW1iZXJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJEZWdyZWVzXCIpO1xuICAgICAgICAgICAgdGhpcy5hcHBlbmREdW1teUlucHV0KClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJXYWl0XCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkQ2hlY2tib3goXCJUUlVFXCIpLCBcIldBSVRcIik7XG4gICAgICAgICAgICB0aGlzLnNldFByZXZpb3VzU3RhdGVtZW50KHRydWUsIG51bGwpO1xuICAgICAgICAgICAgdGhpcy5zZXROZXh0U3RhdGVtZW50KHRydWUsIG51bGwpO1xuICAgICAgICAgICAgdGhpcy5zZXRDb2xvdXIoMjMwKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SGVscFVybChcIlwiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBCbG9ja2x5LkJsb2Nrc1snbW90b3Jfc3BlZWRfcG9zaXRpb24nXSA9IHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiVkFSXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKG51bGwpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiVGFjaG9Nb3RvclwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlNQRUVEXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKFwiTnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiU3BlZWRcIik7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJBTkdMRVwiKVxuICAgICAgICAgICAgICAgIC5zZXRDaGVjayhcIk51bWJlclwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIkFuZ2xlXCIpO1xuICAgICAgICAgICAgdGhpcy5hcHBlbmREdW1teUlucHV0KClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJXYWl0XCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkQ2hlY2tib3goXCJUUlVFXCIpLCBcIldBSVRcIik7XG4gICAgICAgICAgICB0aGlzLnNldFByZXZpb3VzU3RhdGVtZW50KHRydWUsIG51bGwpO1xuICAgICAgICAgICAgdGhpcy5zZXROZXh0U3RhdGVtZW50KHRydWUsIG51bGwpO1xuICAgICAgICAgICAgdGhpcy5zZXRDb2xvdXIoMjMwKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SGVscFVybChcIlwiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBCbG9ja2x5LkJsb2Nrc1snbW90b3Jfc3BlZWRfYWJzX3Bvc2l0aW9uJ10gPSB7XG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlZBUlwiKVxuICAgICAgICAgICAgICAgIC5zZXRDaGVjayhudWxsKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIlRhY2hvTW90b3JcIik7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJTUEVFRFwiKVxuICAgICAgICAgICAgICAgIC5zZXRDaGVjayhcIk51bWJlclwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIlNwZWVkXCIpO1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiQU5HTEVcIilcbiAgICAgICAgICAgICAgICAuc2V0Q2hlY2soXCJOdW1iZXJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJQb3NpdGlvblwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiV2FpdFwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZENoZWNrYm94KFwiVFJVRVwiKSwgXCJXQUlUXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRQcmV2aW91c1N0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0TmV4dFN0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0Q29sb3VyKDIzMCk7XG4gICAgICAgICAgICB0aGlzLnNldFRvb2x0aXAoXCJcIik7XG4gICAgICAgICAgICB0aGlzLnNldEhlbHBVcmwoXCJcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgQmxvY2tseS5CbG9ja3NbJ21vdG9yX3Jlc2V0X3Bvc2l0aW9uJ10gPSB7XG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlZBUlwiKVxuICAgICAgICAgICAgICAgIC5zZXRDaGVjayhudWxsKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIlRhY2hvTW90b3JcIilcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwicmVzZXQgcG9zaXRpb25cIilcbiAgICAgICAgICAgIHRoaXMuc2V0UHJldmlvdXNTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG4gICAgICAgICAgICB0aGlzLnNldE5leHRTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG4gICAgICAgICAgICB0aGlzLnNldElucHV0c0lubGluZSh0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0Q29sb3VyKDIzMCk7XG4gICAgICAgICAgICB0aGlzLnNldFRvb2x0aXAoXCJcIik7XG4gICAgICAgICAgICB0aGlzLnNldEhlbHBVcmwoXCJcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgQmxvY2tseS5CbG9ja3NbJ21vdG9yX2dldF9zcGVlZCddID0ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJWQVJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJUYWNob01vdG9yXCIpO1xuICAgICAgICAgICAgdGhpcy5hcHBlbmREdW1teUlucHV0KClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJTcGVlZFwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0T3V0cHV0KHRydWUsIG51bGwpO1xuICAgICAgICAgICAgdGhpcy5zZXRJbnB1dHNJbmxpbmUodHJ1ZSk7XG4gICAgICAgICAgICB0aGlzLnNldENvbG91cigyMzApO1xuICAgICAgICAgICAgdGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRIZWxwVXJsKFwiXCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIEJsb2NrbHkuQmxvY2tzWydtb3Rvcl9nZXRfcG9zaXRpb24nXSA9IHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiVkFSXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiVGFjaG9Nb3RvclwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiUG9zaXRpb25cIik7XG4gICAgICAgICAgICB0aGlzLnNldE91dHB1dCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SW5wdXRzSW5saW5lKHRydWUpO1xuICAgICAgICAgICAgdGhpcy5zZXRDb2xvdXIoMjMwKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SGVscFVybChcIlwiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBCbG9ja2x5LkJsb2Nrc1snbW90b3JfZ2V0X2Fic29sdXRlcG9zaXRpb24nXSA9IHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiVkFSXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiVGFjaG9Nb3RvclwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiQWJzb2x1dGUgUG9zaXRpb25cIik7XG4gICAgICAgICAgICB0aGlzLnNldE91dHB1dCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SW5wdXRzSW5saW5lKHRydWUpO1xuICAgICAgICAgICAgdGhpcy5zZXRDb2xvdXIoMjMwKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SGVscFVybChcIlwiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBCbG9ja2x5LkJsb2Nrc1snc2xlZXAnXSA9IHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiVElNRVwiKVxuICAgICAgICAgICAgICAgIC5zZXRDaGVjayhcIk51bWJlclwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIlNsZWVwIChzZWMpXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRQcmV2aW91c1N0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0TmV4dFN0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0Q29sb3VyKDIzMCk7XG4gICAgICAgICAgICB0aGlzLnNldFRvb2x0aXAoXCJcIik7XG4gICAgICAgICAgICB0aGlzLnNldEhlbHBVcmwoXCJcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICBCbG9ja2x5LkJsb2Nrc1snbW90b3Jfc3BlZWQnXSA9IHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiVkFSXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKG51bGwpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiVGFjaG9Nb3RvclwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlNQRUVEXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKFwiTnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiU3BlZWRcIik7XG4gICAgICAgICAgICB0aGlzLnNldElucHV0c0lubGluZSh0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0UHJldmlvdXNTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG4gICAgICAgICAgICB0aGlzLnNldE5leHRTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG4gICAgICAgICAgICB0aGlzLnNldENvbG91cigyMzApO1xuICAgICAgICAgICAgdGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRIZWxwVXJsKFwiXCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIEJsb2NrbHkuQmxvY2tzWydjb2xvcl9zZW5zb3JfYnJpZ2h0bmVzcyddID0ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJWQVJcIilcbiAgICAgICAgICAgICAgICAuc2V0Q2hlY2sobnVsbClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJDb2xvclNlbnNvclwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIkZJUlNUX1NFR1wiKVxuICAgICAgICAgICAgICAgIC5zZXRDaGVjayhcIk51bWJlclwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIkZpcnN0IFNlZ21lbnRcIik7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJTRUNfU0VHXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKFwiTnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiU2Vjb25kIFNlZ21lbnRcIik7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJUSElSRF9TRUdcIilcbiAgICAgICAgICAgICAgICAuc2V0Q2hlY2soXCJOdW1iZXJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJUaGlyZCBTZWdtZW50XCIpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICB0aGlzLnNldElucHV0c0lubGluZSh0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0UHJldmlvdXNTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG4gICAgICAgICAgICB0aGlzLnNldE5leHRTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG4gICAgICAgICAgICB0aGlzLnNldENvbG91cigyMzApO1xuICAgICAgICAgICAgdGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRIZWxwVXJsKFwiXCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIEJsb2NrbHkuQmxvY2tzWydkaXN0YW5jZV9zZW5zb3JfYnJpZ2h0bmVzcyddID0ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJWQVJcIilcbiAgICAgICAgICAgICAgICAuc2V0Q2hlY2sobnVsbClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJEaXN0YW5jZVNlbnNvclwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlRPUF9MRUZUXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKFwiTnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiVG9wIExlZnRcIik7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJCT1RUT01fTEVGVFwiKVxuICAgICAgICAgICAgICAgIC5zZXRDaGVjayhcIk51bWJlclwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIkJvdHRvbSBMZWZ0XCIpO1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiVE9QX1JJR0hUXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKFwiTnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiVG9wIFJpZ2h0XCIpO1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiQk9UVE9NX1JJR0hUXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKFwiTnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiQm90dG9tIFJpZ2h0XCIpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICB0aGlzLnNldElucHV0c0lubGluZSh0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0UHJldmlvdXNTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG4gICAgICAgICAgICB0aGlzLnNldE5leHRTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG4gICAgICAgICAgICB0aGlzLnNldENvbG91cigyMzApO1xuICAgICAgICAgICAgdGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRIZWxwVXJsKFwiXCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIEJsb2NrbHkuQmxvY2tzWydtb3Rvcl9wb3dlciddID0ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJWQVJcIilcbiAgICAgICAgICAgICAgICAuc2V0Q2hlY2sobnVsbClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJNb3RvclwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlBPV0VSXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKFwiTnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiUG93ZXJcIik7XG4gICAgICAgICAgICB0aGlzLnNldElucHV0c0lubGluZSh0cnVlKTtcblxuICAgICAgICAgICAgdGhpcy5zZXRQcmV2aW91c1N0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0TmV4dFN0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0Q29sb3VyKDIzMCk7XG4gICAgICAgICAgICB0aGlzLnNldFRvb2x0aXAoXCJcIik7XG4gICAgICAgICAgICB0aGlzLnNldEhlbHBVcmwoXCJcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICBCbG9ja2x5LkJsb2Nrc1snZGV2aWNlX3N1YnNjcmliZSddID0ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJERVZJQ0VcIilcbiAgICAgICAgICAgICAgICAuc2V0Q2hlY2sobnVsbClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJEZXZpY2VcIik7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZER1bW15SW5wdXQoKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIk1vZGVcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGROdW1iZXIoMCwgMCwgSW5maW5pdHksIDEpLCBcIk1PREVcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJkZWx0YVwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZE51bWJlcigxLCAxKSwgXCJERUxUQVwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcInN1YnNjcmliZVwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgTGV4aWNhbFZhcmlhYmxlcy5GaWVsZFBhcmFtZXRlckZseWRvd24oXG4gICAgICAgICAgICAgICAgICAgICd2YWx1ZScsIHRydWUsXG4gICAgICAgICAgICAgICAgICAgIExleGljYWxWYXJpYWJsZXMuRmllbGRGbHlkb3duLkRJU1BMQVlfQkVMT1cpLCAnVkFSJylcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kU3RhdGVtZW50SW5wdXQoXCJET1wiKVxuICAgICAgICAgICAgICAgIC5zZXRDaGVjayhudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SW5wdXRzSW5saW5lKHRydWUpO1xuICAgICAgICAgICAgdGhpcy5zZXRQcmV2aW91c1N0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0TmV4dFN0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0Q29sb3VyKDIzMCk7XG4gICAgICAgICAgICB0aGlzLnNldFRvb2x0aXAoXCJcIik7XG4gICAgICAgICAgICB0aGlzLnNldEhlbHBVcmwoXCJcIik7XG4gICAgICAgICAgICB0aGlzLmxleGljYWxWYXJQcmVmaXggPSAnY291bnRlcidcbiAgICAgICAgfSxcblxuICAgICAgICBibG9ja3NJblNjb3BlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb25zdCBkb0Jsb2NrID0gdGhpcy5nZXRJbnB1dFRhcmdldEJsb2NrKCdETycpO1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnYmxvY2tzSW5TY29wZScsIGRvQmxvY2spXG4gICAgICAgICAgICBpZiAoZG9CbG9jaykge1xuICAgICAgICAgICAgICAgIHJldHVybiBbZG9CbG9ja107XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZGVjbGFyZWROYW1lczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnZGVjbGFyZWROYW1lcycsIHRoaXMuZ2V0RmllbGRWYWx1ZSgnVkFSJykpXG5cbiAgICAgICAgICAgIHJldHVybiBbdGhpcy5nZXRGaWVsZFZhbHVlKCdWQVInKV07XG4gICAgICAgIH0sXG5cblxuICAgICAgICB3aXRoTGV4aWNhbFZhcnNBbmRQcmVmaXg6IGZ1bmN0aW9uIChjaGlsZCwgcHJvYykge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnd2l0aExleGljYWxWYXJzQW5kUHJlZml4JywgeyBjaGlsZCwgcHJvYyB9KVxuICAgICAgICAgICAgaWYgKHRoaXMuZ2V0SW5wdXRUYXJnZXRCbG9jaygnRE8nKSA9PSBjaGlsZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxleFZhciA9IHRoaXMuZ2V0RmllbGRWYWx1ZSgnVkFSJyk7XG4gICAgICAgICAgICAgICAgcHJvYyhsZXhWYXIsIHRoaXMubGV4aWNhbFZhclByZWZpeCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG59KSgpO1xuIiwiLy8gQHRzLWNoZWNrXG5cblxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJsZWZ0XFxcIj5cXG4gICAgICAgIDxidXR0b24gYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkNvbm5lY3RcXFwiPkNvbm5lY3QgdG8gSFVCPC9idXR0b24+XFxuICAgICAgICBcXG4gICAgICAgIDxidXR0b24gYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkNvZGVcXFwiPkNvZGU8L2J1dHRvbj5cXG5cXG5cXG4gICAgPC9kaXY+XFxuPC9kaXY+XFxuXFxuXFxuPGRpdj5cXG4gICAgPHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZS1hbGxcXFwiPlxcbiAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgIDx0cj5cXG4gICAgICAgICAgICAgICAgPHRoPkh1YjwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5BY3Rpb25zPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPkJhdHRlcnkgTGV2ZWw8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+QWRkcmVzczwvdGg+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGhlYWQ+XFxuICAgICAgICA8dGJvZHkgYm4tZWFjaD1cXFwiaHViRGV2aWNlc1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLmJ0blNodXRkb3duOiBvblNodXREb3duLCBjbGljay5idG5JbmZvOiBvbkluZm8sIGNvbWJvYm94Y2hhbmdlLmNvbWJvOiBvbkh1YkNoYW5nZVxcXCI+XFxuICAgICAgICAgICAgPHRyPlxcbiAgICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogaHVic31cXFwiIGJuLXZhbD1cXFwiJHNjb3BlLiRpLmh1YklkXFxcIiBjbGFzcz1cXFwiY29tYm9cXFwiPjwvZGl2PlxcbiAgICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJidG5TaHV0ZG93blxcXCI+U2h1dGRvd248L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcImJ0bkluZm9cXFwiPkluZm88L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgICAgPHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5iYXR0ZXJ5TGV2ZWxcXFwiPjwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkuYWRkcmVzc1xcXCI+PC90ZD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90Ym9keT5cXG4gICAgPC90YWJsZT5cXG5cXG48L2Rpdj5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnBhZ2VyJywgJ2h1YicsICdicmVpemJvdC5ibG9ja2x5aW50ZXJwcmV0b3InXSxcblxuXG5cdHByb3BzOiB7XG5cdH0sXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXIgXG5cdCAqIEBwYXJhbSB7SFVCfSBodWJcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5CbG9ja2x5SW50ZXJwcmV0b3IuSW50ZXJmYWNlfSBibG9ja2x5SW50ZXJwcmV0b3Jcblx0ICogXG5cdCAqL1xuXHRpbml0OiBhc3luYyBmdW5jdGlvbiAoZWx0LCBwYWdlciwgaHViLCBibG9ja2x5SW50ZXJwcmV0b3IpIHtcblxuXHRcdC8vY29uc3QgY29uZmlnID0ge31cblxuXHRcdGVsdC5maW5kKCdidXR0b24nKS5hZGRDbGFzcygndzMtYnRuIHczLWJsdWUnKVxuXG5cdFx0LyoqQHR5cGUge3tbVVVJRDogc3RyaW5nXTogSFVCLkh1YkRldmljZX19ICovXG5cdFx0Y29uc3QgaHViRGV2aWNlcyA9IHt9XG5cdFx0bGV0IFVVSUQgPSAxXG5cblx0XHRsZXQgY29uZmlnID0gbnVsbFxuXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGN1cnJlbnRDb25maWc6ICcnLFxuXHRcdFx0XHRnYW1lcGFkQ29ubmVjdGVkOiBmYWxzZSxcblx0XHRcdFx0aHViRGV2aWNlczogW10sXG5cdFx0XHRcdGh1YnM6IFsnSFVCMScsICdIVUIyJ11cblxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkNvZGU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkNvZGUnKVxuXHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdjb2RlJywge1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdDb2RlJyxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdGh1YkRldmljZXM6IE9iamVjdC52YWx1ZXMoaHViRGV2aWNlcyksXG5cdFx0XHRcdFx0XHRcdGNvbmZpZyxcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRvbkJhY2s6IGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkJhY2snLCB2YWx1ZSlcblx0XHRcdFx0XHRcdFx0Y29uZmlnID0gdmFsdWVcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uSHViQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmluZGV4KClcblxuXHRcdFx0XHRcdGNvbnN0IGh1YklkID0gJCh0aGlzKS5nZXRWYWx1ZSgpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25IdWJDaGFuZ2UnLCBpZHgsIGh1YklkKVxuXG5cdFx0XHRcdFx0Y29uc3QgaHViRGV2aWNlID0gaHViRGV2aWNlc1tjdHJsLm1vZGVsLmh1YkRldmljZXNbaWR4XS5VVUlEXVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdodWJEZXZpY2UnLCBodWJEZXZpY2UpXG5cdFx0XHRcdFx0aHViRGV2aWNlLm5hbWUgPSBodWJJZFxuXHRcdFx0XHRcdGN0cmwubW9kZWwuaHViRGV2aWNlc1tpZHhdLmh1YklkID0gaHViSWRcblx0XHRcdFx0fSxcblx0XHRcdFx0b25TaHV0RG93bjogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5pbmRleCgpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25TaHV0RG93bicsIGlkeClcblxuXHRcdFx0XHRcdC8qKkB0eXBlIHtBY3Rpb25TcnYuSHViRGVzY30gKi9cblx0XHRcdFx0XHRjb25zdCBodWJEZXNjID0gY3RybC5tb2RlbC5odWJEZXZpY2VzW2lkeF1cblx0XHRcdFx0XHRjb25zdCBodWJEZXZpY2UgPSBodWJEZXZpY2VzW2h1YkRlc2MuVVVJRF1cblx0XHRcdFx0XHRodWJEZXZpY2Uuc2h1dGRvd24oKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkluZm86IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuaW5kZXgoKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uSW5mbycsIGlkeClcblx0XHRcdFx0XHQvKipAdHlwZSB7QWN0aW9uU3J2Lkh1YkRlc2N9ICovXG5cdFx0XHRcdFx0Y29uc3QgaHViRGVzYyA9IGN0cmwubW9kZWwuaHViRGV2aWNlc1tpZHhdXG5cdFx0XHRcdFx0Y29uc3QgaHViRGV2aWNlID0gaHViRGV2aWNlc1todWJEZXNjLlVVSURdXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ2h1YkRldmljZScsIGh1YkRldmljZSlcblxuXHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdodWJpbmZvJywge1xuXHRcdFx0XHRcdFx0dGl0bGU6IGh1YkRlc2MuaHViSWQsXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRodWJEZXZpY2Vcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXG5cblxuXHRcdFx0XHRvbkNvbm5lY3Q6IGFzeW5jIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjb25zdCBodWJEZXZpY2UgPSBhd2FpdCBodWIuY29ubmVjdCgpXG5cdFx0XHRcdFx0Y29uc3QgaWQgPSBVVUlEKytcblxuXHRcdFx0XHRcdGh1YkRldmljZXNbaWRdID0gaHViRGV2aWNlXG5cblx0XHRcdFx0XHRodWJEZXZpY2Uub24oJ2Vycm9yJywgKGRhdGEpID0+IHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKGRhdGEpXG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdGNvbnN0IG5iSHVicyA9IGN0cmwubW9kZWwuaHViRGV2aWNlcy5sZW5ndGhcblx0XHRcdFx0XHRjb25zdCBodWJJZCA9IGBIVUIke25iSHVicyArIDF9YFxuXHRcdFx0XHRcdGh1YkRldmljZS5uYW1lID0gaHViSWRcblx0XHRcdFx0XHRjdHJsLm1vZGVsLmh1YkRldmljZXMucHVzaCh7IFVVSUQ6IGlkLCBodWJJZCwgYmF0dGVyeUxldmVsOiAwLCBhZGRyZXNzOiAnVW5rbm93bicgfSlcblx0XHRcdFx0XHRjdHJsLnVwZGF0ZSgpXG5cblx0XHRcdFx0XHRodWJEZXZpY2Uub24oJ2JhdHRlcnlMZXZlbCcsIChkYXRhKSA9PiB7XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdiYXR0ZXJ5TGV2ZWwnLCBkYXRhKVxuXHRcdFx0XHRcdFx0Y29uc3QgaHViRGVzYyA9IGN0cmwubW9kZWwuaHViRGV2aWNlcy5maW5kKChlKSA9PiBlLlVVSUQgPT0gaWQpXG5cdFx0XHRcdFx0XHRodWJEZXNjLmJhdHRlcnlMZXZlbCA9IGRhdGEuYmF0dGVyeUxldmVsXG5cdFx0XHRcdFx0XHRjdHJsLnVwZGF0ZSgpXG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdGh1YkRldmljZS5vbignYWRkcmVzcycsIChkYXRhKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnYWRkcmVzcycsIGRhdGEpXG5cdFx0XHRcdFx0XHRjb25zdCBodWJEZXNjID0gY3RybC5tb2RlbC5odWJEZXZpY2VzLmZpbmQoKGUpID0+IGUuVVVJRCA9PSBpZClcblx0XHRcdFx0XHRcdGh1YkRlc2MuYWRkcmVzcyA9IGRhdGEuYWRkcmVzc1xuXHRcdFx0XHRcdFx0Y3RybC51cGRhdGUoKVxuXHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0XHRhd2FpdCBodWJEZXZpY2Uuc3RhcnROb3RpZmljYXRpb24oKVxuXG5cdFx0XHRcdFx0aHViRGV2aWNlLm9uKCdkaXNjb25uZWN0ZWQnLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnZGlzY29ubmVjdGVkJylcblx0XHRcdFx0XHRcdGNvbnN0IGlkeCA9IGN0cmwubW9kZWwuaHViRGV2aWNlcy5maW5kSW5kZXgoKGUpID0+IGUuVVVJRCA9PSBpZClcblx0XHRcdFx0XHRcdGN0cmwubW9kZWwuaHViRGV2aWNlcy5zcGxpY2UoaWR4LCAxKVxuXHRcdFx0XHRcdFx0Y3RybC51cGRhdGUoKVxuXHRcdFx0XHRcdFx0ZGVsZXRlIGh1YkRldmljZXNbaWRdXG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHR9XG5cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIvLyBAdHMtY2hlY2tcblxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2NvZGUnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXFxuICAgIDxkaXY+XFxuICAgICAgICA8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25FeHBvcnRcXFwiIHRpdGxlPVxcXCJFeHBvcnQgY3VycmVudCBjb25maWdcXFwiPkV4cG9ydDwvYnV0dG9uPlxcbiAgICAgICAgPGJ1dHRvbiBibi1ldmVudD1cXFwiY2xpY2s6IG9uSW1wb3J0XFxcIiB0aXRsZT1cXFwiSW1wb3J0IGNvbmZpZ1xcXCI+SW1wb3J0PC9idXR0b24+XFxuXFxuICAgICAgICA8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25OZXdDb25maWdcXFwiIGJuLWljb249XFxcImZhIGZhLWZpbGVcXFwiIHRpdGxlPVxcXCJSZXNldCBDb25maWdcXFwiPjwvYnV0dG9uPlxcblxcbiAgICAgICAgPGJ1dHRvbiBibi1ldmVudD1cXFwiY2xpY2s6IG9uQ29uZmlnXFxcIiBibi1pY29uPVxcXCJmYSBmYS1mb2xkZXItb3BlblxcXCIgdGl0bGU9XFxcIk9wZW4gQ29uZmlnXFxcIj48L2J1dHRvbj5cXG5cXG4gICAgICAgIDxidXR0b24gYm4tZXZlbnQ9XFxcImNsaWNrOiBvblNhdmVDb25maWdcXFwiIGJuLWljb249XFxcImZhIGZhLXNhdmVcXFwiIHRpdGxlPVxcXCJTYXZlIGN1cnJlbnQgY29uZmlnXFxcIj48L2J1dHRvbj5cXG5cXG4gICAgICAgIDxidXR0b24gYm4tZXZlbnQ9XFxcImNsaWNrOiBvblJ1blxcXCI+UnVuPC9idXR0b24+XFxuXFxuICAgICAgICA8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25TdG9wXFxcIj5TdG9wPC9idXR0b24+XFxuXFxuICAgICAgICA8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25HYW1lUGFkXFxcIiBibi1zaG93PVxcXCJnYW1lcGFkQ29ubmVjdGVkXFxcIj5HYW1lcGFkPC9idXR0b24+XFxuICAgIDwvZGl2PlxcblxcblxcbiAgICA8ZGl2PlxcbiAgICAgICAgPGRpdiBibi1zaG93PVxcXCJjdXJyZW50Q29uZmlnXFxcIj5cXG4gICAgICAgICAgICA8bGFiZWw+Q3VycmVudCBDb25maWc6PC9sYWJlbD5cXG4gICAgICAgICAgICA8c3BhbiBibi10ZXh0PVxcXCJjdXJyZW50Q29uZmlnXFxcIj48L3NwYW4+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuXFxuXFxuXFxuPC9kaXY+XFxuPGRpdiBpZD1cXFwiYmxvY2tseURpdlxcXCI+PC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwibG9nUGFuZWxcXFwiIGJuLWh0bWw9XFxcImdldExvZ3NcXFwiIGJuLWJpbmQ9XFxcImxvZ1BhbmVsXFxcIj48L2Rpdj5cXG5cXG48eG1sIGlkPVxcXCJ0b29sYm94XFxcIiBzdHlsZT1cXFwiZGlzcGxheTogbm9uZTtcXFwiPlxcblxcbiAgICA8Y2F0ZWdvcnkgbmFtZT1cXFwiTG9naWNcXFwiIGNhdGVnb3J5c3R5bGU9XFxcImxvZ2ljX2NhdGVnb3J5XFxcIj5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJjb250cm9sc19pZlxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsb2dpY19jb21wYXJlXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxvZ2ljX29wZXJhdGlvblxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsb2dpY19uZWdhdGVcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibG9naWNfYm9vbGVhblxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsb2dpY190ZXJuYXJ5XFxcIj48L2Jsb2NrPlxcbiAgICA8L2NhdGVnb3J5PlxcbiAgICA8Y2F0ZWdvcnkgbmFtZT1cXFwiTG9vcFxcXCIgY2F0ZWdvcnlzdHlsZT1cXFwibG9vcF9jYXRlZ29yeVxcXCI+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwiY29udHJvbHNfcmVwZWF0X2V4dFxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlRJTUVTXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj4xMDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImNvbnRyb2xzX3doaWxlVW50aWxcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwiY29udHJvbHNfZm9yXFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiU1RBUlRcXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjE8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJFTkRcXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjEwPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiU1RFUFxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImNvbnRyb2xzX2ZvckVhY2hcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwiY29udHJvbHNfZmxvd19zdGF0ZW1lbnRzXFxcIj48L2Jsb2NrPlxcbiAgICA8L2NhdGVnb3J5PlxcbiAgICA8Y2F0ZWdvcnkgbmFtZT1cXFwiTWF0aFxcXCIgY2F0ZWdvcnlzdHlsZT1cXFwibWF0aF9jYXRlZ29yeVxcXCI+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibWF0aF9hcml0aG1ldGljXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcIm1hdGhfcm91bmRcXFwiPlxcbiAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJPUFxcXCI+Uk9VTkQ8L2ZpZWxkPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJOVU1cXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjMuMTwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcIm1hdGhfc2luZ2xlXFxcIj5cXG4gICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiT1BcXFwiPlJPT1Q8L2ZpZWxkPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJOVU1cXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjk8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJtYXRoX3RyaWdcXFwiPlxcbiAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJPUFxcXCI+U0lOPC9maWVsZD5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiTlVNXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj40NTwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcIm1hdGhfY29uc3RhbnRcXFwiPlxcbiAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJDT05TVEFOVFxcXCI+UEk8L2ZpZWxkPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJtYXRoX3JhbmRvbV9pbnRcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJGUk9NXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj4xPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVE9cXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjEwMDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcIm1hdGhfb25fbGlzdFxcXCI+XFxuICAgICAgICAgICAgPG11dGF0aW9uIG9wPVxcXCJTVU1cXFwiIC8+XFxuICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk9QXFxcIj5TVU08L2ZpZWxkPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgPC9jYXRlZ29yeT5cXG4gICAgPGNhdGVnb3J5IG5hbWU9XFxcIlRleHRcXFwiIGNhdGVnb3J5c3R5bGU9XFxcInRleHRfY2F0ZWdvcnlcXFwiPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcInRleHRcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwidGV4dF9wcmludFxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJ0ZXh0X2xlbmd0aFxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlZBTFVFXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJ0ZXh0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJURVhUXFxcIj5hYmM8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJ0ZXh0X2NoYW5nZUNhc2VcXFwiPlxcbiAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJDQVNFXFxcIj5VUFBFUkNBU0U8L2ZpZWxkPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJURVhUXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJ0ZXh0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJURVhUXFxcIj5hYmM8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJ0ZXh0X2pvaW5cXFwiPlxcbiAgICAgICAgICAgIDxtdXRhdGlvbiBpdGVtcz1cXFwiMlxcXCIgLz5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwidGV4dF9pbmRleE9mXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcInRleHRfY2hhckF0XFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcInRleHRfZ2V0U3Vic3RyaW5nXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcInRleHRfcHJvbXB0X2V4dFxcXCI+XFxuICAgICAgICAgICAgPG11dGF0aW9uIHR5cGU9XFxcIlRFWFRcXFwiIC8+XFxuICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlRZUEVcXFwiPlRFWFQ8L2ZpZWxkPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJURVhUXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJ0ZXh0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJURVhUXFxcIj5hYmM8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgPC9jYXRlZ29yeT5cXG4gICAgPGNhdGVnb3J5IG5hbWU9XFxcIkxpc3RzXFxcIiBjYXRlZ29yeXN0eWxlPVxcXCJsaXN0X2NhdGVnb3J5XFxcIj5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsaXN0c19jcmVhdGVfd2l0aFxcXCI+XFxuICAgICAgICAgICAgPG11dGF0aW9uIGl0ZW1zPVxcXCIwXFxcIj48L211dGF0aW9uPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsaXN0c19jcmVhdGVfd2l0aFxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsaXN0c19yZXBlYXRcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJOVU1cXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjU8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsaXN0c19sZW5ndGhcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfaXNFbXB0eVxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsaXN0c19pbmRleE9mXFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVkFMVUVcXFwiPlxcbiAgICAgICAgICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGV4aWNhbF92YXJpYWJsZV9nZXRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlZBUlxcXCI+bGlzdDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfZ2V0SW5kZXhcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJWQUxVRVxcXCI+XFxuICAgICAgICAgICAgICAgIDxibG9jayB0eXBlPVxcXCJsZXhpY2FsX3ZhcmlhYmxlX2dldFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVkFSXFxcIj5saXN0PC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsaXN0c19zZXRJbmRleFxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIkxJU1RcXFwiPlxcbiAgICAgICAgICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGV4aWNhbF92YXJpYWJsZV9nZXRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlZBUlxcXCI+bGlzdDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfZ2V0U3VibGlzdFxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIkxJU1RcXFwiPlxcbiAgICAgICAgICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGV4aWNhbF92YXJpYWJsZV9nZXRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlZBUlxcXCI+bGlzdDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfc3BsaXRcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJERUxJTVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwidGV4dFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVEVYVFxcXCI+LDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxpc3RzX3NvcnRcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfcmV2ZXJzZVxcXCI+PC9ibG9jaz5cXG4gICAgPC9jYXRlZ29yeT5cXG4gICAgPGNhdGVnb3J5IGlkPVxcXCJjYXRWYXJpYWJsZXNcXFwiIGNvbG91cj1cXFwiMzMwXFxcIiBuYW1lPVxcXCJWYXJpYWJsZXNcXFwiPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImdsb2JhbF9kZWNsYXJhdGlvblxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsb2NhbF9kZWNsYXJhdGlvbl9zdGF0ZW1lbnRcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGV4aWNhbF92YXJpYWJsZV9nZXRcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGV4aWNhbF92YXJpYWJsZV9zZXRcXFwiPjwvYmxvY2s+XFxuICAgIDwvY2F0ZWdvcnk+XFxuICAgIDxjYXRlZ29yeSBuYW1lPVxcXCJGdW5jdGlvbnNcXFwiIGN1c3RvbT1cXFwiUFJPQ0VEVVJFXFxcIiBjYXRlZ29yeXN0eWxlPVxcXCJwcm9jZWR1cmVfY2F0ZWdvcnlcXFwiPjwvY2F0ZWdvcnk+XFxuXFxuXFxuICAgIDxjYXRlZ29yeSBuYW1lPVxcXCJPYmplY3RcXFwiIGNvbG91cj1cXFwiMzU1XFxcIj5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJvYmplY3RfZ2V0ZmllbGRcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJPQkpFQ1RcXFwiPlxcbiAgICAgICAgICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGV4aWNhbF92YXJpYWJsZV9nZXRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlZBUlxcXCI+b2JqZWN0PC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgPC9jYXRlZ29yeT5cXG4gICAgPGNhdGVnb3J5IG5hbWU9XFxcIkRldmljZVxcXCIgY29sb3VyPVxcXCIzNTVcXFwiPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImNyZWF0ZV9kZXZpY2VcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwiZGV2aWNlX2dldHZhbHVlXFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiREVWSUNFXFxcIj5cXG4gICAgICAgICAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxleGljYWxfdmFyaWFibGVfZ2V0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJWQVJcXFwiPmRldmljZTwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwid2FpdF91bnRpbF9kZXZpY2VcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJERVZJQ0VcXFwiPlxcbiAgICAgICAgICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGV4aWNhbF92YXJpYWJsZV9nZXRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlZBUlxcXCI+ZGV2aWNlPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJkZXZpY2Vfc3Vic2NyaWJlXFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiREVWSUNFXFxcIj5cXG4gICAgICAgICAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxleGljYWxfdmFyaWFibGVfZ2V0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJWQVJcXFwiPmRldmljZTwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwiY29sb3Jfc2Vuc29yX2JyaWdodG5lc3NcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJWQVJcXFwiPlxcbiAgICAgICAgICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGV4aWNhbF92YXJpYWJsZV9nZXRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlZBUlxcXCI+c2Vuc29yPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJGSVJTVF9TRUdcXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjEwMDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlNFQ19TRUdcXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjEwMDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlRISVJEX1NFR1xcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTAwPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwiZGlzdGFuY2Vfc2Vuc29yX2JyaWdodG5lc3NcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJWQVJcXFwiPlxcbiAgICAgICAgICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGV4aWNhbF92YXJpYWJsZV9nZXRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlZBUlxcXCI+c2Vuc29yPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJUT1BfTEVGVFxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTAwPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVE9QX1JJR0hUXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj4xMDA8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJCT1RUT01fTEVGVFxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTAwPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiQk9UVE9NX1JJR0hUXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj4xMDA8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgPC9jYXRlZ29yeT5cXG4gICAgPGNhdGVnb3J5IG5hbWU9XFxcIk1vdG9yXFxcIiBjb2xvdXI9XFxcIjM1NVxcXCI+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwiY3JlYXRlX21vdG9yXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcIm1vdG9yX3Bvd2VyXFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVkFSXFxcIj5cXG4gICAgICAgICAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxleGljYWxfdmFyaWFibGVfZ2V0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJWQVJcXFwiPm1vdG9yPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJQT1dFUlxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTAwPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgIDwvY2F0ZWdvcnk+XFxuICAgIDxjYXRlZ29yeSBuYW1lPVxcXCJUYWNob01vdG9yXFxcIiBjb2xvdXI9XFxcIjM1NVxcXCI+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwiY3JlYXRlX3RhY2hvX21vdG9yXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcIm1vdG9yX3NwZWVkXFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVkFSXFxcIj5cXG4gICAgICAgICAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxleGljYWxfdmFyaWFibGVfZ2V0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJWQVJcXFwiPm1vdG9yPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJTUEVFRFxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTAwPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibW90b3Jfc3BlZWRfdGltZVxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlZBUlxcXCI+XFxuICAgICAgICAgICAgICAgIDxibG9jayB0eXBlPVxcXCJsZXhpY2FsX3ZhcmlhYmxlX2dldFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVkFSXFxcIj5tb3RvcjwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVElNRVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlNQRUVEXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj4xMDA8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJtb3Rvcl9zcGVlZF9kZWdyZWVzXFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVkFSXFxcIj5cXG4gICAgICAgICAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxleGljYWxfdmFyaWFibGVfZ2V0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJWQVJcXFwiPm1vdG9yPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJERUdSRUVTXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj4xODA8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJTUEVFRFxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTAwPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibW90b3Jfc3BlZWRfcG9zaXRpb25cXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJWQVJcXFwiPlxcbiAgICAgICAgICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGV4aWNhbF92YXJpYWJsZV9nZXRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlZBUlxcXCI+bW90b3I8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIkFOR0xFXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj4wPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiU1BFRURcXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjEwMDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcIm1vdG9yX3NwZWVkX2Fic19wb3NpdGlvblxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlZBUlxcXCI+XFxuICAgICAgICAgICAgICAgIDxibG9jayB0eXBlPVxcXCJsZXhpY2FsX3ZhcmlhYmxlX2dldFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVkFSXFxcIj5tb3RvcjwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiQU5HTEVcXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjA8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJTUEVFRFxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTAwPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibW90b3JfcmVzZXRfcG9zaXRpb25cXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJWQVJcXFwiPlxcbiAgICAgICAgICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGV4aWNhbF92YXJpYWJsZV9nZXRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlZBUlxcXCI+bW90b3I8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcIm1vdG9yX2dldF9zcGVlZFxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlZBUlxcXCI+XFxuICAgICAgICAgICAgICAgIDxibG9jayB0eXBlPVxcXCJsZXhpY2FsX3ZhcmlhYmxlX2dldFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVkFSXFxcIj5tb3RvcjwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibW90b3JfZ2V0X3Bvc2l0aW9uXFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVkFSXFxcIj5cXG4gICAgICAgICAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxleGljYWxfdmFyaWFibGVfZ2V0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJWQVJcXFwiPm1vdG9yPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJtb3Rvcl9nZXRfYWJzb2x1dGVwb3NpdGlvblxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlZBUlxcXCI+XFxuICAgICAgICAgICAgICAgIDxibG9jayB0eXBlPVxcXCJsZXhpY2FsX3ZhcmlhYmxlX2dldFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVkFSXFxcIj5tb3RvcjwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuXFxuICAgIDwvY2F0ZWdvcnk+XFxuICAgIDxjYXRlZ29yeSBuYW1lPVxcXCJQYWlyTW90b3JcXFwiIGNvbG91cj1cXFwiMzU1XFxcIj5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJjcmVhdGVfcGFpcl9tb3RvclxcXCI+XFxuICAgICAgICAgICAgPEZJRUxEIG5hbWU9XFxcIlBPUlQyXFxcIj5CPC9GSUVMRD5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwicGFpcl9tb3Rvcl9zcGVlZFxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlZBUlxcXCI+XFxuICAgICAgICAgICAgICAgIDxibG9jayB0eXBlPVxcXCJsZXhpY2FsX3ZhcmlhYmxlX2dldFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVkFSXFxcIj5tb3RvcjwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiU1BFRUQxXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj4xMDA8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJTUEVFRDJcXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjEwMDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcblxcblxcbiAgICA8L2NhdGVnb3J5PlxcbiAgICA8Y2F0ZWdvcnkgbmFtZT1cXFwiSHViXFxcIiBjb2xvdXI9XFxcIjM1NVxcXCI+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwiaHViX2NvbG9yXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImh1Yl9nZXRfdGlsdFxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJodWJfZ2V0X2ltcGFjdF9jb3VudFxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJodWJfc2V0X2ltcGFjdF9jb3VudFxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlZBUlxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImh1Yl9nZXRfdm9sdGFnZVxcXCI+PC9ibG9jaz5cXG4gICAgPC9jYXRlZ29yeT5cXG4gICAgPGNhdGVnb3J5IG5hbWU9XFxcIlN5c3RlbVxcXCIgY29sb3VyPVxcXCIzNTVcXFwiPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcInNsZWVwXFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVElNRVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICA8L2NhdGVnb3J5PlxcblxcbjwveG1sPlwiLFxuXG5cdGRlcHM6IFtcblx0XHQnYnJlaXpib3QucGFnZXInLFxuXHRcdCdicmVpemJvdC5ibG9ja2x5aW50ZXJwcmV0b3InLCBcblx0XHQnaHViJywgXG5cdFx0J2JyZWl6Ym90LmdhbWVwYWQnLCBcblx0XHQnYnJlaXpib3QuaHR0cCcsXG5cdFx0J2JyZWl6Ym90LmZpbGVzJyxcblx0XHQnYnJlaXpib3QuYmxvY2tseUxleGljYWwnXG5cdF0sXG5cblx0cHJvcHM6IHtcblx0XHRodWJEZXZpY2VzOiBudWxsLFxuXHRcdGNvbmZpZzogbnVsbCxcblxuXHR9LFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkJsb2NrbHlJbnRlcnByZXRvci5JbnRlcmZhY2V9IGJsb2NrbHlJbnRlcnByZXRvclxuXHQgKiBAcGFyYW0ge0hVQn0gaHViU3J2XG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuR2FtZXBhZC5JbnRlcmZhY2V9IGdhbWVwYWRcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5IdHRwLkludGVyZmFjZX0gaHR0cFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkZpbGVzLkludGVyZmFjZX0gZmlsZVNydlxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkJsb2NrbHlMZXhpY2FsLkludGVyZmFjZX0gYmxvY2tseVNydlxuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIsIGJsb2NrbHlJbnRlcnByZXRvciwgaHViU3J2LCBnYW1lcGFkLCBodHRwLCBmaWxlU3J2LCBibG9ja2x5U3J2KSB7XG5cblx0XHRjb25zb2xlLmxvZygncHJvcHMnLCB0aGlzLnByb3BzKVxuXG5cdFx0Y29uc3QgcHJvZ3Jlc3NEbGcgPSAkJC51aS5wcm9ncmVzc0RpYWxvZygnTG9hZGluZyBkZXZpY2UgaW5mbycpXG5cblx0XHQvKipAdHlwZSB7QXJyYXk8SFVCLkh1YkRldmljZT59ICovXG5cdFx0Y29uc3QgaHViRGV2aWNlcyA9IHRoaXMucHJvcHMuaHViRGV2aWNlc1xuXG5cdFx0ZWx0LmZpbmQoJ2J1dHRvbicpLmFkZENsYXNzKCd3My1idG4gdzMtYmx1ZScpXG5cblx0XHRsZXQgeyBjb25maWcgfSA9IHRoaXMucHJvcHNcblxuXHRcdGlmIChjb25maWcgPT0gbnVsbCkge1xuXHRcdFx0Y29uZmlnID0ge1xuXHRcdFx0XHRjb2RlOiBudWxsLFxuXHRcdFx0XHRnYW1lcGFkSWQ6ICcnLFxuXHRcdFx0XHRtYXBwaW5nczoge30sXG5cdFx0XHRcdG5hbWU6ICcnXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Y29uc29sZS5sb2coJ2NvbmZpZycsIGNvbmZpZylcblxuXHRcdGdhbWVwYWQub24oJ2Nvbm5lY3RlZCcsIChldikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2dhbWVwYWQgY29ubm5lY3RlZCcsIGV2KVxuXHRcdFx0Y29uZmlnLmdhbWVwYWRJZCA9IGV2LmlkXG5cdFx0XHRjb25maWcuZ2FtZXBhZE1hcHBpbmcgPSBjb25maWcubWFwcGluZ3NbZXYuaWRdXG5cdFx0XHRjb25zb2xlLmxvZyh7IGdhbWVwYWRNYXBwaW5nOiBjb25maWcuZ2FtZXBhZE1hcHBpbmcgfSlcblxuXHRcdFx0Y3RybC5zZXREYXRhKHsgZ2FtZXBhZENvbm5lY3RlZDogdHJ1ZSB9KVxuXHRcdFx0Z2FtZXBhZC5jaGVja0dhbWVQYWRTdGF0dXMoKVxuXG5cdFx0fSlcblxuXHRcdGdhbWVwYWQub24oJ2Rpc2Nvbm5lY3RlZCcsIChldikgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2dhbWVwYWQgZGlzY29ubmVjdGVkJylcblx0XHRcdGN0cmwuc2V0RGF0YSh7IGdhbWVwYWRDb25uZWN0ZWQ6IGZhbHNlIH0pXG5cdFx0XHRjb25maWcuZ2FtZXBhZE1hcHBpbmcgPSBudWxsXG5cdFx0XHRjb25maWcuZ2FtZXBhZElkID0gJydcblxuXHRcdH0pXG5cblx0XHRhc3luYyBmdW5jdGlvbiBjYWxsRnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGF3YWl0IGJsb2NrbHlJbnRlcnByZXRvci5jYWxsRnVuY3Rpb24obmFtZSwgdmFsdWUpXG5cdFx0XHR9XG5cdFx0XHRjYXRjaCAoZSkge1xuXHRcdFx0XHRpZiAodHlwZW9mIGUgPT0gJ3N0cmluZycpIHtcblx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyB0aXRsZTogJ0Vycm9yJywgY29udGVudDogZSB9KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0bGV0IGdhbWVwYWRBeGVzVmFsdWUgPSB7fVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gb25HYW1lcGFkQXhlKGRhdGEpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ2F4ZScsIGRhdGEpXG5cdFx0XHRpZiAoY29uZmlnLmdhbWVwYWRNYXBwaW5nKSB7XG5cdFx0XHRcdGNvbnN0IHsgYWN0aW9uIH0gPSBjb25maWcuZ2FtZXBhZE1hcHBpbmcuYXhlc1tkYXRhLmlkXVxuXHRcdFx0XHRsZXQgeyB2YWx1ZSB9ID0gZGF0YVxuXHRcdFx0XHRpZiAoYWN0aW9uICE9ICdOb25lJykge1xuXHRcdFx0XHRcdHZhbHVlID0gTWF0aC5zaWduKHZhbHVlKSAqIDEwMFxuXHRcdFx0XHRcdGlmICh2YWx1ZSAhPSAoZ2FtZXBhZEF4ZXNWYWx1ZVtkYXRhLmlkXSB8fCAwKSkge1xuXHRcdFx0XHRcdFx0Z2FtZXBhZEF4ZXNWYWx1ZVtkYXRhLmlkXSA9IHZhbHVlXG5cdFx0XHRcdFx0XHRhd2FpdCBjYWxsRnVuY3Rpb24oYWN0aW9uLCB2YWx1ZSlcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGFzeW5jIGZ1bmN0aW9uIG9uR2FtZXBhZEJ1dHRvbkRvd24oZGF0YSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2J1dHRvbkRvd24nLCBkYXRhLmlkKVxuXHRcdFx0aWYgKGNvbmZpZy5nYW1lcGFkTWFwcGluZykge1xuXHRcdFx0XHRjb25zdCB7IGRvd24sIGRvd25WYWx1ZSB9ID0gY29uZmlnLmdhbWVwYWRNYXBwaW5nLmJ1dHRvbnNbZGF0YS5pZF1cblx0XHRcdFx0aWYgKGRvd24gIT0gJ05vbmUnKSB7XG5cdFx0XHRcdFx0YXdhaXQgY2FsbEZ1bmN0aW9uKGRvd24sIGRvd25WYWx1ZSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGFzeW5jIGZ1bmN0aW9uIG9uR2FtZXBhZEJ1dHRvblVwKGRhdGEpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdidXR0b25Eb3duJywgZGF0YS5pZClcblx0XHRcdGlmIChjb25maWcuZ2FtZXBhZE1hcHBpbmcpIHtcblx0XHRcdFx0Y29uc3QgeyB1cCwgdXBWYWx1ZSB9ID0gY29uZmlnLmdhbWVwYWRNYXBwaW5nLmJ1dHRvbnNbZGF0YS5pZF1cblx0XHRcdFx0aWYgKHVwICE9ICdOb25lJykge1xuXHRcdFx0XHRcdGF3YWl0IGNhbGxGdW5jdGlvbih1cCwgdXBWYWx1ZSlcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZW5hYmxlQ2FsbGJhY2soZW5hYmxlZCkge1xuXHRcdFx0aWYgKGVuYWJsZWQpIHtcblx0XHRcdFx0Z2FtZXBhZC5vbignYXhlJywgb25HYW1lcGFkQXhlKVxuXHRcdFx0XHRnYW1lcGFkLm9uKCdidXR0b25Eb3duJywgb25HYW1lcGFkQnV0dG9uRG93bilcblx0XHRcdFx0Z2FtZXBhZC5vbignYnV0dG9uVXAnLCBvbkdhbWVwYWRCdXR0b25VcClcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRnYW1lcGFkLm9mZignYXhlJywgb25HYW1lcGFkQXhlKVxuXHRcdFx0XHRnYW1lcGFkLm9mZignYnV0dG9uRG93bicsIG9uR2FtZXBhZEJ1dHRvbkRvd24pXG5cdFx0XHRcdGdhbWVwYWQub2ZmKCdidXR0b25VcCcsIG9uR2FtZXBhZEJ1dHRvblVwKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGVuYWJsZUNhbGxiYWNrKHRydWUpXG5cblxuXHRcdHRoaXMuZGlzcG9zZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdkaXNwb3NlJylcblx0XHRcdGVuYWJsZUNhbGxiYWNrKGZhbHNlKVxuXG5cdFx0fVxuXG5cdFx0YmxvY2tseVNydi5pbmplY3QoJ2Jsb2NrbHlEaXYnLCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG9vbGJveCcpKVxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLnNldExvZ0Z1bmN0aW9uKCh0ZXh0KSA9PiB7XG5cdFx0XHRjdHJsLm1vZGVsLmxvZ3MucHVzaCh0ZXh0KVxuXHRcdFx0Y3RybC51cGRhdGUoKVxuXHRcdFx0bG9nUGFuZWwuc2Nyb2xsVG9Cb3R0b20oKVxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiBnZXRIdWIoYmxvY2spIHtcblx0XHRcdC8qKkB0eXBlIHtzdHJpbmd9ICovXG5cdFx0XHRjb25zdCBodWJOYW1lID0gYmxvY2suZmllbGRzLkhVQlxuXHRcdFx0Y29uc3QgaHViRGV2aWNlID0gaHViRGV2aWNlcy5maW5kKGUgPT4gZS5uYW1lID09IGh1Yk5hbWUpXG5cdFx0XHRpZiAoaHViRGV2aWNlID09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHR0aHJvdyBgSHViICR7aHViTmFtZX0gaXMgbm90IGNvbm5lY3RlZGBcblx0XHRcdH1cblx0XHRcdHJldHVybiBodWJEZXZpY2Vcblx0XHR9XG5cblxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnb2JqZWN0X2dldGZpZWxkJywgYXN5bmMgKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykgPT4ge1xuXG5cdFx0XHQvKipAdHlwZSB7c3RyaW5nfSAqL1xuXHRcdFx0Y29uc3QgZmllbGROYW1lID0gYmxvY2suZmllbGRzLkZJRUxEXG5cblx0XHRcdGNvbnN0IG9iamVjdCA9IGF3YWl0IGJsb2NrbHlJbnRlcnByZXRvci5ldmFsQ29kZShibG9jay5pbnB1dHMuT0JKRUNULCBsb2NhbFZhcmlhYmxlcylcblx0XHRcdGNvbnNvbGUubG9nKHsgZmllbGROYW1lLCBvYmplY3QgfSlcblxuXHRcdFx0cmV0dXJuIG9iamVjdFtmaWVsZE5hbWVdXG5cblx0XHR9KVxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnY3JlYXRlX2RldmljZScsIGFzeW5jIChibG9jaywgbG9jYWxWYXJpYWJsZXMpID0+IHtcblxuXHRcdFx0LyoqQHR5cGUge251bWJlcn0gKi9cblx0XHRcdGNvbnN0IHBvcnQgPSBibG9jay5maWVsZHMuUE9SVFxuXG5cdFx0XHRjb25zdCBodWJEZXZpY2UgPSBnZXRIdWIoYmxvY2spXG5cblx0XHRcdGNvbnN0IGRldmljZSA9IGh1YkRldmljZS5nZXREZXZpY2UocG9ydClcblx0XHRcdGNvbnNvbGUubG9nKHsgcG9ydCwgZGV2aWNlIH0pXG5cdFx0XHRyZXR1cm4gZGV2aWNlXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ2RldmljZV9nZXR2YWx1ZScsIGFzeW5jIChibG9jaywgbG9jYWxWYXJpYWJsZXMpID0+IHtcblx0XHRcdC8qKkB0eXBlIHtIVUIuRGV2aWNlTW9kZX0gKi9cblx0XHRcdGNvbnN0IG1vZGUgPSBibG9jay5maWVsZHMuTU9ERVxuXHRcdFx0LyoqQHR5cGUge0hVQi5EZXZpY2V9ICovXG5cdFx0XHRjb25zdCBkZXZpY2UgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLkRFVklDRSwgbG9jYWxWYXJpYWJsZXMpXG5cdFx0XHRjb25zb2xlLmxvZyh7IG1vZGUsIGRldmljZSB9KVxuXHRcdFx0cmV0dXJuIGRldmljZS5nZXRWYWx1ZShtb2RlKVxuXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ3dhaXRfdW50aWxfZGV2aWNlJywgYXN5bmMgKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykgPT4ge1xuXG5cdFx0XHQvKipAdHlwZSB7SFVCLkRldmljZU1vZGV9ICovXG5cdFx0XHRjb25zdCBtb2RlID0gYmxvY2suZmllbGRzLk1PREVcblxuXHRcdFx0LyoqQHR5cGUge0hVQi5EZXZpY2V9ICovXG5cdFx0XHRjb25zdCBkZXZpY2UgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLkRFVklDRSwgbG9jYWxWYXJpYWJsZXMpXG5cdFx0XHRjb25zdCB2YXJOYW1lID0gYmxvY2suZmllbGRzLlZBUlxuXHRcdFx0Y29uc29sZS5sb2coeyB2YXJOYW1lLCBtb2RlLCBkZXZpY2UgfSlcblxuXHRcdFx0YXdhaXQgZGV2aWNlLndhaXRUZXN0VmFsdWUobW9kZSwgYXN5bmMgKHZhbHVlKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCd3YWl0VGVzdFZhbHVlJywgdmFsdWUpXG5cdFx0XHRcdGxvY2FsVmFyaWFibGVzW3Zhck5hbWVdID0gdmFsdWVcblx0XHRcdFx0LyoqQHR5cGUge2Jvb2xlYW59ICovXG5cdFx0XHRcdGNvbnN0IHJldFZhbHVlID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5URVNULCBsb2NhbFZhcmlhYmxlcylcblx0XHRcdFx0cmV0dXJuIHJldFZhbHVlXG5cdFx0XHR9KVxuXHRcdFx0ZGVsZXRlIGxvY2FsVmFyaWFibGVzW3Zhck5hbWVdXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ2RldmljZV9zdWJzY3JpYmUnLCBhc3luYyAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSA9PiB7XG5cblx0XHRcdC8qKkB0eXBlIHtIVUIuRGV2aWNlTW9kZX0gKi9cblx0XHRcdGNvbnN0IG1vZGUgPSBibG9jay5maWVsZHMuTU9ERVxuXG5cdFx0XHRjb25zdCBkZWx0YUludGVydmFsID0gYmxvY2suZmllbGRzLkRFTFRBXG5cblx0XHRcdC8qKkB0eXBlIHtIVUIuRGV2aWNlfSAqL1xuXHRcdFx0Y29uc3QgZGV2aWNlID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5ERVZJQ0UsIGxvY2FsVmFyaWFibGVzKVxuXHRcdFx0Y29uc3QgdmFyTmFtZSA9IGJsb2NrLmZpZWxkcy5WQVJcblx0XHRcdGNvbnNvbGUubG9nKHsgdmFyTmFtZSwgbW9kZSwgZGVsdGFJbnRlcnZhbCwgZGV2aWNlIH0pXG5cblx0XHRcdGF3YWl0IGRldmljZS5zdWJzY3JpYmUobW9kZSwgYXN5bmMgKHZhbHVlKSA9PiB7XG5cdFx0XHRcdGxvY2FsVmFyaWFibGVzW3Zhck5hbWVdID0gdmFsdWVcblx0XHRcdFx0YXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5ETywgbG9jYWxWYXJpYWJsZXMpXG5cdFx0XHR9LCBkZWx0YUludGVydmFsKVxuXHRcdFx0ZGVsZXRlIGxvY2FsVmFyaWFibGVzW3Zhck5hbWVdXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ2NyZWF0ZV9wYWlyX21vdG9yJywgYXN5bmMgKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykgPT4ge1xuXG5cdFx0XHQvKipAdHlwZSB7c3RyaW5nfSAqL1xuXHRcdFx0Y29uc3QgcG9ydE5hbWUxID0gYmxvY2suZmllbGRzLlBPUlQxXG5cblx0XHRcdC8qKkB0eXBlIHtzdHJpbmd9ICovXG5cdFx0XHRjb25zdCBwb3J0TmFtZTIgPSBibG9jay5maWVsZHMuUE9SVDJcblxuXHRcdFx0Y29uc3QgaHViRGV2aWNlID0gZ2V0SHViKGJsb2NrKVxuXHRcdFx0Y29uc3QgbW90b3IgPSBhd2FpdCBodWJEZXZpY2UuZ2V0RGJsTW90b3IoaHViU3J2LlBvcnRNYXBbcG9ydE5hbWUxXSwgaHViU3J2LlBvcnRNYXBbcG9ydE5hbWUyXSlcblxuXHRcdFx0cmV0dXJuIG1vdG9yXG5cblx0XHR9KVxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnY3JlYXRlX3RhY2hvX21vdG9yJywgYXN5bmMgKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykgPT4ge1xuXG5cdFx0XHQvKipAdHlwZSB7c3RyaW5nfSAqL1xuXHRcdFx0Y29uc3QgcG9ydE5hbWUgPSBibG9jay5maWVsZHMuUE9SVFxuXG5cdFx0XHRjb25zdCBodWJEZXZpY2UgPSBnZXRIdWIoYmxvY2spXG5cdFx0XHRjb25zdCBtb3RvciA9IGh1YkRldmljZS5nZXREZXZpY2UoaHViU3J2LlBvcnRNYXBbcG9ydE5hbWVdKVxuXHRcdFx0aWYgKCFodWJTcnYuaXNUYWNob01vdG9yKG1vdG9yKSkge1xuXHRcdFx0XHR0aHJvdyBgRGV2aWNlIGNvbm5lY3RlZCB0byBwb3J0ICcke3BvcnROYW1lfScgaXMgbm90IG9mIGEgVGFjaG9Nb3RvcmBcblx0XHRcdH1cblx0XHRcdHJldHVybiBtb3RvclxuXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ2NyZWF0ZV9tb3RvcicsIGFzeW5jIChibG9jaywgbG9jYWxWYXJpYWJsZXMpID0+IHtcblxuXHRcdFx0LyoqQHR5cGUge3N0cmluZ30gKi9cblx0XHRcdGNvbnN0IHBvcnROYW1lID0gYmxvY2suZmllbGRzLlBPUlRcblxuXHRcdFx0Y29uc3QgaHViRGV2aWNlID0gZ2V0SHViKGJsb2NrKVxuXHRcdFx0Y29uc3QgbW90b3IgPSBodWJEZXZpY2UuZ2V0RGV2aWNlKGh1YlNydi5Qb3J0TWFwW3BvcnROYW1lXSlcblx0XHRcdGlmICghaHViU3J2LmlzTW90b3IobW90b3IpKSB7XG5cdFx0XHRcdHRocm93IGBEZXZpY2UgY29ubmVjdGVkIHRvIHBvcnQgJyR7cG9ydE5hbWV9JyBpcyBub3Qgb2YgYSBNb3RvcmBcblx0XHRcdH1cblx0XHRcdHJldHVybiBtb3RvclxuXG5cdFx0fSlcblxuXHRcdGFzeW5jIGZ1bmN0aW9uIGdldE1vdG9yKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykge1xuXHRcdFx0LyoqQHR5cGUge0hVQi5Nb3Rvcn0gKi9cblx0XHRcdGNvbnN0IG1vdG9yID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5WQVIsIGxvY2FsVmFyaWFibGVzKVxuXHRcdFx0aWYgKCFodWJTcnYuaXNNb3Rvcihtb3RvcikpIHtcblx0XHRcdFx0dGhyb3cgYGlucHV0IGlzIG5vdCBvZiB0eXBlIE1vdG9yYFxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG1vdG9yXG5cdFx0fVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gZ2V0VGFjaG9Nb3RvcihibG9jaywgbG9jYWxWYXJpYWJsZXMpIHtcblx0XHRcdC8qKkB0eXBlIHtIVUIuVGFjaG9Nb3Rvcn0gKi9cblx0XHRcdGNvbnN0IG1vdG9yID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5WQVIsIGxvY2FsVmFyaWFibGVzKVxuXG5cdFx0XHRpZiAoIWh1YlNydi5pc1RhY2hvTW90b3IobW90b3IpKSB7XG5cdFx0XHRcdHRocm93IGBpbnB1dCBpcyBub3Qgb2YgdHlwZSBUYWNob01vdG9yYFxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG1vdG9yXG5cdFx0fVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gZ2V0UGFpck1vdG9yKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykge1xuXHRcdFx0LyoqQHR5cGUge0hVQi5Eb3VibGVNb3Rvcn0gKi9cblx0XHRcdGNvbnN0IG1vdG9yID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5WQVIsIGxvY2FsVmFyaWFibGVzKVxuXHRcdFx0Ly9jb25zb2xlLmxvZygnbW90b3InLCBtb3Rvcilcblx0XHRcdGlmICghaHViU3J2LmlzRG91YmxlTW90b3IobW90b3IpKSB7XG5cdFx0XHRcdHRocm93IGBpbnB1dCBpcyBub3Qgb2YgdHlwZSBQYWlyTW90b3JgXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbW90b3Jcblx0XHR9XG5cblx0XHRibG9ja2x5SW50ZXJwcmV0b3IuYWRkQmxvY2tUeXBlKCdjb2xvcl9zZW5zb3JfYnJpZ2h0bmVzcycsIGFzeW5jIChibG9jaywgbG9jYWxWYXJpYWJsZXMpID0+IHtcblxuXHRcdFx0LyoqQHR5cGUge0hVQi5Db2xvclNlbnNvcn0gKi9cblx0XHRcdGNvbnN0IGRldmljZSA9IGF3YWl0IGJsb2NrbHlJbnRlcnByZXRvci5ldmFsQ29kZShibG9jay5pbnB1dHMuVkFSLCBsb2NhbFZhcmlhYmxlcylcblx0XHRcdGlmICghaHViU3J2LmlzQ29sb3JTZW5zb3IoZGV2aWNlKSkge1xuXHRcdFx0XHR0aHJvdyBgaW5wdXQgaXMgbm90IG9mIHR5cGUgQ29sb3JTZW5zb3JgXG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IGZpcnN0U2VnID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5GSVJTVF9TRUcsIGxvY2FsVmFyaWFibGVzKVxuXHRcdFx0Y29uc3Qgc2VjU2VnID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5TRUNfU0VHLCBsb2NhbFZhcmlhYmxlcylcblx0XHRcdGNvbnN0IHRoaXJkU2VnID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5USElSRF9TRUcsIGxvY2FsVmFyaWFibGVzKVxuXG5cdFx0XHRjb25zb2xlLmxvZyh7IGRldmljZSwgZmlyc3RTZWcsIHNlY1NlZywgdGhpcmRTZWcgfSlcblx0XHRcdGF3YWl0IGRldmljZS5zZXRCcmlnaHRuZXNzKGZpcnN0U2VnLCBzZWNTZWcsIHRoaXJkU2VnKVxuXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ2Rpc3RhbmNlX3NlbnNvcl9icmlnaHRuZXNzJywgYXN5bmMgKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykgPT4ge1xuXG5cdFx0XHQvKipAdHlwZSB7SFVCLkRpc3RhbmNlU2Vuc29yfSAqL1xuXHRcdFx0Y29uc3QgZGV2aWNlID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5WQVIsIGxvY2FsVmFyaWFibGVzKVxuXHRcdFx0aWYgKCFodWJTcnYuaXNEaXN0YW5jZVNlbnNvcihkZXZpY2UpKSB7XG5cdFx0XHRcdHRocm93IGBpbnB1dCBpcyBub3Qgb2YgdHlwZSBEaXN0YW5jZVNlbnNvcmBcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgdG9wTGVmdCA9IGF3YWl0IGJsb2NrbHlJbnRlcnByZXRvci5ldmFsQ29kZShibG9jay5pbnB1dHMuVE9QX0xFRlQsIGxvY2FsVmFyaWFibGVzKVxuXHRcdFx0Y29uc3QgdG9wUmlnaHQgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLlRPUF9SSUdIVCwgbG9jYWxWYXJpYWJsZXMpXG5cdFx0XHRjb25zdCBib3R0b21MZWZ0ID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5CT1RUT01fTEVGVCwgbG9jYWxWYXJpYWJsZXMpXG5cdFx0XHRjb25zdCBib3R0b21SaWdodCA9IGF3YWl0IGJsb2NrbHlJbnRlcnByZXRvci5ldmFsQ29kZShibG9jay5pbnB1dHMuQk9UVE9NX1JJR0hULCBsb2NhbFZhcmlhYmxlcylcblxuXHRcdFx0Y29uc29sZS5sb2coeyBkZXZpY2UsIHRvcExlZnQsIHRvcFJpZ2h0LCBib3R0b21MZWZ0LCBib3R0b21SaWdodCB9KVxuXHRcdFx0YXdhaXQgZGV2aWNlLnNldEJyaWdodG5lc3ModG9wTGVmdCwgYm90dG9tTGVmdCwgdG9wUmlnaHQsIGJvdHRvbVJpZ2h0KVxuXG5cdFx0fSlcblxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnbW90b3JfcG93ZXInLCBhc3luYyAoYmxvY2ssIGxvY2FsVmFyaWFibGVzKSA9PiB7XG5cblx0XHRcdC8qKkB0eXBlIHtudW1iZXJ9ICovXG5cdFx0XHRjb25zdCBwb3dlciA9IGF3YWl0IGJsb2NrbHlJbnRlcnByZXRvci5ldmFsQ29kZShibG9jay5pbnB1dHMuUE9XRVIsIGxvY2FsVmFyaWFibGVzKVxuXG5cdFx0XHRjb25zdCBtb3RvciA9IGF3YWl0IGdldE1vdG9yKGJsb2NrLCBsb2NhbFZhcmlhYmxlcylcblxuXHRcdFx0Y29uc29sZS5sb2coeyBwb3dlciB9KVxuXHRcdFx0YXdhaXQgbW90b3Iuc2V0UG93ZXIocG93ZXIpXG5cblx0XHR9KVxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnbW90b3Jfc3BlZWQnLCBhc3luYyAoYmxvY2ssICBsb2NhbFZhcmlhYmxlcykgPT4ge1xuXG5cdFx0XHQvKipAdHlwZSB7bnVtYmVyfSAqL1xuXHRcdFx0Y29uc3Qgc3BlZWQgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLlNQRUVELCBsb2NhbFZhcmlhYmxlcylcblxuXHRcdFx0Y29uc3QgbW90b3IgPSBhd2FpdCBnZXRUYWNob01vdG9yKGJsb2NrLCBsb2NhbFZhcmlhYmxlcylcblxuXHRcdFx0Y29uc29sZS5sb2coeyBzcGVlZCB9KVxuXHRcdFx0YXdhaXQgbW90b3Iuc2V0U3BlZWQoc3BlZWQpXG5cblx0XHR9KVxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgncGFpcl9tb3Rvcl9zcGVlZCcsIGFzeW5jIChibG9jaywgbG9jYWxWYXJpYWJsZXMpID0+IHtcblxuXHRcdFx0LyoqQHR5cGUge251bWJlcn0gKi9cblx0XHRcdGNvbnN0IHNwZWVkMSA9IGF3YWl0IGJsb2NrbHlJbnRlcnByZXRvci5ldmFsQ29kZShibG9jay5pbnB1dHMuU1BFRUQxLCBsb2NhbFZhcmlhYmxlcylcblx0XHRcdC8qKkB0eXBlIHtudW1iZXJ9ICovXG5cdFx0XHRjb25zdCBzcGVlZDIgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLlNQRUVEMiwgbG9jYWxWYXJpYWJsZXMpXG5cblx0XHRcdGNvbnN0IG1vdG9yID0gYXdhaXQgZ2V0UGFpck1vdG9yKGJsb2NrLCBsb2NhbFZhcmlhYmxlcylcblxuXHRcdFx0Y29uc29sZS5sb2coJ3NldFNwZWVkJywgeyBzcGVlZDEsIHNwZWVkMiB9KVxuXHRcdFx0YXdhaXQgbW90b3Iuc2V0U3BlZWQoc3BlZWQxLCBzcGVlZDIpXG5cblx0XHR9KVxuXG5cblx0XHRibG9ja2x5SW50ZXJwcmV0b3IuYWRkQmxvY2tUeXBlKCdtb3Rvcl9zcGVlZF90aW1lJywgYXN5bmMgKGJsb2NrLCBsb2NhbFZhcmlhYmxlcykgPT4ge1xuXG5cdFx0XHQvKipAdHlwZSB7bnVtYmVyfSAqL1xuXHRcdFx0Y29uc3Qgc3BlZWQgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLlNQRUVELCBsb2NhbFZhcmlhYmxlcylcblxuXHRcdFx0Y29uc3Qgd2FpdEVuZCA9IGJsb2NrLmZpZWxkcy5XQUlUXG5cblx0XHRcdC8qKkB0eXBlIHtudW1iZXJ9ICovXG5cdFx0XHRjb25zdCB0aW1lID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5USU1FLCBsb2NhbFZhcmlhYmxlcylcblxuXHRcdFx0Y29uc3QgbW90b3IgPSBhd2FpdCBnZXRUYWNob01vdG9yKGJsb2NrLCBsb2NhbFZhcmlhYmxlcylcblxuXHRcdFx0Y29uc29sZS5sb2coeyBzcGVlZCwgdGltZSwgd2FpdEVuZCwgbW90b3IgfSlcblx0XHRcdGF3YWl0IG1vdG9yLnNldFNwZWVkRm9yVGltZShzcGVlZCwgdGltZSAqIDEwMDAsIHdhaXRFbmQsIGh1YlNydi5CcmFraW5nU3R5bGUuRkxPQVQpXG5cblx0XHR9KVxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnbW90b3Jfc3BlZWRfZGVncmVlcycsIGFzeW5jIChibG9jaywgIGxvY2FsVmFyaWFibGVzKSA9PiB7XG5cblx0XHRcdGNvbnN0IG1vdG9yID0gYXdhaXQgZ2V0VGFjaG9Nb3RvcihibG9jaywgbG9jYWxWYXJpYWJsZXMpXG5cblx0XHRcdC8qKkB0eXBlIHtudW1iZXJ9ICovXG5cdFx0XHRjb25zdCBzcGVlZCA9IGF3YWl0IGJsb2NrbHlJbnRlcnByZXRvci5ldmFsQ29kZShibG9jay5pbnB1dHMuU1BFRUQsIGxvY2FsVmFyaWFibGVzKVxuXG5cdFx0XHRjb25zdCB3YWl0RW5kID0gYmxvY2suZmllbGRzLldBSVRcblxuXHRcdFx0LyoqQHR5cGUge251bWJlcn0gKi9cblx0XHRcdGNvbnN0IGRlZ3JlZXMgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLkRFR1JFRVMsIGxvY2FsVmFyaWFibGVzKVxuXG5cdFx0XHRjb25zb2xlLmxvZyh7IHNwZWVkLCBkZWdyZWVzLCB3YWl0RW5kIH0pXG5cdFx0XHRhd2FpdCBtb3Rvci5yb3RhdGVEZWdyZWVzKGRlZ3JlZXMsIHNwZWVkLCB3YWl0RW5kLCBodWJTcnYuQnJha2luZ1N0eWxlLkJSQUtFKVxuXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ21vdG9yX3NwZWVkX3Bvc2l0aW9uJywgYXN5bmMgKGJsb2NrLCAgbG9jYWxWYXJpYWJsZXMpID0+IHtcblxuXHRcdFx0Y29uc3QgbW90b3IgPSBhd2FpdCBnZXRUYWNob01vdG9yKGJsb2NrLCBsb2NhbFZhcmlhYmxlcylcblxuXHRcdFx0LyoqQHR5cGUge251bWJlcn0gKi9cblx0XHRcdGNvbnN0IHNwZWVkID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5TUEVFRCwgbG9jYWxWYXJpYWJsZXMpXG5cblx0XHRcdGNvbnN0IHdhaXRFbmQgPSBibG9jay5maWVsZHMuV0FJVFxuXG5cdFx0XHQvKipAdHlwZSB7bnVtYmVyfSAqL1xuXHRcdFx0Y29uc3QgYW5nbGUgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLkFOR0xFLCBsb2NhbFZhcmlhYmxlcylcblxuXHRcdFx0Y29uc29sZS5sb2coeyBzcGVlZCwgYW5nbGUsIHdhaXRFbmQgfSlcblx0XHRcdGF3YWl0IG1vdG9yLmdvdG9BbmdsZShhbmdsZSwgc3BlZWQsIHdhaXRFbmQsIGh1YlNydi5CcmFraW5nU3R5bGUuQlJBS0UpXG5cblx0XHR9KVxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnbW90b3Jfc3BlZWRfYWJzX3Bvc2l0aW9uJywgYXN5bmMgKGJsb2NrLCAgbG9jYWxWYXJpYWJsZXMpID0+IHtcblxuXHRcdFx0Y29uc3QgbW90b3IgPSBhd2FpdCBnZXRUYWNob01vdG9yKGJsb2NrLCBsb2NhbFZhcmlhYmxlcylcblxuXHRcdFx0LyoqQHR5cGUge251bWJlcn0gKi9cblx0XHRcdGNvbnN0IHNwZWVkID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5TUEVFRCwgbG9jYWxWYXJpYWJsZXMpXG5cblx0XHRcdGNvbnN0IHdhaXRFbmQgPSBibG9jay5maWVsZHMuV0FJVFxuXG5cdFx0XHQvKipAdHlwZSB7bnVtYmVyfSAqL1xuXHRcdFx0Y29uc3QgYW5nbGUgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLkFOR0xFLCBsb2NhbFZhcmlhYmxlcylcblxuXHRcdFx0Y29uc29sZS5sb2coeyBzcGVlZCwgYW5nbGUsIHdhaXRFbmQgfSlcblx0XHRcdGF3YWl0IG1vdG9yLmdvdG9BYnNQb3NpdGlvbihhbmdsZSwgc3BlZWQsIHdhaXRFbmQsIGh1YlNydi5CcmFraW5nU3R5bGUuQlJBS0UpXG5cblx0XHR9KVxuXG5cblx0XHRibG9ja2x5SW50ZXJwcmV0b3IuYWRkQmxvY2tUeXBlKCdtb3Rvcl9yZXNldF9wb3NpdGlvbicsIGFzeW5jIChibG9jaywgIGxvY2FsVmFyaWFibGVzKSA9PiB7XG5cblx0XHRcdGNvbnN0IG1vdG9yID0gYXdhaXQgZ2V0VGFjaG9Nb3RvcihibG9jaywgbG9jYWxWYXJpYWJsZXMpXG5cdFx0XHRhd2FpdCBtb3Rvci5yZXNldFplcm8oKVxuXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ21vdG9yX2dldF9zcGVlZCcsIGFzeW5jIChibG9jaywgIGxvY2FsVmFyaWFibGVzKSA9PiB7XG5cblx0XHRcdGNvbnN0IG1vdG9yID0gYXdhaXQgZ2V0VGFjaG9Nb3RvcihibG9jaywgbG9jYWxWYXJpYWJsZXMpXG5cdFx0XHRyZXR1cm4gbW90b3IuZ2V0U3BlZWQoKVxuXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ21vdG9yX2dldF9wb3NpdGlvbicsIGFzeW5jIChibG9jaywgIGxvY2FsVmFyaWFibGVzKSA9PiB7XG5cblx0XHRcdGNvbnN0IG1vdG9yID0gYXdhaXQgZ2V0VGFjaG9Nb3RvcihibG9jaywgbG9jYWxWYXJpYWJsZXMpXG5cdFx0XHRyZXR1cm4gbW90b3IuZ2V0UG9zaXRpb24oKVxuXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ21vdG9yX2dldF9hYnNvbHV0ZXBvc2l0aW9uJywgYXN5bmMgKGJsb2NrLCAgbG9jYWxWYXJpYWJsZXMpID0+IHtcblxuXHRcdFx0Y29uc3QgbW90b3IgPSBhd2FpdCBnZXRUYWNob01vdG9yKGJsb2NrLCBsb2NhbFZhcmlhYmxlcylcblx0XHRcdHJldHVybiBtb3Rvci5nZXRBYnNvbHV0ZVBvc2l0aW9uKClcblxuXHRcdH0pXG5cblx0XHRibG9ja2x5SW50ZXJwcmV0b3IuYWRkQmxvY2tUeXBlKCdodWJfY29sb3InLCBhc3luYyAoYmxvY2ssICBsb2NhbFZhcmlhYmxlcykgPT4ge1xuXG5cdFx0XHQvKipAdHlwZSB7c3RyaW5nfSAqL1xuXHRcdFx0Y29uc3QgY29sb3IgPSBibG9jay5maWVsZHMuQ09MT1JcblxuXHRcdFx0Y29uc3QgaHViRGV2aWNlID0gZ2V0SHViKGJsb2NrKVxuXHRcdFx0LyoqQHR5cGUge0hVQi5SZ2JMZWR9ICovXG5cdFx0XHRjb25zdCBsZWQgPSBodWJEZXZpY2UuZ2V0RGV2aWNlKGh1YlNydi5Qb3J0TWFwLkhVQl9MRUQpXG5cdFx0XHRhd2FpdCBsZWQuc2V0Q29sb3IoaHViU3J2LkNvbG9yW2NvbG9yXSlcblxuXHRcdH0pXG5cblx0XHRhc3luYyBmdW5jdGlvbiBnZXRIdWJWYWx1ZShibG9jaywgcG9ydElkLCBtb2RlKSB7XG5cdFx0XHRjb25zdCBodWJEZXZpY2UgPSBnZXRIdWIoYmxvY2spXG5cdFx0XHRjb25zdCBkZXZpY2UgPSBodWJEZXZpY2UuZ2V0RGV2aWNlKHBvcnRJZClcblx0XHRcdGNvbnNvbGUubG9nKCdnZXRIdWJWYWx1ZScsIHtwb3J0SWQsIG1vZGUsIGRldmljZX0pXG5cdFx0XHRyZXR1cm4gZGV2aWNlLmdldFZhbHVlKG1vZGUpXG5cdFx0fVxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnaHViX2dldF92b2x0YWdlJywgYXN5bmMgKGJsb2NrLCAgbG9jYWxWYXJpYWJsZXMpID0+IHtcblxuXHRcdFx0cmV0dXJuIGdldEh1YlZhbHVlKGJsb2NrLCBodWJTcnYuUG9ydE1hcC5WT0xUQUdFX1NFTlNPUiwgMClcblxuXHRcdH0pXG5cblx0XHRibG9ja2x5SW50ZXJwcmV0b3IuYWRkQmxvY2tUeXBlKCdodWJfZ2V0X2ltcGFjdF9jb3VudCcsIGFzeW5jIChibG9jaywgIGxvY2FsVmFyaWFibGVzKSA9PiB7XG5cblx0XHRcdHJldHVybiBnZXRIdWJWYWx1ZShibG9jaywgaHViU3J2LlBvcnRNYXAuVElMVF9TRU5TT1IsIDEpXG5cblx0XHR9KVxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnaHViX3NldF9pbXBhY3RfY291bnQnLCBhc3luYyAoYmxvY2ssICBsb2NhbFZhcmlhYmxlcykgPT4ge1xuXG5cdFx0XHRjb25zdCBjb3VudCA9IGF3YWl0IGJsb2NrbHlJbnRlcnByZXRvci5ldmFsQ29kZShibG9jay5pbnB1dHMuVkFSLCBsb2NhbFZhcmlhYmxlcylcblx0XHRcdGNvbnN0IGh1YkRldmljZSA9IGdldEh1YihibG9jaylcblx0XHRcdGNvbnNvbGUubG9nKHtjb3VudCwgaHViRGV2aWNlfSlcblx0XHRcdC8qKkB0eXBlIHtIVUIuVGlsdFNlbnNvcn0gKi9cblx0XHRcdGNvbnN0IGRldmljZSA9IGh1YkRldmljZS5nZXREZXZpY2UoaHViU3J2LlBvcnRNYXAuVElMVF9TRU5TT1IpXG5cdFx0XHRyZXR1cm4gZGV2aWNlLnNldEltcGFjdENvdW50KGNvdW50KVxuXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ2h1Yl9nZXRfdGlsdCcsIGFzeW5jIChibG9jaywgIGxvY2FsVmFyaWFibGVzKSA9PiB7XG5cblx0XHRcdC8qKkB0eXBlIHtzdHJpbmd9ICovXG5cdFx0XHRjb25zdCB0eXBlID0gYmxvY2suZmllbGRzLlRZUEVcblxuXHRcdFx0Y29uc3QgdmFsdWUgPSBhd2FpdCBnZXRIdWJWYWx1ZShibG9jaywgaHViU3J2LlBvcnRNYXAuVElMVF9TRU5TT1IsIGh1YlNydi5EZXZpY2VNb2RlLlRJTFRfUE9TKVxuXHRcdFx0cmV0dXJuIHZhbHVlW3R5cGVdXG5cblx0XHR9KVxuXG5cblx0XHRibG9ja2x5SW50ZXJwcmV0b3IuYWRkQmxvY2tUeXBlKCdzbGVlcCcsIGFzeW5jIChibG9jaywgIGxvY2FsVmFyaWFibGVzKSA9PiB7XG5cdFx0XHRjb25zdCB0aW1lID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5USU1FLCBsb2NhbFZhcmlhYmxlcylcblx0XHRcdGNvbnNvbGUubG9nKHsgdGltZSB9KVxuXHRcdFx0YXdhaXQgJCQudXRpbC53YWl0KHRpbWUgKiAxMDAwKVxuXHRcdFx0Y29uc29sZS5sb2coJ1RpbWVvdXQnKVxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiBsb2FkQ29kZShjb2RlKSB7XG5cdFx0XHRjb25zdCB3b3Jrc3BhY2UgPSBCbG9ja2x5LmdldE1haW5Xb3Jrc3BhY2UoKTtcblx0XHRcdEJsb2NrbHkuc2VyaWFsaXphdGlvbi53b3Jrc3BhY2VzLmxvYWQoY29kZSwgd29ya3NwYWNlKTtcblx0XHR9XG5cblx0XHRpZiAoY29uZmlnLmNvZGUgIT0gbnVsbCkge1xuXHRcdFx0bG9hZENvZGUoY29uZmlnLmNvZGUpXG5cdFx0fVxuXG5cdFx0dGhpcy5vbkJhY2sgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdvbkJhY2snKVxuXHRcdFx0Y29uZmlnLmNvZGUgPSBnZXRDb2RlKClcblx0XHRcdHJldHVybiBjb25maWdcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRDb2RlKCkge1xuXHRcdFx0cmV0dXJuIEJsb2NrbHkuc2VyaWFsaXphdGlvbi53b3Jrc3BhY2VzLnNhdmUoQmxvY2tseS5nZXRNYWluV29ya3NwYWNlKCkpXG5cdFx0fVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gc3RvcCgpIHtcblx0XHRcdGZvciAoY29uc3QgaHViIG9mIGh1YkRldmljZXMpIHtcblx0XHRcdFx0Zm9yIChjb25zdCBkZXZpY2Ugb2YgaHViLmdldEh1YkRldmljZXMoKSkge1xuXHRcdFx0XHRcdGlmIChodWJTcnYuaXNNb3RvcihkZXZpY2UpKSB7XG5cdFx0XHRcdFx0XHRhd2FpdCBkZXZpY2Uuc2V0UG93ZXIoMClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YXdhaXQgZGV2aWNlLnVuc3Vic2NyaWJlKClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0Y3VycmVudENvbmZpZzogY29uZmlnLm5hbWUsXG5cdFx0XHRcdGdhbWVwYWRDb25uZWN0ZWQ6IGNvbmZpZy5nYW1lcGFkSWQgIT0gJycsXG5cdFx0XHRcdGxvZ3M6IFtdLFxuXHRcdFx0XHRnZXRMb2dzOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMubG9ncy5qb2luKCc8YnI+Jylcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkV4cG9ydDogYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0bGV0IGZpbGVOYW1lID0gYXdhaXQgJCQudWkuc2hvd1Byb21wdCh7dGl0bGU6ICdFeHBvcnQnLCBsYWJlbDogJ0ZpbGVOYW1lOiAnfSlcblx0XHRcdFx0XHRpZiAoZmlsZU5hbWUpIHtcblx0XHRcdFx0XHRcdGNvbnN0IGpzb25UZXh0ID0gSlNPTi5zdHJpbmdpZnkoe2NvZGU6IGdldENvZGUoKSwgbWFwcGluZ3M6IGNvbmZpZy5tYXBwaW5nc30pXG5cdFx0XHRcdFx0XHRjb25zdCBibG9iID0gbmV3IEJsb2IoW2pzb25UZXh0XSwgeyB0eXBlOiAnYXBwbGljYXRpb24vanNvbicgfSlcblx0XHRcdFx0XHRcdGZpbGVOYW1lICs9ICcucG93J1xuXHRcdFx0XHRcdFx0YXdhaXQgZmlsZVNydi5zYXZlRmlsZShibG9iLCBmaWxlTmFtZSlcblx0XHRcdFx0XHRcdCQubm90aWZ5KCdDb2RlIGV4cG9ydGVkJywgJ3N1Y2Nlc3MnKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25JbXBvcnQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdicmVpemJvdC5maWxlcycsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnT3BlbiBGaWxlJyxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdGZpbHRlckV4dGVuc2lvbjogJ3Bvdydcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRldmVudHM6IHtcblx0XHRcdFx0XHRcdFx0ZmlsZWNsaWNrOiBmdW5jdGlvbiAoZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKGRhdGEpXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRvblJldHVybjogYXN5bmMgZnVuY3Rpb24gKGRhdGEpIHtcblx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25SZXR1cm4nLCBkYXRhKVxuXHRcdFx0XHRcdFx0XHRjb25zdCB1cmwgPSBmaWxlU3J2LmZpbGVVcmwoZGF0YS5yb290RGlyICsgZGF0YS5maWxlTmFtZSlcblx0XHRcdFx0XHRcdFx0Y29uc3QgcmVzcCA9IGF3YWl0IGZldGNoKHVybClcblx0XHRcdFx0XHRcdFx0Y29uc3Qge2NvZGUsIG1hcHBpbmdzfSA9IGF3YWl0IHJlc3AuanNvbigpXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKHtjb2RlLCBtYXBwaW5nc30pXG5cdFx0XHRcdFx0XHRcdGNvbmZpZy5jb2RlID0gY29kZVxuXHRcdFx0XHRcdFx0XHRjb25maWcubmFtZSA9ICcnXG5cdFx0XHRcdFx0XHRcdGNvbmZpZy5tYXBwaW5ncyA9IG1hcHBpbmdzXG5cdFx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGN1cnJlbnRDb25maWc6ICcnIH0pXG5cdFx0XHRcdFx0XHRcdGNvbmZpZy5nYW1lcGFkTWFwcGluZyA9IGNvbmZpZy5tYXBwaW5nc1tjb25maWcuZ2FtZXBhZElkXVxuXHRcdFx0XHRcdFx0XHRsb2FkQ29kZShjb25maWcuY29kZSlcblxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uU3RvcDogYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0YXdhaXQgc3RvcCgpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uR2FtZVBhZDogZnVuY3Rpb24gKCkge1xuXG5cdFx0XHRcdFx0Y29uc3QgY29kZSA9IGdldENvZGUoKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdjb2RlJywgY29kZSlcblx0XHRcdFx0XHRlbmFibGVDYWxsYmFjayhmYWxzZSlcblxuXHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdnYW1lcGFkJywge1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdHYW1lcGFkJyxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdG1hcHBpbmc6IGNvbmZpZy5nYW1lcGFkTWFwcGluZyxcblx0XHRcdFx0XHRcdFx0YWN0aW9uczogKGNvZGUgIT0gbnVsbCkgPyBibG9ja2x5SW50ZXJwcmV0b3IuZ2V0RnVuY3Rpb25OYW1lcyhjb2RlKSA6IFtdXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0b25SZXR1cm46IGFzeW5jIChtYXBwaW5nKSA9PiB7XG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblJldHVybicsIG1hcHBpbmcpXG5cblx0XHRcdFx0XHRcdFx0Y29uZmlnLmdhbWVwYWRNYXBwaW5nID0gbWFwcGluZ1xuXHRcdFx0XHRcdFx0XHRjb25maWcubWFwcGluZ3NbbWFwcGluZy5pZF0gPSBtYXBwaW5nXG5cdFx0XHRcdFx0XHRcdGVuYWJsZUNhbGxiYWNrKHRydWUpXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0b25CYWNrOiAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdGVuYWJsZUNhbGxiYWNrKHRydWUpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25OZXdDb25maWc6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjb25maWcubWFwcGluZ3MgPSB7fVxuXHRcdFx0XHRcdGNvbmZpZy5nYW1lcGFkTWFwcGluZyA9IG51bGxcblx0XHRcdFx0XHRjb25maWcubmFtZSA9ICcnXG5cdFx0XHRcdFx0Y29uc3Qgd29ya3NwYWNlID0gQmxvY2tseS5nZXRNYWluV29ya3NwYWNlKClcblx0XHRcdFx0XHR3b3Jrc3BhY2UuY2xlYXIoKVxuXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgY3VycmVudENvbmZpZzogJycgfSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25TYXZlQ29uZmlnOiBhc3luYyBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uY29kZVNhdmVDb25maWcnLCBjb25maWcpXG5cdFx0XHRcdFx0aWYgKGN0cmwubW9kZWwuY3VycmVudENvbmZpZyA9PSAnJykge1xuXHRcdFx0XHRcdFx0Y29uc3QgY3VycmVudENvbmZpZyA9IGF3YWl0ICQkLnVpLnNob3dQcm9tcHQoeyB0aXRsZTogJ1NhdmUgQ29uZmlnJywgbGFiZWw6ICdDb25maWcgTmFtZTonIH0pXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKHtjdXJyZW50Q29uZmlnfSlcblx0XHRcdFx0XHRcdGlmIChjdXJyZW50Q29uZmlnKSB7XG5cdFx0XHRcdFx0XHRcdGF3YWl0IGh0dHAucG9zdCgnL2FkZCcsIHsgbmFtZTogY3VycmVudENvbmZpZywgY29kZTogZ2V0Q29kZSgpLCBtYXBwaW5nczogY29uZmlnLm1hcHBpbmdzIH0pXG5cdFx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGN1cnJlbnRDb25maWcgfSlcblx0XHRcdFx0XHRcdFx0Y29uZmlnLm5hbWUgPSBjdXJyZW50Q29uZmlnXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0YXdhaXQgaHR0cC5wb3N0KCcvdXBkYXRlJywgeyBuYW1lOiBjb25maWcubmFtZSwgY29kZTogZ2V0Q29kZSgpLCBtYXBwaW5nczogY29uZmlnLm1hcHBpbmdzIH0pXG5cdFx0XHRcdFx0XHQkLm5vdGlmeShgQ29uZmlnICcke2NvbmZpZy5uYW1lfScgdXBkYXRlZGAsICdzdWNjZXNzJylcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25Db25maWc6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkNvbmZpZycpXG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2NvbmZpZ0N0cmwnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0NvbmZpZ3VyYXRpb25zJyxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdGN1cnJlbnRDb25maWc6IGN0cmwubW9kZWwuY3VycmVudENvbmZpZ1xuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbiAoZGF0YSkge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnbmV3Q29uZmlnJywgZGF0YSlcblx0XHRcdFx0XHRcdFx0Y29uZmlnLmNvZGUgPSBkYXRhLmNvZGVcblx0XHRcdFx0XHRcdFx0Y29uZmlnLm5hbWUgPSBkYXRhLm5hbWVcblx0XHRcdFx0XHRcdFx0Y29uZmlnLm1hcHBpbmdzID0gZGF0YS5tYXBwaW5nc1xuXHRcdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBjdXJyZW50Q29uZmlnOiBkYXRhLm5hbWUgfSlcblx0XHRcdFx0XHRcdFx0Y29uZmlnLmdhbWVwYWRNYXBwaW5nID0gY29uZmlnLm1hcHBpbmdzW2NvbmZpZy5nYW1lcGFkSWRdXG5cdFx0XHRcdFx0XHRcdGxvYWRDb2RlKGNvbmZpZy5jb2RlKVxuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKHtnYW1lcGFkTWFwcGluZ30pXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25SdW46IGFzeW5jIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25SdW4nKVxuXHRcdFx0XHRcdGF3YWl0IHN0b3AoKVxuXHRcdFx0XHRcdHByb2dyZXNzRGxnLnNldFBlcmNlbnRhZ2UoMClcblx0XHRcdFx0XHRwcm9ncmVzc0RsZy5zaG93KClcblx0XHRcdFx0XHRsZXQgbmJBY2Nlc3MgPSAwXG5cdFx0XHRcdFx0Zm9yIChjb25zdCBodWIgb2YgaHViRGV2aWNlcykge1xuXHRcdFx0XHRcdFx0bmJBY2Nlc3MgKz0gaHViLmdldEh1YkRldmljZXMoKS5sZW5ndGhcblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjb25zb2xlLmxvZyh7IG5iQWNjZXNzIH0pXG5cdFx0XHRcdFx0Y29uc3QgcmFuZ2UgPSAkJC51dGlsLm1hcFJhbmdlKDAsIG5iQWNjZXNzLCAwLCAxKVxuXHRcdFx0XHRcdGxldCBpID0gMFxuXHRcdFx0XHRcdGZvciAoY29uc3QgaHViIG9mIGh1YkRldmljZXMpIHtcblx0XHRcdFx0XHRcdGZvciAoY29uc3QgZGV2aWNlIG9mIGh1Yi5nZXRIdWJEZXZpY2VzKCkpIHtcblx0XHRcdFx0XHRcdFx0YXdhaXQgZGV2aWNlLnJlYWRJbmZvKClcblx0XHRcdFx0XHRcdFx0cHJvZ3Jlc3NEbGcuc2V0UGVyY2VudGFnZShyYW5nZSgrK2kpKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRwcm9ncmVzc0RsZy5oaWRlKClcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gZ2V0Q29kZSgpXG5cdFx0XHRcdFx0Z2FtZXBhZEF4ZXNWYWx1ZSA9IHt9XG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgbG9nczogW10gfSlcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0YXdhaXQgYmxvY2tseUludGVycHJldG9yLnN0YXJ0Q29kZShpbmZvKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjYXRjaCAoZSkge1xuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBlID09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7IHRpdGxlOiAnRXJyb3InLCBjb250ZW50OiBlIH0pXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0Y29uc3QgbG9nUGFuZWwgPSBjdHJsLnNjb3BlLmxvZ1BhbmVsXG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiLy8gQHRzLWNoZWNrXG5cbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdjb25maWdDdHJsJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgYm4tc2hvdz1cXFwiIWhhc0NvbmZpZ3NcXFwiIGNsYXNzPVxcXCJtZXNzYWdlXFxcIj5cXG4gICAgTm8gY29uZmlndXJhdGlvbnMgZGVmaW5lZFxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsXFxcIiBibi1zaG93PVxcXCJoYXNDb25maWdzXFxcIj5cXG4gICAgPGRpdiBibi1lYWNoPVxcXCJjb25maWdzXFxcIiBjbGFzcz1cXFwiaXRlbXNcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5pdGVtOiBvbkl0ZW1DbGljaywgY29udGV4dG1lbnVjaGFuZ2UuaXRlbTpvbkl0ZW1Db250ZXh0TWVudVxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJ3My1jYXJkLTIgaXRlbVxcXCIgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgYm4tZGF0YT1cXFwie1xcbiAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHtcXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGU6IHtuYW1lOiBcXCdSZW1vdmVcXCcsIGljb246IFxcJ2ZhcyBmYS10cmFzaC1hbHRcXCd9XFxuICAgICAgICAgICAgICAgICAgICB9XFxuICAgICAgICAgICAgICAgIH1cXFwiPlxcbiAgICAgICAgICAgIDxkaXY+XFxuICAgICAgICAgICAgICAgIDxzdHJvbmcgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLm5hbWVcXFwiPjwvc3Ryb25nPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInLCAnYnJlaXpib3QuaHR0cCddLFxuXG5cdHByb3BzOiB7XG5cdFx0Y3VycmVudENvbmZpZzogJydcblx0fSxcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5IdHRwLkludGVyZmFjZX0gaHR0cFxuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIsIGh0dHApIHtcblxuXHRcdC8vY29uc29sZS5sb2coJ3Byb3BzJywgdGhpcy5wcm9wcylcblxuXHRcdGNvbnN0IHtjdXJyZW50Q29uZmlnfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0Y29uZmlnczogW10sXG5cdFx0XHRcdGhhc0NvbmZpZ3M6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmNvbmZpZ3MubGVuZ3RoID4gMFxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uSXRlbUNvbnRleHRNZW51OiBhc3luYyBmdW5jdGlvbihldiwgZGF0YSkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnLml0ZW0nKS5pbmRleCgpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25JdGVtQ29udGV4dE1lbnUnLCBpZHgsIGRhdGEpXG5cdFx0XHRcdFx0Y29uc3QgY29uZmlnID0gY3RybC5tb2RlbC5jb25maWdzW2lkeF1cblx0XHRcdFx0XHRpZiAoZGF0YS5jbWQgPT0gJ2RlbGV0ZScpIHtcblx0XHRcdFx0XHRcdGlmIChjb25maWcubmFtZSA9PSBjdXJyZW50Q29uZmlnKSB7XG5cdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7Y29udGVudDogJ0Nhbm5vdCBkZWxldGUgYWN0aXZlIGNvbmZpZycsIHRpdGxlOiAnV2FybmluZyd9KVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGF3YWl0IGh0dHAucG9zdCgnL2RlbGV0ZScsIGNvbmZpZylcblx0XHRcdFx0XHRcdFx0bG9hZENvbmZpZygpXG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHR9LFxuICAgICAgICAgICAgICAgIG9uSXRlbUNsaWNrOiBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCcuaXRlbScpLmluZGV4KClcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25JdGVtQ2xpY2snLCBpZHgpXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbmZpZyA9IGN0cmwubW9kZWwuY29uZmlnc1tpZHhdXG5cdFx0XHRcdFx0cGFnZXIucG9wUGFnZShjb25maWcpXG5cblxuICAgICAgICAgICAgICAgIH1cdFxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRhc3luYyBmdW5jdGlvbiBsb2FkQ29uZmlnKCkge1xuXHRcdFx0Y29uc3QgY29uZmlncyA9IGF3YWl0IGh0dHAuZ2V0KCcvJylcblx0XHRcdGNvbnNvbGUubG9nKHtjb25maWdzfSlcblx0XHRcdGN0cmwuc2V0RGF0YSh7Y29uZmlnc30pXG5cdFx0fVxuXG5cdFx0bG9hZENvbmZpZygpXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIvLyBAdHMtY2hlY2tcblxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2dhbWVwYWQnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdj5cXG4gICAgPGgyIGJuLXRleHQ9XFxcImlkXFxcIj48L2gyPlxcbjwvZGl2PlxcblxcbjxoMz5BeGVzPC9oMz5cXG48ZGl2PlxcbiAgICA8dGFibGUgY2xhc3M9XFxcInczLXRhYmxlLWFsbCBheGVUYWJsZVxcXCI+XFxuICAgICAgICA8dGhlYWQ+XFxuICAgICAgICAgICAgPHRyPlxcbiAgICAgICAgICAgICAgICA8dGg+QXhlPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPkFjdGlvbjwvdGg+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGhlYWQ+XFxuICAgICAgICA8dGJvZHkgYm4tZWFjaD1cXFwiYXhlc1xcXCIgYm4tYmluZD1cXFwiYXhlc1xcXCIgYm4taW5kZXg9XFxcImlkeFxcXCI+XFxuICAgICAgICAgICAgPHRyPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tdGV4dD1cXFwiZ2V0QXhlTGFiZWxcXFwiPjwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBhY3Rpb25zfVxcXCIgYm4tdmFsPVxcXCIkc2NvcGUuJGkuYWN0aW9uXFxcIlxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVxcXCJpdGVtXFxcIj48L2Rpdj5cXG4gICAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90Ym9keT5cXG4gICAgPC90YWJsZT5cXG48L2Rpdj5cXG5cXG48aDM+QnV0dG9uczwvaDM+XFxuPGRpdiBjbGFzcz1cXFwiY29tbWFuZFRhYmxlXFxcIj5cXG4gICAgPHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZS1hbGxcXFwiPlxcbiAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgIDx0cj5cXG4gICAgICAgICAgICAgICAgPHRoPkJ1dHRvbjwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5Eb3duPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPlVwPC90aD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90aGVhZD5cXG4gICAgICAgIDx0Ym9keSBibi1lYWNoPVxcXCJidXR0b25zXFxcIiBibi1iaW5kPVxcXCJidXR0b25zXFxcIiBibi1pbmRleD1cXFwiaWR4XFxcIj5cXG4gICAgICAgICAgICA8dHI+XFxuICAgICAgICAgICAgICAgIDx0ZCBibi10ZXh0PVxcXCJnZXRCdXR0b25MYWJlbFxcXCI+PC90ZD5cXG4gICAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiaXRlbVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGFjdGlvbnN9XFxcIiBibi12YWw9XFxcIiRzY29wZS4kaS5kb3duXFxcIlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cXFwiZG93blxcXCI+PC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IGJuLXZhbD1cXFwiJHNjb3BlLiRpLmRvd25WYWx1ZVxcXCIgdHlwZT1cXFwibnVtYmVyXFxcIiBjbGFzcz1cXFwiZG93blZhbHVlXFxcIj5cXG5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpdGVtXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogYWN0aW9uc31cXFwiIGJuLXZhbD1cXFwiJHNjb3BlLiRpLnVwXFxcIiBjbGFzcz1cXFwidXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCBibi12YWw9XFxcIiRzY29wZS4kaS51cFZhbHVlXFxcIiB0eXBlPVxcXCJudW1iZXJcXFwiIGNsYXNzPVxcXCJ1cFZhbHVlXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcblxcblxcbiAgICAgICAgICAgICAgICA8L3RkPlxcblxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICA8L3Rib2R5PlxcbiAgICA8L3RhYmxlPlxcbjwvZGl2PlwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInLCAnYnJlaXpib3QuZ2FtZXBhZCddLFxuXG5cdHByb3BzOiB7XG5cdFx0bWFwcGluZzogbnVsbCxcblx0XHRhY3Rpb25zOiBudWxsXG5cdH0sXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXIgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuR2FtZXBhZC5JbnRlcmZhY2V9IGdhbWVwYWRcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHBhZ2VyLCBnYW1lcGFkKSB7XG5cblx0XHRjb25zb2xlLmxvZygncHJvcHMnLCB0aGlzLnByb3BzKVxuXG5cdFx0Y29uc3Qge21hcHBpbmcsIGFjdGlvbnN9ID0gdGhpcy5wcm9wc1xuXG5cdFx0YWN0aW9ucy51bnNoaWZ0KCdOb25lJylcblxuXHRcdGNvbnNvbGUubG9nKHRoaXMucHJvcHMpXG5cblx0XHRsZXQgYXhlcyA9IFtdXG5cdFx0bGV0IGJ1dHRvbnMgPSBbXVxuXG5cdFx0Y29uc3QgaW5mbyA9IGdhbWVwYWQuZ2V0R2FtZXBhZHMoKVswXVxuXHRcdGNvbnNvbGUubG9nKHsgaW5mbyB9KVxuXG5cdFx0aWYgKG1hcHBpbmcgIT0gbnVsbCkge1xuXHRcdFx0YXhlcyA9IG1hcHBpbmcuYXhlc1xuXHRcdFx0YnV0dG9ucyA9IG1hcHBpbmcuYnV0dG9uc1xuXHRcdH1cblxuXHRcdGlmIChheGVzLmxlbmd0aCA9PSAwKSB7XG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGluZm8uYXhlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRheGVzLnB1c2goeyBhY3Rpb246ICdOb25lJyB9KVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChidXR0b25zLmxlbmd0aCA9PSAwKSB7XHRcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgaW5mby5idXR0b25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGJ1dHRvbnMucHVzaCh7IHVwOiAnTm9uZScsIGRvd246ICdOb25lJywgdXBWYWx1ZTogMCwgZG93blZhbHVlOiAxIH0pXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcmVzZXRWYWx1ZSgpIHtcblx0XHRcdGxldCBheGVzID0gW11cblx0XHRcdGxldCBidXR0b25zID0gW11cblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgaW5mby5heGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGF4ZXMucHVzaCh7IGFjdGlvbjogJ05vbmUnIH0pXG5cdFx0XHR9XG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGluZm8uYnV0dG9ucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRidXR0b25zLnB1c2goeyB1cDogJ05vbmUnLCBkb3duOiAnTm9uZScsIHVwVmFsdWU6IDAsIGRvd25WYWx1ZTogMSB9KVxuXHRcdFx0fVxuXHRcdFx0Y3RybC5zZXREYXRhKHtheGVzLCBidXR0b25zfSlcblx0XHR9XG5cblx0XHRcblx0XHRmdW5jdGlvbiBvbkdhbWVwYWRBeGUoZGF0YSkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnYXhlJywgZGF0YSlcblx0XHRcdGNvbnN0IHsgdmFsdWUsIGlkIH0gPSBkYXRhXG5cdFx0XHRpZiAodmFsdWUgIT0gMCkge1xuXHRcdFx0XHRheGVzRWx0LmZpbmQoJ3RyJykuZXEoaWQpLmZpbmQoJ3RkJykuZXEoMCkuYWRkQ2xhc3MoJ3ByZXNzZWQnKVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGF4ZXNFbHQuZmluZCgndHInKS5lcShpZCkuZmluZCgndGQnKS5lcSgwKS5yZW1vdmVDbGFzcygncHJlc3NlZCcpXG5cdFx0XHR9XG5cdFx0fSBcblxuXG5cdFx0ZnVuY3Rpb24gb25HYW1lcGFkQnV0dG9uRG93bihkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdidXR0b25Eb3duJywgZGF0YS5pZClcblx0XHRcdGJ1dHRvbnNFbHQuZmluZCgndHInKS5lcShkYXRhLmlkKS5maW5kKCd0ZCcpLmVxKDApLmFkZENsYXNzKCdwcmVzc2VkJylcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBvbkdhbWVwYWRCdXR0b25VcChkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdidXR0b25Eb3duJywgZGF0YS5pZClcblx0XHRcdGJ1dHRvbnNFbHQuZmluZCgndHInKS5lcShkYXRhLmlkKS5maW5kKCd0ZCcpLmVxKDApLnJlbW92ZUNsYXNzKCdwcmVzc2VkJylcblx0XHR9XG5cblx0XHRnYW1lcGFkLm9uKCdheGUnLCBvbkdhbWVwYWRBeGUpXG5cdFx0Z2FtZXBhZC5vbignYnV0dG9uRG93bicsIG9uR2FtZXBhZEJ1dHRvbkRvd24pXG5cdFx0Z2FtZXBhZC5vbignYnV0dG9uVXAnLCBvbkdhbWVwYWRCdXR0b25VcClcblxuXHRcdHRoaXMuZGlzcG9zZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2Rpc3Bvc2UnKVxuXHRcdFx0Z2FtZXBhZC5vZmYoJ2F4ZScsIG9uR2FtZXBhZEF4ZSlcblx0XHRcdGdhbWVwYWQub2ZmKCdidXR0b25Eb3duJywgb25HYW1lcGFkQnV0dG9uRG93bilcblx0XHRcdGdhbWVwYWQub2ZmKCdidXR0b25VcCcsIG9uR2FtZXBhZEJ1dHRvblVwKVxuXHRcblx0XHR9XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGlkOiBpbmZvLmlkLFxuXHRcdFx0XHRheGVzLFxuXHRcdFx0XHRidXR0b25zLFxuXHRcdFx0XHRhY3Rpb25zLFxuXHRcdFx0XHRnZXRCdXR0b25MYWJlbDogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gYEJ1dHRvbiAke3Njb3BlLmlkeCArIDF9YFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRBeGVMYWJlbDogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gYEF4ZSAke3Njb3BlLmlkeCArIDF9YFxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0LyoqQHR5cGUge0pRdWVyeX0gKi9cblx0XHRjb25zdCBheGVzRWx0ID0gY3RybC5zY29wZS5heGVzXG5cblx0XHQvKipAdHlwZSB7SlF1ZXJ5fSAqL1xuXHRcdGNvbnN0IGJ1dHRvbnNFbHQgPSBjdHJsLnNjb3BlLmJ1dHRvbnNcblxuXHRcdGZ1bmN0aW9uIGdldEluZm8oKSB7XG5cdFx0XHRjb25zdCByZXQgPSB7XG5cdFx0XHRcdGlkOiBpbmZvLmlkLFxuXHRcdFx0XHRheGVzOiBbXSxcblx0XHRcdFx0YnV0dG9uczogW11cblx0XHRcdH1cblx0XHRcdGF4ZXNFbHQuZmluZCgndHInKS5lYWNoKGZ1bmN0aW9uIChpZHgpIHtcblx0XHRcdFx0Y29uc3QgYWN0aW9uID0gJCh0aGlzKS5maW5kKCcuaXRlbScpLmdldFZhbHVlKClcblx0XHRcdFx0cmV0LmF4ZXMucHVzaCh7XG5cdFx0XHRcdFx0YWN0aW9uXG5cdFx0XHRcdH0pXG5cdFx0XHR9KVxuXG5cdFx0XHRidXR0b25zRWx0LmZpbmQoJ3RyJykuZWFjaChmdW5jdGlvbiAoaWR4KSB7XG5cdFx0XHRcdGNvbnN0IHVwID0gJCh0aGlzKS5maW5kKCcudXAnKS5nZXRWYWx1ZSgpXG5cdFx0XHRcdGNvbnN0IGRvd24gPSAkKHRoaXMpLmZpbmQoJy5kb3duJykuZ2V0VmFsdWUoKVxuXHRcdFx0XHRjb25zdCB1cFZhbHVlID0gJCh0aGlzKS5maW5kKCcudXBWYWx1ZScpLmdldFZhbHVlKClcblx0XHRcdFx0Y29uc3QgZG93blZhbHVlID0gJCh0aGlzKS5maW5kKCcuZG93blZhbHVlJykuZ2V0VmFsdWUoKVxuXG5cdFx0XHRcdHJldC5idXR0b25zLnB1c2goe1xuXHRcdFx0XHRcdHVwLFxuXHRcdFx0XHRcdGRvd24sXG5cdFx0XHRcdFx0dXBWYWx1ZSxcblx0XHRcdFx0XHRkb3duVmFsdWVcblx0XHRcdFx0fSlcblx0XHRcdH0pXHRcdFxuXHRcdFx0XG5cdFx0XHRjb25zb2xlLmxvZyh7cmV0fSlcblxuXHRcdFx0cmV0dXJuIHJldFxuXHRcdH1cblxuXHRcdHRoaXMuZ2V0QnV0dG9ucyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGNoZWNrOiB7XG5cdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLWNoZWNrJyxcblx0XHRcdFx0XHR0aXRsZTogJ0FwcGx5Jyxcblx0XHRcdFx0XHRvbkNsaWNrOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKGdldEluZm8oKSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHJlc2V0OiB7XG5cdFx0XHRcdFx0aWNvbjogJ2ZhcyBmYS1zeW5jJyxcblx0XHRcdFx0XHR0aXRsZTogJ1Jlc2V0IHZhbHVlJyxcblx0XHRcdFx0XHRvbkNsaWNrOiByZXNldFZhbHVlXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdH1cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIvLyBAdHMtY2hlY2tcblxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2h1YmluZm8nLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwic2Nyb2xsQmFyXFxcIj5cXG4gICAgPGgxPkV4dGVybmFsIERldmljZXM8L2gxPlxcbiAgICA8dGFibGUgY2xhc3M9XFxcInczLXRhYmxlLWFsbFxcXCI+XFxuICAgICAgICA8dGhlYWQ+XFxuICAgICAgICAgICAgPHRyPlxcbiAgICAgICAgICAgICAgICA8dGg+UG9ydDwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5EZXZpY2UgVHlwZTwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5BY3Rpb248L3RoPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICA8L3RoZWFkPlxcbiAgICAgICAgPHRib2R5IGJuLWVhY2g9XFxcImV4dGVybmFsRGV2aWNlc1xcXCIgYm4tZXZlbnQ9XFxcIlxcbiAgICAgICAgICAgIG1vdXNlZG93bi5tb3Rvck1vdXNlQWN0aW9uOiBvbk1vdXNlVXAsIFxcbiAgICAgICAgICAgIG1vdXNldXAubW90b3JNb3VzZUFjdGlvbjpvbk1vdXNlRG93biwgXFxuICAgICAgICAgICAgY2xpY2subW90b3JBY3Rpb246b25Nb3RvckFjdGlvbiwgXFxuICAgICAgICAgICAgY2xpY2subGVkQWN0aW9uOiBvbkxlZEFjdGlvbixcXG4gICAgICAgICAgICBjbGljay5wb3J0SW5mbzogb25JbmZvMiwgXFxuICAgICAgICAgICAgY2xpY2suY2FsaWJyYXRlOm9uQ2FsaWJyYXRlXFxcIj5cXG4gICAgICAgICAgICA8dHI+XFxuICAgICAgICAgICAgICAgIDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkubmFtZVxcXCI+PC90ZD5cXG4gICAgICAgICAgICAgICAgPHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS50eXBlXFxcIj48L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBibi1pZj1cXFwiaXNNb3RvclxcXCIgY2xhc3M9XFxcInNwYW5CdXR0b25zXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJ3My1idG4gdzMtZ3JlZW4gbW90b3JNb3VzZUFjdGlvblxcXCIgZGF0YS1hY3Rpb249XFxcImZvcndhcmRcXFwiPkZXRDwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcInczLWJ0biB3My1ncmVlbiBtb3Rvck1vdXNlQWN0aW9uXFxcIiBkYXRhLWFjdGlvbj1cXFwiYmFja3dhcmRcXFwiPkJLV0Q8L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGJuLWlmPVxcXCJpc1RhY2hvTW90b3JcXFwiIGNsYXNzPVxcXCJzcGFuQnV0dG9uc1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwidzMtYnRuIHczLWdyZWVuIG1vdG9yQWN0aW9uXFxcIiBkYXRhLWFjdGlvbj1cXFwicmVzZXRcXFwiPlJFU0VUPC9idXR0b24+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwidzMtYnRuIHczLWdyZWVuIG1vdG9yQWN0aW9uXFxcIiBkYXRhLWFjdGlvbj1cXFwiZ296ZXJvXFxcIj5HTyBaRVJPPC9idXR0b24+XFxuICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBibi1pZj1cXFwiaXNMZWRcXFwiIGNsYXNzPVxcXCJzcGFuQnV0dG9uc1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwidzMtYnRuIHczLWdyZWVuIGxlZEFjdGlvblxcXCIgZGF0YS1hY3Rpb249XFxcIm9uXFxcIj5PTjwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcInczLWJ0biB3My1ncmVlbiBsZWRBY3Rpb25cXFwiIGRhdGEtYWN0aW9uPVxcXCJvZmZcXFwiPk9GRjwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxcblxcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwidzMtYnRuIHczLWJsdWUgcG9ydEluZm9cXFwiPk1PREU8L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgPC90ZD5cXG5cXG4gICAgICAgICAgICA8L3RyPlxcblxcbiAgICAgICAgPC90Ym9keT5cXG4gICAgPC90YWJsZT5cXG4gICAgPGgxPkludGVybmFsIERldmljZXM8L2gxPlxcbiAgICA8dGFibGUgY2xhc3M9XFxcInczLXRhYmxlLWFsbFxcXCI+XFxuICAgICAgICA8dGhlYWQ+XFxuICAgICAgICAgICAgPHRyPlxcbiAgICAgICAgICAgICAgICA8dGg+UG9ydCBJRDwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5EZXZpY2UgVHlwZTwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5BY3Rpb248L3RoPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICA8L3RoZWFkPlxcbiAgICAgICAgPHRib2R5IGJuLWVhY2g9XFxcImludGVybmFsRGV2aWNlc1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLnczLWJ0bjogb25JbmZvXFxcIj5cXG4gICAgICAgICAgICA8dHI+XFxuICAgICAgICAgICAgICAgIDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkucG9ydElkXFxcIj48L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLnR5cGVcXFwiPjwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIj5NT0RFPC9idXR0b24+XFxuICAgICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgPC90cj5cXG5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+PC9kaXY+XCIsXG5cblx0ZGVwczogWydicmVpemJvdC5wYWdlcicsICdodWInXSxcblxuXHRwcm9wczoge1xuXHRcdGh1YkRldmljZTogbnVsbFxuXHR9LFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyIFxuXHQgKiBAcGFyYW0ge0hVQn0gaHViXG5cdCAqL1xuXHRpbml0OiBmdW5jdGlvbiAoZWx0LCBwYWdlciwgaHViKSB7XG5cblx0XHQvKipAdHlwZSB7SFVCLkh1YkRldmljZX0gKi9cblx0XHRjb25zdCBodWJEZXZpY2UgPSB0aGlzLnByb3BzLmh1YkRldmljZVxuXG5cblx0XHRhc3luYyBmdW5jdGlvbiBpbml0RGV2aWNlcygpIHtcblx0XHRcdGNvbnN0IGRldmljZXMgPSBodWJEZXZpY2UuZ2V0SHViRGV2aWNlcygpXG5cdFx0XHRjb25zb2xlLmxvZygnZGV2aWNlcycsIGRldmljZXMpXG5cblx0XHRcdGNvbnN0IGludGVybmFsRGV2aWNlcyA9IFtdXG5cdFx0XHRjb25zdCBleHRlcm5hbERldmljZXMgPSBbXVxuXG5cdFx0XHRmb3IgKGNvbnN0IGRldmljZSBvZiBkZXZpY2VzKSB7XG5cdFx0XHRcdC8vYXdhaXQgZGV2aWNlLnJlYWRJbmZvKClcblx0XHRcdFx0Y29uc3QgeyBwb3J0SWQsIHR5cGUsIG5hbWUgfSA9IGRldmljZVxuXHRcdFx0XHRpZiAocG9ydElkIDwgNTApIHtcblx0XHRcdFx0XHRjb25zdCBpbmZvID0geyBuYW1lLCBwb3J0SWQsIHR5cGUgfVxuXHRcdFx0XHRcdGV4dGVybmFsRGV2aWNlcy5wdXNoKGluZm8pXG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0aW50ZXJuYWxEZXZpY2VzLnB1c2goe1xuXHRcdFx0XHRcdFx0cG9ydElkLFxuXHRcdFx0XHRcdFx0dHlwZVxuXHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRjdHJsLnNldERhdGEoeyBpbnRlcm5hbERldmljZXMsIGV4dGVybmFsRGV2aWNlcyB9KVxuXHRcdH1cblxuXG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIHtudW1iZXJ9IHBvcnRJZCBcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gZGV2aWNlVHlwZU5hbWVcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBvcGVuSW5mb1BhZ2UocG9ydElkLCBkZXZpY2VUeXBlTmFtZSkge1xuXHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2luZm8nLCB7XG5cdFx0XHRcdHRpdGxlOiBkZXZpY2VUeXBlTmFtZSxcblx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRkZXZpY2U6IGh1YkRldmljZS5nZXREZXZpY2UocG9ydElkKVxuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7SlF1ZXJ5PEhUTUxFbGVtZW50Pn0gZWx0IFxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGdldEV4dGVybmFsUG9ydElkKGVsdCkge1xuXHRcdFx0Y29uc3QgaWR4ID0gZWx0LmNsb3Nlc3QoJ3RyJykuaW5kZXgoKVxuXHRcdFx0cmV0dXJuIGN0cmwubW9kZWwuZXh0ZXJuYWxEZXZpY2VzW2lkeF0ucG9ydElkXG5cblx0XHR9XG5cblx0XHRhc3luYyBmdW5jdGlvbiBhdHRhY2hDYmsoZGF0YSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2F0dGFjaCcsIGRhdGEpXG5cdFx0XHRjb25zdCB7IHBvcnRJZCwgbmFtZSwgdHlwZSB9ID0gZGF0YVxuXHRcdFx0Y29uc3QgaW5mbyA9IHsgcG9ydElkLCBuYW1lLCB0eXBlIH1cblx0XHRcdGN0cmwubW9kZWwuZXh0ZXJuYWxEZXZpY2VzLnB1c2goaW5mbylcblx0XHRcdGN0cmwudXBkYXRlKClcblxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGRldGFjaENiayhkYXRhKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnZGV0YWNoJywgZGF0YSlcblx0XHRcdGNvbnN0IGlkeCA9IGN0cmwubW9kZWwuZXh0ZXJuYWxEZXZpY2VzLmZpbmRJbmRleCgoZGV2KSA9PiBkZXYucG9ydElkID09IGRhdGEucG9ydElkKVxuXHRcdFx0Ly9jb25zb2xlLmxvZygnaWR4JywgaWR4KVxuXHRcdFx0Y3RybC5tb2RlbC5leHRlcm5hbERldmljZXMuc3BsaWNlKGlkeCwgMSlcblx0XHRcdGN0cmwudXBkYXRlKClcblxuXHRcdH1cblxuXHRcdGh1YkRldmljZS5vbignYXR0YWNoJywgYXR0YWNoQ2JrKVxuXHRcdGh1YkRldmljZS5vbignZGV0YWNoJywgZGV0YWNoQ2JrKVxuXG5cdFx0dGhpcy5kaXNwb3NlID0gYXN5bmMgZnVuY3Rpb24gKCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2h1YkluZm8gZGlzcG9zZScpXG5cdFx0XHRodWJEZXZpY2Uub2ZmKCdhdHRhY2gnLCBhdHRhY2hDYmspXG5cdFx0XHRodWJEZXZpY2Uub2ZmKCdkZXRhY2gnLCBkZXRhY2hDYmspXG5cblxuXHRcdH1cblxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRpbnRlcm5hbERldmljZXM6IFtdLFxuXHRcdFx0XHRleHRlcm5hbERldmljZXM6IFtdLFxuXHRcdFx0XHRpc01vdG9yOiBmdW5jdGlvbiAoc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gaHViLmlzTW90b3IoaHViRGV2aWNlLmdldERldmljZShzY29wZS4kaS5wb3J0SWQpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRpc0xlZDogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGh1Yi5pc0xlZChodWJEZXZpY2UuZ2V0RGV2aWNlKHNjb3BlLiRpLnBvcnRJZCkpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGlzVGFjaG9Nb3RvcjogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGh1Yi5pc1RhY2hvTW90b3IoaHViRGV2aWNlLmdldERldmljZShzY29wZS4kaS5wb3J0SWQpKVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uTW90b3JBY3Rpb246IGFzeW5jIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjb25zdCBwb3J0SWQgPSBnZXRFeHRlcm5hbFBvcnRJZCgkKHRoaXMpKVxuXHRcdFx0XHRcdGNvbnN0IGFjdGlvbiA9ICQodGhpcykuZGF0YSgnYWN0aW9uJylcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25Nb3RvckFjdGlvbicsIHBvcnRJZCwgYWN0aW9uKVxuXHRcdFx0XHRcdC8qKkB0eXBlIHtIVUIuVGFjaG9Nb3Rvcn0gKi9cblx0XHRcdFx0XHRjb25zdCBtb3RvciA9IGh1YkRldmljZS5nZXREZXZpY2UocG9ydElkKVxuXHRcdFx0XHRcdHN3aXRjaCAoYWN0aW9uKSB7XG5cdFx0XHRcdFx0XHRjYXNlICdyZXNldCc6XG5cdFx0XHRcdFx0XHRcdG1vdG9yLnJlc2V0WmVybygpXG5cdFx0XHRcdFx0XHRcdGJyZWFrXG5cdFx0XHRcdFx0XHRjYXNlICdnb3plcm8nOlxuXHRcdFx0XHRcdFx0XHRtb3Rvci5nb3RvQW5nbGUoMCwgNTAsIGZhbHNlKVxuXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTGVkQWN0aW9uOiBhc3luYyBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uc3QgcG9ydElkID0gZ2V0RXh0ZXJuYWxQb3J0SWQoJCh0aGlzKSlcblx0XHRcdFx0XHRjb25zdCBhY3Rpb24gPSAkKHRoaXMpLmRhdGEoJ2FjdGlvbicpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uTGVkQWN0aW9uJywgcG9ydElkLCBhY3Rpb24pXG5cdFx0XHRcdFx0LyoqQHR5cGUge0hVQi5MZWR9ICovXG5cdFx0XHRcdFx0Y29uc3QgbGVkID0gaHViRGV2aWNlLmdldERldmljZShwb3J0SWQpXG5cdFx0XHRcdFx0bGVkLnNldEJyaWdodG5lc3MoKGFjdGlvbiA9PSAnb24nID8gMTAwIDogMCkpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQ2FsaWJyYXRlOiBhc3luYyBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uc3QgcG9ydElkID0gZ2V0RXh0ZXJuYWxQb3J0SWQoJCh0aGlzKSlcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25DYWxpYnJhdGUnLCBwb3J0SWQpXG5cdFx0XHRcdFx0LyoqQHR5cGUge0hVQi5UYWNob01vdG9yfSAqL1xuXHRcdFx0XHRcdGNvbnN0IG1vdG9yID0gaHViRGV2aWNlLmdldERldmljZShwb3J0SWQpXG5cdFx0XHRcdFx0YXdhaXQgbW90b3IuY2FsaWJyYXRlKClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25Nb3VzZVVwOiBhc3luYyBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Nb3VzZVVwJylcblx0XHRcdFx0XHRjb25zdCBhY3Rpb24gPSAkKHRoaXMpLmRhdGEoJ2FjdGlvbicpXG5cdFx0XHRcdFx0Y29uc3QgcG9ydElkID0gZ2V0RXh0ZXJuYWxQb3J0SWQoJCh0aGlzKSlcblx0XHRcdFx0XHQvKipAdHlwZSB7SFVCLlRhY2hvTW90b3J9ICovXG5cdFx0XHRcdFx0Y29uc3QgbW90b3IgPSBodWJEZXZpY2UuZ2V0RGV2aWNlKHBvcnRJZClcblx0XHRcdFx0XHRzd2l0Y2ggKGFjdGlvbikge1xuXHRcdFx0XHRcdFx0Y2FzZSAnZm9yd2FyZCc6XG5cdFx0XHRcdFx0XHRcdG1vdG9yLnNldFBvd2VyKDEwMClcblx0XHRcdFx0XHRcdFx0YnJlYWtcblx0XHRcdFx0XHRcdGNhc2UgJ2JhY2t3YXJkJzpcblx0XHRcdFx0XHRcdFx0bW90b3Iuc2V0UG93ZXIoLTEwMClcblx0XHRcdFx0XHRcdFx0YnJlYWtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTW91c2VEb3duOiBhc3luYyBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Nb3VzZURvd24nKVxuXHRcdFx0XHRcdGNvbnN0IHBvcnRJZCA9IGdldEV4dGVybmFsUG9ydElkKCQodGhpcykpXG5cdFx0XHRcdFx0LyoqQHR5cGUge0hVQi5UYWNob01vdG9yfSAqL1xuXHRcdFx0XHRcdGNvbnN0IG1vdG9yID0gaHViRGV2aWNlLmdldERldmljZShwb3J0SWQpXG5cdFx0XHRcdFx0bW90b3Iuc2V0UG93ZXIoMClcblx0XHRcdFx0fSxcblx0XHRcdFx0b25JbmZvOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCB7IHBvcnRJZCwgZGV2aWNlVHlwZU5hbWUgfSA9IGN0cmwubW9kZWwuaW50ZXJuYWxEZXZpY2VzW2lkeF1cblx0XHRcdFx0XHRvcGVuSW5mb1BhZ2UocG9ydElkLCBkZXZpY2VUeXBlTmFtZSlcblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkluZm8yOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCB7IHBvcnRJZCwgZGV2aWNlVHlwZU5hbWUgfSA9IGN0cmwubW9kZWwuZXh0ZXJuYWxEZXZpY2VzW2lkeF1cblx0XHRcdFx0XHRvcGVuSW5mb1BhZ2UocG9ydElkLCBkZXZpY2VUeXBlTmFtZSlcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGluaXREZXZpY2VzKClcblxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIi8vIEB0cy1jaGVja1xuXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnaW5mbycsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2PlxcbiAgICA8ZGl2PlxcbiAgICAgICAgQ2FwYWJpbGl0aWVzOiA8c3BhbiBibi10ZXh0PVxcXCJjYXBhYmlsaXRpZXNcXFwiPjwvc3Bhbj5cXG4gICAgPC9kaXY+XFxuICAgIDx0YWJsZSBjbGFzcz1cXFwidzMtdGFibGUtYWxsXFxcIj5cXG4gICAgICAgIDx0aGVhZD5cXG4gICAgICAgICAgICA8dHI+XFxuICAgICAgICAgICAgICAgIDx0aD5NT0RFPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPkNBUEFCSUxJVElFUzwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5VTklUPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPlJBVzwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5TSTwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5WQUxVRSBGT1JNQVQ8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+VmFsdWU8L3RoPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICA8L3RoZWFkPlxcbiAgICAgICAgPHRib2R5IGJuLWVhY2g9XFxcIm1vZGVzXFxcIiBibi1ldmVudD1cXFwiY2xpY2suYnRuR2V0OiBvbkJ0bkdldFxcXCI+XFxuICAgICAgICAgICAgPHRyPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLm5hbWVcXFwiPjwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZCBibi10ZXh0PVxcXCJnZXRDYXBhYmlsaXRlc1xcXCI+PC90ZD5cXG4gICAgICAgICAgICAgICAgPHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS51bml0XFxcIj48L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuJGkuUkFXLm1pblxcXCI+PC9zcGFuPjxicj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5SQVcubWF4XFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5QQ1QubWluXFxcIj48L3NwYW4+PGJyPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpLlBDVC5tYXhcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpLlNJLm1pblxcXCI+PC9zcGFuPjxicj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5TSS5tYXhcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICAgICAgZGF0YVR5cGU6IDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5WQUxVRV9GT1JNQVQuZGF0YVR5cGVcXFwiPjwvc3Bhbj48YnI+XFxuICAgICAgICAgICAgICAgICAgICBudW1WYWx1ZXM6IDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5WQUxVRV9GT1JNQVQubnVtVmFsdWVzXFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgYm4taWY9XFxcImlzSW5wdXRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcInczLWJ0biB3My1ncmVlbiBidG5HZXRcXFwiPkdldDwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuPjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICA8L3Rib2R5PlxcbiAgICA8L3RhYmxlPlxcbjwvZGl2PlwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInLCAnaHViJ10sXG5cblx0cHJvcHM6IHtcblx0XHRkZXZpY2U6IG51bGxcblx0fSxcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcblx0ICogQHBhcmFtIHtIVUJ9IGh1YlxuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIsIGh1Yikge1xuXG5cdFx0LyoqQHR5cGUge0hVQi5EZXZpY2V9ICovXG5cdFx0Y29uc3QgZGV2aWNlID0gdGhpcy5wcm9wcy5kZXZpY2VcblxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRtb2RlczogW10sXG5cdFx0XHRcdGNhcGFiaWxpdGllczogJycsXG5cdFx0XHRcdGlzSW5wdXQ6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIChzY29wZS4kaS5tb2RlICYgMHgxKSAhPSAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldENhcGFiaWxpdGVzOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdGlmIChzY29wZS4kaS5tb2RlID09IDIpIHtcblx0XHRcdFx0XHRcdHJldHVybiAnT1VUJ1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIGlmIChzY29wZS4kaS5tb2RlID09IDEpIHtcblx0XHRcdFx0XHRcdHJldHVybiAnSU4nXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2UgaWYgKHNjb3BlLiRpLm1vZGUgPT0gMykge1xuXHRcdFx0XHRcdFx0cmV0dXJuICdJTi9PVVQnXG5cdFx0XHRcdFx0fVx0XHRcdFx0XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25CdG5HZXQ6IGFzeW5jIGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0Y29uc3QgbW9kZSA9ICQodGhpcykuY2xvc2VzdCgndHInKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQnRuR2V0JywgbW9kZSlcblx0XHRcdFx0XHRjb25zdCB2YWx1ZXMgPSBhd2FpdCBkZXZpY2UuZ2V0VmFsdWUobW9kZSlcblx0XHRcdFx0XHRjb25zb2xlLmxvZygndmFsdWVzJywgdmFsdWVzKVxuXHRcdFx0XHRcdCQodGhpcykuY2xvc2VzdCgndGQnKS5maW5kKCdzcGFuJykudGV4dChKU09OLnN0cmluZ2lmeSh2YWx1ZXMsIG51bGwsIDQpKVxuXHRcdFx0XHRcdFxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XG5cdFx0XHRjb25zdCB7IG1vZGVzLCBjYXBhYmlsaXRpZXMgfSA9IGF3YWl0IGRldmljZS5yZWFkSW5mbygpXG5cdFx0XHRjdHJsLnNldERhdGEoeyBtb2RlcywgY2FwYWJpbGl0aWVzIH0pXG5cdFx0fVxuXG5cdFx0aW5pdCgpXG5cdH1cblxuXG59KTtcblxuXG5cblxuIl19
