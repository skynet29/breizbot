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
                .appendField(new Blockly.FieldVariable("value"), "VAR")
                .appendField("Test");
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
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
                .appendField(new Blockly.FieldVariable("value"), "VAR");
            this.appendStatementInput("DO")
                .setCheck(null);
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(230);
            this.setTooltip("");
            this.setHelpUrl("");
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

	template: "<div class=\"toolbar\">\n\n    <div>\n        <button bn-event=\"click: onExport\"  title=\"Export current config\">Export</button>\n        <button bn-event=\"click: onImport\"  title=\"Import config\">Import</button>\n\n        <button bn-event=\"click: onNewConfig\" bn-icon=\"fa fa-file\" title=\"Reset Config\"></button>\n\n        <button bn-event=\"click: onConfig\" bn-icon=\"fa fa-folder-open\" title=\"Open Config\"></button>\n\n        <button bn-event=\"click: onSaveConfig\" bn-icon=\"fa fa-save\" title=\"Save current config\"></button>\n\n        <button bn-event=\"click: onRun\">Run</button>\n\n        <button bn-event=\"click: onStop\">Stop</button>\n\n        <button bn-event=\"click: onGamePad\" bn-show=\"gamepadConnected\">Gamepad</button>\n    </div>\n\n\n    <div>\n        <div bn-show=\"currentConfig\">\n            <label>Current Config:</label>\n            <span bn-text=\"currentConfig\"></span>\n        </div>\n    </div>\n\n\n\n</div>\n<div id=\"blocklyDiv\"></div>\n<div class=\"logPanel\" bn-html=\"getLogs\" bn-bind=\"logPanel\"></div>\n\n<xml id=\"toolbox\" style=\"display: none;\">\n    <category name=\"Logic\" categorystyle=\"logic_category\">\n        <block type=\"controls_if\"></block>\n        <block type=\"logic_compare\"></block>\n        <block type=\"logic_operation\"></block>\n        <block type=\"logic_negate\"></block>\n        <block type=\"logic_boolean\"></block>\n        <block type=\"logic_ternary\"></block>\n    </category>\n    <category name=\"Loop\" categorystyle=\"loop_category\">\n        <block type=\"controls_repeat_ext\">\n            <value name=\"TIMES\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">10</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"controls_whileUntil\"></block>\n        <block type=\"controls_for\">\n            <value name=\"FROM\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">1</field>\n                </shadow>\n            </value>\n            <value name=\"TO\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">10</field>\n                </shadow>\n            </value>\n            <value name=\"BY\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">1</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"controls_forEach\"></block>\n        <block type=\"controls_flow_statements\"></block>\n    </category>\n    <category name=\"Math\" categorystyle=\"math_category\">\n        <block type=\"math_number\"></block>\n        <block type=\"math_arithmetic\"></block>\n        <block type=\"math_single\">\n            <field name=\"OP\">ROOT</field>\n            <value name=\"NUM\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">9</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"math_trig\">\n            <field name=\"OP\">SIN</field>\n            <value name=\"NUM\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">45</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"math_constant\">\n            <field name=\"CONSTANT\">PI</field>\n        </block>\n        <block type=\"math_random_int\">\n            <value name=\"FROM\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">1</field>\n                </shadow>\n            </value>\n            <value name=\"TO\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"math_round\">\n            <field name=\"OP\">ROUND</field>\n            <value name=\"NUM\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">3.1</field>\n                </shadow>\n            </value>\n        </block>\n    </category>\n    <category name=\"Text\" categorystyle=\"text_category\">\n        <block type=\"text\"></block>\n        <block type=\"text_print\"></block>\n        <block type=\"text_length\">\n            <value name=\"VALUE\">\n                <shadow type=\"text\">\n                    <field name=\"TEXT\">abc</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"text_changeCase\">\n            <field name=\"CASE\">UPPERCASE</field>\n            <value name=\"TEXT\">\n                <shadow type=\"text\">\n                    <field name=\"TEXT\">abc</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"text_append\">\n            <field name=\"VAR\" id=\"MHveE$^#X7/c|*RA!r{I\">item</field>\n            <value name=\"TEXT\">\n                <shadow type=\"text\">\n                    <field name=\"TEXT\" />\n                </shadow>\n            </value>\n        </block>\n        <block type=\"text_join\">\n            <mutation items=\"2\" />\n        </block>\n        <block type=\"text_indexOf\"></block>\n        <block type=\"text_charAt\"></block>\n        <block type=\"text_getSubstring\"></block>\n        <block type=\"text_prompt_ext\">\n            <mutation type=\"TEXT\" />\n            <field name=\"TYPE\">TEXT</field>\n            <value name=\"TEXT\">\n                <shadow type=\"text\">\n                    <field name=\"TEXT\">abc</field>\n                </shadow>\n            </value>\n        </block>\n    </category>\n    <category name=\"Lists\" categorystyle=\"list_category\">\n        <block type=\"lists_create_with\">\n            <mutation items=\"0\"></mutation>\n        </block>\n        <block type=\"lists_create_with\"></block>\n        <block type=\"lists_repeat\">\n            <value name=\"NUM\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">5</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"lists_length\"></block>\n        <block type=\"lists_isEmpty\"></block>\n        <block type=\"lists_indexOf\">\n            <value name=\"VALUE\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">list</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"lists_getIndex\">\n            <value name=\"VALUE\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">list</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"lists_setIndex\">\n            <value name=\"LIST\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">list</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"lists_getSublist\">\n            <value name=\"LIST\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">list</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"lists_split\">\n            <value name=\"DELIM\">\n                <shadow type=\"text\">\n                    <field name=\"TEXT\">,</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"lists_sort\"></block>\n        <block type=\"lists_reverse\"></block>\n    </category>\n    <category name=\"Variables\" custom=\"VARIABLE\" categorystyle=\"variable_category\"></category>\n    <category name=\"Functions\" custom=\"PROCEDURE\" categorystyle=\"procedure_category\"></category>\n    <category name=\"Object\" colour=\"355\">\n        <block type=\"object_getfield\">\n            <value name=\"OBJECT\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">object</field>\n                </block>\n            </value>\n        </block>\n    </category>\n    <category name=\"Device\" colour=\"355\">\n        <block type=\"create_device\"></block>\n        <block type=\"device_getvalue\">\n            <value name=\"DEVICE\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">device</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"wait_until_device\">\n            <value name=\"DEVICE\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">device</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"device_subscribe\">\n            <value name=\"DEVICE\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">device</field>\n                </block>\n            </value>\n        </block>\n    </category>\n    <category name=\"Motor\" colour=\"355\">\n        <block type=\"create_motor\"></block>\n        <block type=\"motor_power\">\n            <value name=\"VAR\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">motor</field>\n                </block>\n            </value>            \n            <value name=\"POWER\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n    </category>\n    <category name=\"TachoMotor\" colour=\"355\">\n        <block type=\"create_tacho_motor\"></block>\n        <block type=\"motor_speed\">\n            <value name=\"VAR\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">motor</field>\n                </block>\n            </value>  \n            <value name=\"SPEED\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"motor_speed_time\">\n            <value name=\"VAR\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">motor</field>\n                </block>\n            </value>  \n            <value name=\"TIME\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">1</field>\n                </shadow>\n            </value>\n            <value name=\"SPEED\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"motor_speed_degrees\">\n            <value name=\"VAR\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">motor</field>\n                </block>\n            </value>  \n            <value name=\"DEGREES\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">180</field>\n                </shadow>\n            </value>\n            <value name=\"SPEED\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"motor_speed_position\">\n            <value name=\"VAR\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">motor</field>\n                </block>\n            </value>  \n            <value name=\"ANGLE\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">0</field>\n                </shadow>\n            </value>\n            <value name=\"SPEED\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"motor_reset_position\">\n            <value name=\"VAR\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">motor</field>\n                </block>\n            </value>  \n        </block>\n        <block type=\"motor_get_speed\">\n            <value name=\"VAR\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">motor</field>\n                </block>\n            </value>  \n        </block>\n        <block type=\"motor_get_position\">\n            <value name=\"VAR\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">motor</field>\n                </block>\n            </value>  \n        </block>\n        <block type=\"motor_get_absoluteposition\">\n            <value name=\"VAR\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">motor</field>\n                </block>\n            </value>  \n        </block>\n\n    </category>\n    <category name=\"PairMotor\" colour=\"355\">\n        <block type=\"create_pair_motor\">\n            <FIELD name=\"PORT2\">B</FIELD>\n        </block>\n        <block type=\"pair_motor_speed\">\n            <value name=\"VAR\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">motor</field>\n                </block>\n            </value>  \n            <value name=\"SPEED1\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n            <value name=\"SPEED2\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n\n\n    </category>\n    <category name=\"Hub\" colour=\"355\">\n        <block type=\"hub_color\"></block>\n        <block type=\"hub_get_tilt\"></block>\n        <block type=\"hub_get_voltage\"></block>\n    </category>\n    <category name=\"System\" colour=\"355\">\n        <block type=\"sleep\">\n            <value name=\"TIME\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">1</field>\n                </shadow>\n            </value>\n        </block>\n    </category>\n\n</xml>",

	deps: [
		'breizbot.pager',
		'breizbot.blocklyinterpretor', 
		'hub', 
		'breizbot.gamepad', 
		'breizbot.http',
		'breizbot.files'
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
	 */
	init: function (elt, pager, blocklyInterpretor, hubSrv, gamepad, http, fileSrv) {

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

		const demoWorkspace = Blockly.inject('blocklyDiv',
			{
				media: '/ext/blockly/media/',
				toolbox: document.getElementById('toolbox')
				//horizontalLayout: true,
				//toolboxPosition: 'end'
			}
		)

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

		blocklyInterpretor.addBlockType('device_subscribe', async (block) => {

			/**@type {HUB.DeviceMode} */
			const mode = block.fields.MODE

			const deltaInterval = block.fields.DELTA

			/**@type {HUB.Device} */
			const device = await blocklyInterpretor.evalCode(block.inputs.DEVICE)
			console.log({ mode, deltaInterval, device })
			const varId = block.fields.VAR.id

			await device.subscribe(mode, async (value) => {
				blocklyInterpretor.setVarValue(varId, value)
				await blocklyInterpretor.evalCode(block.inputs.DO)
			}, deltaInterval)
		})

		blocklyInterpretor.addBlockType('create_pair_motor', async (block) => {

			/**@type {string} */
			const portName1 = block.fields.PORT1

			/**@type {string} */
			const portName2 = block.fields.PORT2

			const hubDevice = getHub(block)
			const motor = await hubDevice.getDblMotor(hubSrv.PortMap[portName1], hubSrv.PortMap[portName2])

			return motor

		})

		blocklyInterpretor.addBlockType('create_tacho_motor', async (block) => {

			/**@type {string} */
			const portName = block.fields.PORT

			const hubDevice = getHub(block)
			const motor = hubDevice.getDevice(hubSrv.PortMap[portName])
			if (!hubSrv.isTachoMotor(motor)) {
				throw `Device connected to port '${portName}' is not of a TachoMotor`
			}
			return motor

		})

		blocklyInterpretor.addBlockType('create_motor', async (block) => {

			/**@type {string} */
			const portName = block.fields.PORT

			const hubDevice = getHub(block)
			const motor = hubDevice.getDevice(hubSrv.PortMap[portName])
			if (!hubSrv.isMotor(motor)) {
				throw `Device connected to port '${portName}' is not of a Motor`
			}
			return motor

		})

		async function getMotor(block) {
			/**@type {HUB.Motor} */
			const motor = await blocklyInterpretor.evalCode(block.inputs.VAR)
			if (!hubSrv.isMotor(motor)) {
				throw `input is not of type Motor`
			}
			return motor
		}

		async function getTachoMotor(block) {
			/**@type {HUB.TachoMotor} */
			const motor = await blocklyInterpretor.evalCode(block.inputs.VAR)

			if (!hubSrv.isTachoMotor(motor)) {
				throw `input is not of type TachoMotor`
			}
			return motor
		}

		async function getPairMotor(block) {
			/**@type {HUB.DoubleMotor} */
			const motor = await blocklyInterpretor.evalCode(block.inputs.VAR)
			console.log('motor', motor)
			if (!hubSrv.isDoubleMotor(motor)) {
				throw `input is not of type PairMotor`
			}
			return motor
		}

		blocklyInterpretor.addBlockType('motor_power', async (block) => {

			/**@type {number} */
			const power = await blocklyInterpretor.evalCode(block.inputs.POWER)

			const motor = await getMotor(block)

			console.log({ power })
			await motor.setPower(power)

		})

		blocklyInterpretor.addBlockType('motor_speed', async (block) => {

			/**@type {number} */
			const speed = await blocklyInterpretor.evalCode(block.inputs.SPEED)

			const motor = await getTachoMotor(block)

			console.log({ speed })
			await motor.setSpeed(speed)

		})

		blocklyInterpretor.addBlockType('pair_motor_speed', async (block) => {

			/**@type {number} */
			const speed1 = await blocklyInterpretor.evalCode(block.inputs.SPEED1)
			/**@type {number} */
			const speed2 = await blocklyInterpretor.evalCode(block.inputs.SPEED2)

			const motor = await getPairMotor(block)

			console.log({ speed1, speed2, motor })
			await motor.setSpeed(speed1, speed2)

		})


		blocklyInterpretor.addBlockType('motor_speed_time', async (block) => {

			/**@type {number} */
			const speed = await blocklyInterpretor.evalCode(block.inputs.SPEED)

			const waitEnd = block.fields.WAIT

			/**@type {number} */
			const time = await blocklyInterpretor.evalCode(block.inputs.TIME)

			const motor = await getTachoMotor(block)

			console.log({ speed, time, waitEnd, motor })
			await motor.setSpeedForTime(speed, time * 1000, waitEnd, hubSrv.BrakingStyle.FLOAT)

		})

		blocklyInterpretor.addBlockType('motor_speed_degrees', async (block) => {

			const motor = await getTachoMotor(block)

			/**@type {number} */
			const speed = await blocklyInterpretor.evalCode(block.inputs.SPEED)

			const waitEnd = block.fields.WAIT

			/**@type {number} */
			const degrees = await blocklyInterpretor.evalCode(block.inputs.DEGREES)

			console.log({ speed, degrees, waitEnd })
			await motor.rotateDegrees(degrees, speed, waitEnd, hubSrv.BrakingStyle.BRAKE)

		})

		blocklyInterpretor.addBlockType('motor_speed_position', async (block) => {

			const motor = await getTachoMotor(block)

			/**@type {number} */
			const speed = await blocklyInterpretor.evalCode(block.inputs.SPEED)

			const waitEnd = block.fields.WAIT

			/**@type {number} */
			const angle = await blocklyInterpretor.evalCode(block.inputs.ANGLE)

			console.log({ speed, angle, waitEnd })
			await motor.gotoAngle(angle, speed, waitEnd, hubSrv.BrakingStyle.FLOAT)

		})

		blocklyInterpretor.addBlockType('motor_reset_position', async (block) => {

			const motor = await getTachoMotor(block)
			await motor.resetZero()

		})

		blocklyInterpretor.addBlockType('motor_get_speed', async (block) => {

			const motor = await getTachoMotor(block)
			return motor.getSpeed()

		})

		blocklyInterpretor.addBlockType('motor_get_position', async (block) => {

			const motor = await getTachoMotor(block)
			return motor.getPosition()

		})

		blocklyInterpretor.addBlockType('motor_get_absoluteposition', async (block) => {

			const motor = await getTachoMotor(block)
			return motor.getAbsolutePosition()

		})

		blocklyInterpretor.addBlockType('hub_color', async (block) => {

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

		blocklyInterpretor.addBlockType('hub_get_voltage', async (block) => {

			return getHubValue(block, hubSrv.PortMap.VOLTAGE_SENSOR, 0)

		})

		blocklyInterpretor.addBlockType('hub_get_tilt', async (block) => {

			/**@type {string} */
			const type = block.fields.TYPE

			const value = await getHubValue(block, hubSrv.PortMap.TILT_SENSOR, hubSrv.DeviceMode.TILT_POS)
			return value[type]

		})


		blocklyInterpretor.addBlockType('sleep', async (block) => {
			const time = await blocklyInterpretor.evalCode(block.inputs.TIME)
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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJsb2Nrcy5qcyIsIm1haW4uanMiLCJwYWdlcy9jb2RlL2NvZGUuanMiLCJwYWdlcy9jb25maWdDdHJsL2NvbmZpZ0N0cmwuanMiLCJwYWdlcy9nYW1lcGFkL2dhbWVwYWQuanMiLCJwYWdlcy9odWJpbmZvL2h1YmluZm8uanMiLCJwYWdlcy9pbmZvL2luZm8uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3WEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uICgpIHtcblxuICAgIEJsb2NrbHkuQmxvY2tzWydvYmplY3RfZ2V0ZmllbGQnXSA9IHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiT0JKRUNUXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKG51bGwpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiaW4gT2JqZWN0XCIpO1xuICAgICAgICAgICAgdGhpcy5hcHBlbmREdW1teUlucHV0KClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJnZXQgZmllbGRcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGRUZXh0SW5wdXQoXCJcIiksIFwiRklFTERcIik7XG4gICAgICAgICAgICB0aGlzLnNldElucHV0c0lubGluZSh0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0T3V0cHV0KHRydWUsIG51bGwpO1xuICAgICAgICAgICAgdGhpcy5zZXRDb2xvdXIoMjMwKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SGVscFVybChcIlwiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBCbG9ja2x5LkJsb2Nrc1snY3JlYXRlX2RldmljZSddID0ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZER1bW15SW5wdXQoKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIkRldmljZVwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIkhVQlwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZERyb3Bkb3duKFtbXCJIVUIxXCIsIFwiSFVCMVwiXSwgW1wiSFVCMlwiLCBcIkhVQjJcIl1dKSwgXCJIVUJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJQT1JUXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkTnVtYmVyKDAsIDAsIEluZmluaXR5LCAxKSwgXCJQT1JUXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRPdXRwdXQodHJ1ZSwgXCJEZXZpY2VcIik7XG4gICAgICAgICAgICB0aGlzLnNldENvbG91cigyMzApO1xuICAgICAgICAgICAgdGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRIZWxwVXJsKFwiXCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIEJsb2NrbHkuQmxvY2tzWydkZXZpY2VfZ2V0dmFsdWUnXSA9IHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiREVWSUNFXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKG51bGwpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiRGV2aWNlXCIpO1xuICAgICAgICAgICAgdGhpcy5hcHBlbmREdW1teUlucHV0KClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJNb2RlXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkTnVtYmVyKDAsIDAsIEluZmluaXR5LCAxKSwgXCJNT0RFXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiZ2V0VmFsdWVcIik7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZER1bW15SW5wdXQoKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SW5wdXRzSW5saW5lKHRydWUpO1xuICAgICAgICAgICAgdGhpcy5zZXRPdXRwdXQodHJ1ZSwgbnVsbCk7XG4gICAgICAgICAgICB0aGlzLnNldENvbG91cigyMzApO1xuICAgICAgICAgICAgdGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRIZWxwVXJsKFwiXCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIEJsb2NrbHkuQmxvY2tzWyd3YWl0X3VudGlsX2RldmljZSddID0ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJERVZJQ0VcIilcbiAgICAgICAgICAgICAgICAuc2V0Q2hlY2sobnVsbClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJXYWl0IHVudGlsIERldmljZVwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiTW9kZVwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZE51bWJlcigwLCAwLCBJbmZpbml0eSwgMSksIFwiTU9ERVwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlRFU1RcIilcbiAgICAgICAgICAgICAgICAuc2V0Q2hlY2soXCJCb29sZWFuXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkVmFyaWFibGUoXCJ2YWx1ZVwiKSwgXCJWQVJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJUZXN0XCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRJbnB1dHNJbmxpbmUodHJ1ZSk7XG4gICAgICAgICAgICB0aGlzLnNldFByZXZpb3VzU3RhdGVtZW50KHRydWUsIG51bGwpO1xuICAgICAgICAgICAgdGhpcy5zZXROZXh0U3RhdGVtZW50KHRydWUsIG51bGwpO1xuICAgICAgICAgICAgdGhpcy5zZXRDb2xvdXIoMjMwKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SGVscFVybChcIlwiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBCbG9ja2x5LkJsb2Nrc1snY3JlYXRlX3RhY2hvX21vdG9yJ10gPSB7XG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiVGFjaG9Nb3RvclwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIkhVQlwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZERyb3Bkb3duKFtbXCJIVUIxXCIsIFwiSFVCMVwiXSwgW1wiSFVCMlwiLCBcIkhVQjJcIl1dKSwgXCJIVUJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJQT1JUXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkRHJvcGRvd24oW1tcIkFcIiwgXCJBXCJdLCBbXCJCXCIsIFwiQlwiXSwgW1wiQ1wiLCBcIkNcIl0sIFtcIkRcIiwgXCJEXCJdXSksIFwiUE9SVFwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0T3V0cHV0KHRydWUsIFwiTW90b3JcIik7XG4gICAgICAgICAgICB0aGlzLnNldENvbG91cigyMzApO1xuICAgICAgICAgICAgdGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRIZWxwVXJsKFwiXCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIEJsb2NrbHkuQmxvY2tzWydjcmVhdGVfbW90b3InXSA9IHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5hcHBlbmREdW1teUlucHV0KClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJNb3RvclwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIkhVQlwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZERyb3Bkb3duKFtbXCJIVUIxXCIsIFwiSFVCMVwiXSwgW1wiSFVCMlwiLCBcIkhVQjJcIl1dKSwgXCJIVUJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJQT1JUXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkRHJvcGRvd24oW1tcIkFcIiwgXCJBXCJdLCBbXCJCXCIsIFwiQlwiXSwgW1wiQ1wiLCBcIkNcIl0sIFtcIkRcIiwgXCJEXCJdXSksIFwiUE9SVFwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0T3V0cHV0KHRydWUsIFwiTW90b3JcIik7XG4gICAgICAgICAgICB0aGlzLnNldENvbG91cigyMzApO1xuICAgICAgICAgICAgdGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRIZWxwVXJsKFwiXCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIEJsb2NrbHkuQmxvY2tzWydjcmVhdGVfcGFpcl9tb3RvciddID0ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZER1bW15SW5wdXQoKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIlBhaXJNb3RvclwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIkhVQlwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZERyb3Bkb3duKFtbXCJIVUIxXCIsIFwiSFVCMVwiXSwgW1wiSFVCMlwiLCBcIkhVQjJcIl1dKSwgXCJIVUJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJQT1JUMVwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZERyb3Bkb3duKFtbXCJBXCIsIFwiQVwiXSwgW1wiQlwiLCBcIkJcIl0sIFtcIkNcIiwgXCJDXCJdLCBbXCJEXCIsIFwiRFwiXV0pLCBcIlBPUlQxXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiUE9SVDJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGREcm9wZG93bihbW1wiQVwiLCBcIkFcIl0sIFtcIkJcIiwgXCJCXCJdLCBbXCJDXCIsIFwiQ1wiXSwgW1wiRFwiLCBcIkRcIl1dKSwgXCJQT1JUMlwiKVxuICAgICAgICAgICAgdGhpcy5zZXRPdXRwdXQodHJ1ZSwgXCJNb3RvclwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0Q29sb3VyKDIzMCk7XG4gICAgICAgICAgICB0aGlzLnNldFRvb2x0aXAoXCJcIik7XG4gICAgICAgICAgICB0aGlzLnNldEhlbHBVcmwoXCJcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgQmxvY2tseS5CbG9ja3NbJ3BhaXJfbW90b3Jfc3BlZWQnXSA9IHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiVkFSXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKG51bGwpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiUGFpciBNb3RvclwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlNQRUVEMVwiKVxuICAgICAgICAgICAgICAgIC5zZXRDaGVjayhcIk51bWJlclwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIlNwZWVkMVwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlNQRUVEMlwiKVxuICAgICAgICAgICAgICAgIC5zZXRDaGVjayhcIk51bWJlclwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIlNwZWVkMlwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SW5wdXRzSW5saW5lKHRydWUpO1xuICAgICAgICAgICAgdGhpcy5zZXRQcmV2aW91c1N0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0TmV4dFN0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0Q29sb3VyKDIzMCk7XG4gICAgICAgICAgICB0aGlzLnNldFRvb2x0aXAoXCJcIik7XG4gICAgICAgICAgICB0aGlzLnNldEhlbHBVcmwoXCJcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgQmxvY2tseS5CbG9ja3NbJ2h1Yl9jb2xvciddID0ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZER1bW15SW5wdXQoKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIkhVQlwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZERyb3Bkb3duKFtbXCJIVUIxXCIsIFwiSFVCMVwiXSwgW1wiSFVCMlwiLCBcIkhVQjJcIl1dKSwgXCJIVUJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJDb2xvclwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZERyb3Bkb3duKFtbXCJCTEFDS1wiLCBcIkJMQUNLXCJdLCBbXCJQVVJQTEVcIiwgXCJQVVJQTEVcIl0sIFtcIkJMVUVcIiwgXCJCTFVFXCJdLCBbXCJMSUdIVF9CTFVFXCIsIFwiTElHSFRfQkxVRVwiXSwgW1wiQ1lBTlwiLCBcIkNZQU5cIl0sIFtcIkdSRUVOXCIsIFwiR1JFRU5cIl0sIFtcIlBJTktcIiwgXCJQSU5LXCJdLCBbXCJZRUxMT1dcIiwgXCJZRUxMT1dcIl0sIFtcIk9SQU5HRVwiLCBcIk9SQU5HRVwiXSwgW1wiUkVEXCIsIFwiUkVEXCJdLCBbXCJXSElURVwiLCBcIldISVRFXCJdXSksIFwiQ09MT1JcIik7XG4gICAgICAgICAgICB0aGlzLnNldFByZXZpb3VzU3RhdGVtZW50KHRydWUsIG51bGwpO1xuICAgICAgICAgICAgdGhpcy5zZXROZXh0U3RhdGVtZW50KHRydWUsIG51bGwpO1xuICAgICAgICAgICAgdGhpcy5zZXRDb2xvdXIoMjMwKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SGVscFVybChcIlwiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBCbG9ja2x5LkJsb2Nrc1snaHViX2dldF90aWx0J10gPSB7XG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiSFVCXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkRHJvcGRvd24oW1tcIkhVQjFcIiwgXCJIVUIxXCJdLCBbXCJIVUIyXCIsIFwiSFVCMlwiXV0pLCBcIkhVQlwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIlRpbHRcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGREcm9wZG93bihbW1wiUGl0Y2hcIiwgXCJwaXRjaFwiXSwgW1wiUm9sbFwiLCBcInJvbGxcIl0sIFtcIllhd1wiLCBcInlhd1wiXV0pLCBcIlRZUEVcIik7XG4gICAgICAgICAgICB0aGlzLnNldE91dHB1dCh0cnVlLCBcIk51bWJlclwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0Q29sb3VyKDIzMCk7XG4gICAgICAgICAgICB0aGlzLnNldFRvb2x0aXAoXCJcIik7XG4gICAgICAgICAgICB0aGlzLnNldEhlbHBVcmwoXCJcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICBCbG9ja2x5LkJsb2Nrc1snaHViX2dldF92b2x0YWdlJ10gPSB7XG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiSFVCXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKG5ldyBCbG9ja2x5LkZpZWxkRHJvcGRvd24oW1tcIkhVQjFcIiwgXCJIVUIxXCJdLCBbXCJIVUIyXCIsIFwiSFVCMlwiXV0pLCBcIkhVQlwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIlZvbHRhZ2UgKG1WKVwiKVxuICAgICAgICAgICAgdGhpcy5zZXRPdXRwdXQodHJ1ZSwgXCJOdW1iZXJcIik7XG4gICAgICAgICAgICB0aGlzLnNldENvbG91cigyMzApO1xuICAgICAgICAgICAgdGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRIZWxwVXJsKFwiXCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgQmxvY2tseS5CbG9ja3NbJ21vdG9yX3NwZWVkX3RpbWUnXSA9IHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiVkFSXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKG51bGwpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiVGFjaG9Nb3RvclwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlNQRUVEXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKFwiTnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiU3BlZWRcIik7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJUSU1FXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKFwiTnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiVGltZSAoc2VjKVwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiV2FpdFwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZENoZWNrYm94KFwiVFJVRVwiKSwgXCJXQUlUXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRQcmV2aW91c1N0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0TmV4dFN0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0Q29sb3VyKDIzMCk7XG4gICAgICAgICAgICB0aGlzLnNldFRvb2x0aXAoXCJcIik7XG4gICAgICAgICAgICB0aGlzLnNldEhlbHBVcmwoXCJcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgQmxvY2tseS5CbG9ja3NbJ21vdG9yX3NwZWVkX2RlZ3JlZXMnXSA9IHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiVkFSXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKG51bGwpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiVGFjaG9Nb3RvclwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlNQRUVEXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKFwiTnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiU3BlZWRcIik7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJERUdSRUVTXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKFwiTnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiRGVncmVlc1wiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiV2FpdFwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZENoZWNrYm94KFwiVFJVRVwiKSwgXCJXQUlUXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRQcmV2aW91c1N0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0TmV4dFN0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0Q29sb3VyKDIzMCk7XG4gICAgICAgICAgICB0aGlzLnNldFRvb2x0aXAoXCJcIik7XG4gICAgICAgICAgICB0aGlzLnNldEhlbHBVcmwoXCJcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgQmxvY2tseS5CbG9ja3NbJ21vdG9yX3NwZWVkX3Bvc2l0aW9uJ10gPSB7XG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlZBUlwiKVxuICAgICAgICAgICAgICAgIC5zZXRDaGVjayhudWxsKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIlRhY2hvTW90b3JcIik7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJTUEVFRFwiKVxuICAgICAgICAgICAgICAgIC5zZXRDaGVjayhcIk51bWJlclwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIlNwZWVkXCIpO1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiQU5HTEVcIilcbiAgICAgICAgICAgICAgICAuc2V0Q2hlY2soXCJOdW1iZXJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJBbmdsZVwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiV2FpdFwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZENoZWNrYm94KFwiVFJVRVwiKSwgXCJXQUlUXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRQcmV2aW91c1N0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0TmV4dFN0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0Q29sb3VyKDIzMCk7XG4gICAgICAgICAgICB0aGlzLnNldFRvb2x0aXAoXCJcIik7XG4gICAgICAgICAgICB0aGlzLnNldEhlbHBVcmwoXCJcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgQmxvY2tseS5CbG9ja3NbJ21vdG9yX3Jlc2V0X3Bvc2l0aW9uJ10gPSB7XG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlZBUlwiKVxuICAgICAgICAgICAgICAgIC5zZXRDaGVjayhudWxsKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIlRhY2hvTW90b3JcIilcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwicmVzZXQgcG9zaXRpb25cIilcbiAgICAgICAgICAgIHRoaXMuc2V0UHJldmlvdXNTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG4gICAgICAgICAgICB0aGlzLnNldE5leHRTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG4gICAgICAgICAgICB0aGlzLnNldElucHV0c0lubGluZSh0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0Q29sb3VyKDIzMCk7XG4gICAgICAgICAgICB0aGlzLnNldFRvb2x0aXAoXCJcIik7XG4gICAgICAgICAgICB0aGlzLnNldEhlbHBVcmwoXCJcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgQmxvY2tseS5CbG9ja3NbJ21vdG9yX2dldF9zcGVlZCddID0ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJWQVJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJUYWNob01vdG9yXCIpO1xuICAgICAgICAgICAgdGhpcy5hcHBlbmREdW1teUlucHV0KClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJTcGVlZFwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0T3V0cHV0KHRydWUsIG51bGwpO1xuICAgICAgICAgICAgdGhpcy5zZXRJbnB1dHNJbmxpbmUodHJ1ZSk7XG4gICAgICAgICAgICB0aGlzLnNldENvbG91cigyMzApO1xuICAgICAgICAgICAgdGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRIZWxwVXJsKFwiXCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIEJsb2NrbHkuQmxvY2tzWydtb3Rvcl9nZXRfcG9zaXRpb24nXSA9IHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiVkFSXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiVGFjaG9Nb3RvclwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiUG9zaXRpb25cIik7XG4gICAgICAgICAgICB0aGlzLnNldE91dHB1dCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SW5wdXRzSW5saW5lKHRydWUpO1xuICAgICAgICAgICAgdGhpcy5zZXRDb2xvdXIoMjMwKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SGVscFVybChcIlwiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBCbG9ja2x5LkJsb2Nrc1snbW90b3JfZ2V0X2Fic29sdXRlcG9zaXRpb24nXSA9IHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiVkFSXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiVGFjaG9Nb3RvclwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiQWJzb2x1dGUgUG9zaXRpb25cIik7XG4gICAgICAgICAgICB0aGlzLnNldE91dHB1dCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SW5wdXRzSW5saW5lKHRydWUpO1xuICAgICAgICAgICAgdGhpcy5zZXRDb2xvdXIoMjMwKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SGVscFVybChcIlwiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBCbG9ja2x5LkJsb2Nrc1snc2xlZXAnXSA9IHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiVElNRVwiKVxuICAgICAgICAgICAgICAgIC5zZXRDaGVjayhcIk51bWJlclwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIlNsZWVwIChzZWMpXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRQcmV2aW91c1N0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0TmV4dFN0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0Q29sb3VyKDIzMCk7XG4gICAgICAgICAgICB0aGlzLnNldFRvb2x0aXAoXCJcIik7XG4gICAgICAgICAgICB0aGlzLnNldEhlbHBVcmwoXCJcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICBCbG9ja2x5LkJsb2Nrc1snbW90b3Jfc3BlZWQnXSA9IHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRWYWx1ZUlucHV0KFwiVkFSXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKG51bGwpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiVGFjaG9Nb3RvclwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlNQRUVEXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKFwiTnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiU3BlZWRcIik7XG4gICAgICAgICAgICB0aGlzLnNldElucHV0c0lubGluZSh0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuc2V0UHJldmlvdXNTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG4gICAgICAgICAgICB0aGlzLnNldE5leHRTdGF0ZW1lbnQodHJ1ZSwgbnVsbCk7XG4gICAgICAgICAgICB0aGlzLnNldENvbG91cigyMzApO1xuICAgICAgICAgICAgdGhpcy5zZXRUb29sdGlwKFwiXCIpO1xuICAgICAgICAgICAgdGhpcy5zZXRIZWxwVXJsKFwiXCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIEJsb2NrbHkuQmxvY2tzWydtb3Rvcl9wb3dlciddID0ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJWQVJcIilcbiAgICAgICAgICAgICAgICAuc2V0Q2hlY2sobnVsbClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJNb3RvclwiKTtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kVmFsdWVJbnB1dChcIlBPV0VSXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKFwiTnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZEZpZWxkKFwiUG93ZXJcIik7XG4gICAgICAgICAgICB0aGlzLnNldElucHV0c0lubGluZSh0cnVlKTtcblxuICAgICAgICAgICAgdGhpcy5zZXRQcmV2aW91c1N0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0TmV4dFN0YXRlbWVudCh0cnVlLCBudWxsKTtcbiAgICAgICAgICAgIHRoaXMuc2V0Q29sb3VyKDIzMCk7XG4gICAgICAgICAgICB0aGlzLnNldFRvb2x0aXAoXCJcIik7XG4gICAgICAgICAgICB0aGlzLnNldEhlbHBVcmwoXCJcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICBCbG9ja2x5LkJsb2Nrc1snZGV2aWNlX3N1YnNjcmliZSddID0ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZFZhbHVlSW5wdXQoXCJERVZJQ0VcIilcbiAgICAgICAgICAgICAgICAuc2V0Q2hlY2sobnVsbClcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJEZXZpY2VcIik7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZER1bW15SW5wdXQoKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcIk1vZGVcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQobmV3IEJsb2NrbHkuRmllbGROdW1iZXIoMCwgMCwgSW5maW5pdHksIDEpLCBcIk1PREVcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kRmllbGQoXCJkZWx0YVwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZE51bWJlcigxLCAxKSwgXCJERUxUQVwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChcInN1YnNjcmliZVwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZFZhcmlhYmxlKFwidmFsdWVcIiksIFwiVkFSXCIpO1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRTdGF0ZW1lbnRJbnB1dChcIkRPXCIpXG4gICAgICAgICAgICAgICAgLnNldENoZWNrKG51bGwpO1xuICAgICAgICAgICAgdGhpcy5zZXRJbnB1dHNJbmxpbmUodHJ1ZSk7XG4gICAgICAgICAgICB0aGlzLnNldFByZXZpb3VzU3RhdGVtZW50KHRydWUsIG51bGwpO1xuICAgICAgICAgICAgdGhpcy5zZXROZXh0U3RhdGVtZW50KHRydWUsIG51bGwpO1xuICAgICAgICAgICAgdGhpcy5zZXRDb2xvdXIoMjMwKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VG9vbHRpcChcIlwiKTtcbiAgICAgICAgICAgIHRoaXMuc2V0SGVscFVybChcIlwiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pKCk7XG4iLCIvLyBAdHMtY2hlY2tcblxuXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncm9vdFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImxlZnRcXFwiPlxcbiAgICAgICAgPGJ1dHRvbiBibi1ldmVudD1cXFwiY2xpY2s6IG9uQ29ubmVjdFxcXCI+Q29ubmVjdCB0byBIVUI8L2J1dHRvbj5cXG4gICAgICAgIFxcbiAgICAgICAgPGJ1dHRvbiBibi1ldmVudD1cXFwiY2xpY2s6IG9uQ29kZVxcXCI+Q29kZTwvYnV0dG9uPlxcblxcblxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cXG5cXG5cXG48ZGl2PlxcbiAgICA8dGFibGUgY2xhc3M9XFxcInczLXRhYmxlLWFsbFxcXCI+XFxuICAgICAgICA8dGhlYWQ+XFxuICAgICAgICAgICAgPHRyPlxcbiAgICAgICAgICAgICAgICA8dGg+SHViPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPkFjdGlvbnM8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+QmF0dGVyeSBMZXZlbDwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5BZGRyZXNzPC90aD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90aGVhZD5cXG4gICAgICAgIDx0Ym9keSBibi1lYWNoPVxcXCJodWJEZXZpY2VzXFxcIiBibi1ldmVudD1cXFwiY2xpY2suYnRuU2h1dGRvd246IG9uU2h1dERvd24sIGNsaWNrLmJ0bkluZm86IG9uSW5mbywgY29tYm9ib3hjaGFuZ2UuY29tYm86IG9uSHViQ2hhbmdlXFxcIj5cXG4gICAgICAgICAgICA8dHI+XFxuICAgICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBodWJzfVxcXCIgYm4tdmFsPVxcXCIkc2NvcGUuJGkuaHViSWRcXFwiIGNsYXNzPVxcXCJjb21ib1xcXCI+PC9kaXY+XFxuICAgICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcImJ0blNodXRkb3duXFxcIj5TaHV0ZG93bjwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYnRuSW5mb1xcXCI+SW5mbzwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmJhdHRlcnlMZXZlbFxcXCI+PC90ZD5cXG4gICAgICAgICAgICAgICAgPHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5hZGRyZXNzXFxcIj48L3RkPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICA8L3Rib2R5PlxcbiAgICA8L3RhYmxlPlxcblxcbjwvZGl2PlwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInLCAnaHViJywgJ2JyZWl6Ym90LmJsb2NrbHlpbnRlcnByZXRvciddLFxuXG5cblx0cHJvcHM6IHtcblx0fSxcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcblx0ICogQHBhcmFtIHtIVUJ9IGh1YlxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkJsb2NrbHlJbnRlcnByZXRvci5JbnRlcmZhY2V9IGJsb2NrbHlJbnRlcnByZXRvclxuXHQgKiBcblx0ICovXG5cdGluaXQ6IGFzeW5jIGZ1bmN0aW9uIChlbHQsIHBhZ2VyLCBodWIsIGJsb2NrbHlJbnRlcnByZXRvcikge1xuXG5cdFx0Ly9jb25zdCBjb25maWcgPSB7fVxuXG5cdFx0ZWx0LmZpbmQoJ2J1dHRvbicpLmFkZENsYXNzKCd3My1idG4gdzMtYmx1ZScpXG5cblx0XHQvKipAdHlwZSB7e1tVVUlEOiBzdHJpbmddOiBIVUIuSHViRGV2aWNlfX0gKi9cblx0XHRjb25zdCBodWJEZXZpY2VzID0ge31cblx0XHRsZXQgVVVJRCA9IDFcblxuXHRcdGxldCBjb25maWcgPSBudWxsXG5cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0Y3VycmVudENvbmZpZzogJycsXG5cdFx0XHRcdGdhbWVwYWRDb25uZWN0ZWQ6IGZhbHNlLFxuXHRcdFx0XHRodWJEZXZpY2VzOiBbXSxcblx0XHRcdFx0aHViczogWydIVUIxJywgJ0hVQjInXVxuXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQ29kZTogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uQ29kZScpXG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2NvZGUnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0NvZGUnLFxuXHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0aHViRGV2aWNlczogT2JqZWN0LnZhbHVlcyhodWJEZXZpY2VzKSxcblx0XHRcdFx0XHRcdFx0Y29uZmlnLFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdG9uQmFjazogZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uQmFjaycsIHZhbHVlKVxuXHRcdFx0XHRcdFx0XHRjb25maWcgPSB2YWx1ZVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25IdWJDaGFuZ2U6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuaW5kZXgoKVxuXG5cdFx0XHRcdFx0Y29uc3QgaHViSWQgPSAkKHRoaXMpLmdldFZhbHVlKClcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbkh1YkNoYW5nZScsIGlkeCwgaHViSWQpXG5cblx0XHRcdFx0XHRjb25zdCBodWJEZXZpY2UgPSBodWJEZXZpY2VzW2N0cmwubW9kZWwuaHViRGV2aWNlc1tpZHhdLlVVSURdXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ2h1YkRldmljZScsIGh1YkRldmljZSlcblx0XHRcdFx0XHRodWJEZXZpY2UubmFtZSA9IGh1YklkXG5cdFx0XHRcdFx0Y3RybC5tb2RlbC5odWJEZXZpY2VzW2lkeF0uaHViSWQgPSBodWJJZFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblNodXREb3duOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmluZGV4KClcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvblNodXREb3duJywgaWR4KVxuXG5cdFx0XHRcdFx0LyoqQHR5cGUge0FjdGlvblNydi5IdWJEZXNjfSAqL1xuXHRcdFx0XHRcdGNvbnN0IGh1YkRlc2MgPSBjdHJsLm1vZGVsLmh1YkRldmljZXNbaWR4XVxuXHRcdFx0XHRcdGNvbnN0IGh1YkRldmljZSA9IGh1YkRldmljZXNbaHViRGVzYy5VVUlEXVxuXHRcdFx0XHRcdGh1YkRldmljZS5zaHV0ZG93bigpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSW5mbzogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5pbmRleCgpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25JbmZvJywgaWR4KVxuXHRcdFx0XHRcdC8qKkB0eXBlIHtBY3Rpb25TcnYuSHViRGVzY30gKi9cblx0XHRcdFx0XHRjb25zdCBodWJEZXNjID0gY3RybC5tb2RlbC5odWJEZXZpY2VzW2lkeF1cblx0XHRcdFx0XHRjb25zdCBodWJEZXZpY2UgPSBodWJEZXZpY2VzW2h1YkRlc2MuVVVJRF1cblx0XHRcdFx0XHRjb25zb2xlLmxvZygnaHViRGV2aWNlJywgaHViRGV2aWNlKVxuXG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2h1YmluZm8nLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogaHViRGVzYy5odWJJZCxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdGh1YkRldmljZVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cblxuXG5cdFx0XHRcdG9uQ29ubmVjdDogYXN5bmMgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IGh1YkRldmljZSA9IGF3YWl0IGh1Yi5jb25uZWN0KClcblx0XHRcdFx0XHRjb25zdCBpZCA9IFVVSUQrK1xuXG5cdFx0XHRcdFx0aHViRGV2aWNlc1tpZF0gPSBodWJEZXZpY2VcblxuXHRcdFx0XHRcdGh1YkRldmljZS5vbignZXJyb3InLCAoZGF0YSkgPT4ge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coZGF0YSlcblx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdFx0Y29uc3QgbmJIdWJzID0gY3RybC5tb2RlbC5odWJEZXZpY2VzLmxlbmd0aFxuXHRcdFx0XHRcdGNvbnN0IGh1YklkID0gYEhVQiR7bmJIdWJzICsgMX1gXG5cdFx0XHRcdFx0aHViRGV2aWNlLm5hbWUgPSBodWJJZFxuXHRcdFx0XHRcdGN0cmwubW9kZWwuaHViRGV2aWNlcy5wdXNoKHsgVVVJRDogaWQsIGh1YklkLCBiYXR0ZXJ5TGV2ZWw6IDAsIGFkZHJlc3M6ICdVbmtub3duJyB9KVxuXHRcdFx0XHRcdGN0cmwudXBkYXRlKClcblxuXHRcdFx0XHRcdGh1YkRldmljZS5vbignYmF0dGVyeUxldmVsJywgKGRhdGEpID0+IHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2JhdHRlcnlMZXZlbCcsIGRhdGEpXG5cdFx0XHRcdFx0XHRjb25zdCBodWJEZXNjID0gY3RybC5tb2RlbC5odWJEZXZpY2VzLmZpbmQoKGUpID0+IGUuVVVJRCA9PSBpZClcblx0XHRcdFx0XHRcdGh1YkRlc2MuYmF0dGVyeUxldmVsID0gZGF0YS5iYXR0ZXJ5TGV2ZWxcblx0XHRcdFx0XHRcdGN0cmwudXBkYXRlKClcblx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdFx0aHViRGV2aWNlLm9uKCdhZGRyZXNzJywgKGRhdGEpID0+IHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdhZGRyZXNzJywgZGF0YSlcblx0XHRcdFx0XHRcdGNvbnN0IGh1YkRlc2MgPSBjdHJsLm1vZGVsLmh1YkRldmljZXMuZmluZCgoZSkgPT4gZS5VVUlEID09IGlkKVxuXHRcdFx0XHRcdFx0aHViRGVzYy5hZGRyZXNzID0gZGF0YS5hZGRyZXNzXG5cdFx0XHRcdFx0XHRjdHJsLnVwZGF0ZSgpXG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdGF3YWl0IGh1YkRldmljZS5zdGFydE5vdGlmaWNhdGlvbigpXG5cblx0XHRcdFx0XHRodWJEZXZpY2Uub24oJ2Rpc2Nvbm5lY3RlZCcsICgpID0+IHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdkaXNjb25uZWN0ZWQnKVxuXHRcdFx0XHRcdFx0Y29uc3QgaWR4ID0gY3RybC5tb2RlbC5odWJEZXZpY2VzLmZpbmRJbmRleCgoZSkgPT4gZS5VVUlEID09IGlkKVxuXHRcdFx0XHRcdFx0Y3RybC5tb2RlbC5odWJEZXZpY2VzLnNwbGljZShpZHgsIDEpXG5cdFx0XHRcdFx0XHRjdHJsLnVwZGF0ZSgpXG5cdFx0XHRcdFx0XHRkZWxldGUgaHViRGV2aWNlc1tpZF1cblx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdH1cblxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIi8vIEB0cy1jaGVja1xuXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnY29kZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cXG4gICAgPGRpdj5cXG4gICAgICAgIDxidXR0b24gYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkV4cG9ydFxcXCIgIHRpdGxlPVxcXCJFeHBvcnQgY3VycmVudCBjb25maWdcXFwiPkV4cG9ydDwvYnV0dG9uPlxcbiAgICAgICAgPGJ1dHRvbiBibi1ldmVudD1cXFwiY2xpY2s6IG9uSW1wb3J0XFxcIiAgdGl0bGU9XFxcIkltcG9ydCBjb25maWdcXFwiPkltcG9ydDwvYnV0dG9uPlxcblxcbiAgICAgICAgPGJ1dHRvbiBibi1ldmVudD1cXFwiY2xpY2s6IG9uTmV3Q29uZmlnXFxcIiBibi1pY29uPVxcXCJmYSBmYS1maWxlXFxcIiB0aXRsZT1cXFwiUmVzZXQgQ29uZmlnXFxcIj48L2J1dHRvbj5cXG5cXG4gICAgICAgIDxidXR0b24gYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkNvbmZpZ1xcXCIgYm4taWNvbj1cXFwiZmEgZmEtZm9sZGVyLW9wZW5cXFwiIHRpdGxlPVxcXCJPcGVuIENvbmZpZ1xcXCI+PC9idXR0b24+XFxuXFxuICAgICAgICA8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25TYXZlQ29uZmlnXFxcIiBibi1pY29uPVxcXCJmYSBmYS1zYXZlXFxcIiB0aXRsZT1cXFwiU2F2ZSBjdXJyZW50IGNvbmZpZ1xcXCI+PC9idXR0b24+XFxuXFxuICAgICAgICA8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25SdW5cXFwiPlJ1bjwvYnV0dG9uPlxcblxcbiAgICAgICAgPGJ1dHRvbiBibi1ldmVudD1cXFwiY2xpY2s6IG9uU3RvcFxcXCI+U3RvcDwvYnV0dG9uPlxcblxcbiAgICAgICAgPGJ1dHRvbiBibi1ldmVudD1cXFwiY2xpY2s6IG9uR2FtZVBhZFxcXCIgYm4tc2hvdz1cXFwiZ2FtZXBhZENvbm5lY3RlZFxcXCI+R2FtZXBhZDwvYnV0dG9uPlxcbiAgICA8L2Rpdj5cXG5cXG5cXG4gICAgPGRpdj5cXG4gICAgICAgIDxkaXYgYm4tc2hvdz1cXFwiY3VycmVudENvbmZpZ1xcXCI+XFxuICAgICAgICAgICAgPGxhYmVsPkN1cnJlbnQgQ29uZmlnOjwvbGFiZWw+XFxuICAgICAgICAgICAgPHNwYW4gYm4tdGV4dD1cXFwiY3VycmVudENvbmZpZ1xcXCI+PC9zcGFuPlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcblxcblxcblxcbjwvZGl2PlxcbjxkaXYgaWQ9XFxcImJsb2NrbHlEaXZcXFwiPjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImxvZ1BhbmVsXFxcIiBibi1odG1sPVxcXCJnZXRMb2dzXFxcIiBibi1iaW5kPVxcXCJsb2dQYW5lbFxcXCI+PC9kaXY+XFxuXFxuPHhtbCBpZD1cXFwidG9vbGJveFxcXCIgc3R5bGU9XFxcImRpc3BsYXk6IG5vbmU7XFxcIj5cXG4gICAgPGNhdGVnb3J5IG5hbWU9XFxcIkxvZ2ljXFxcIiBjYXRlZ29yeXN0eWxlPVxcXCJsb2dpY19jYXRlZ29yeVxcXCI+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwiY29udHJvbHNfaWZcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibG9naWNfY29tcGFyZVxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsb2dpY19vcGVyYXRpb25cXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibG9naWNfbmVnYXRlXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxvZ2ljX2Jvb2xlYW5cXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibG9naWNfdGVybmFyeVxcXCI+PC9ibG9jaz5cXG4gICAgPC9jYXRlZ29yeT5cXG4gICAgPGNhdGVnb3J5IG5hbWU9XFxcIkxvb3BcXFwiIGNhdGVnb3J5c3R5bGU9XFxcImxvb3BfY2F0ZWdvcnlcXFwiPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImNvbnRyb2xzX3JlcGVhdF9leHRcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJUSU1FU1xcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTA8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJjb250cm9sc193aGlsZVVudGlsXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImNvbnRyb2xzX2ZvclxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIkZST01cXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjE8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJUT1xcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTA8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJCWVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImNvbnRyb2xzX2ZvckVhY2hcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwiY29udHJvbHNfZmxvd19zdGF0ZW1lbnRzXFxcIj48L2Jsb2NrPlxcbiAgICA8L2NhdGVnb3J5PlxcbiAgICA8Y2F0ZWdvcnkgbmFtZT1cXFwiTWF0aFxcXCIgY2F0ZWdvcnlzdHlsZT1cXFwibWF0aF9jYXRlZ29yeVxcXCI+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibWF0aF9hcml0aG1ldGljXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcIm1hdGhfc2luZ2xlXFxcIj5cXG4gICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiT1BcXFwiPlJPT1Q8L2ZpZWxkPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJOVU1cXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjk8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJtYXRoX3RyaWdcXFwiPlxcbiAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJPUFxcXCI+U0lOPC9maWVsZD5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiTlVNXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj40NTwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcIm1hdGhfY29uc3RhbnRcXFwiPlxcbiAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJDT05TVEFOVFxcXCI+UEk8L2ZpZWxkPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJtYXRoX3JhbmRvbV9pbnRcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJGUk9NXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj4xPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVE9cXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjEwMDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcIm1hdGhfcm91bmRcXFwiPlxcbiAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJPUFxcXCI+Uk9VTkQ8L2ZpZWxkPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJOVU1cXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjMuMTwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICA8L2NhdGVnb3J5PlxcbiAgICA8Y2F0ZWdvcnkgbmFtZT1cXFwiVGV4dFxcXCIgY2F0ZWdvcnlzdHlsZT1cXFwidGV4dF9jYXRlZ29yeVxcXCI+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwidGV4dFxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJ0ZXh0X3ByaW50XFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcInRleHRfbGVuZ3RoXFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVkFMVUVcXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcInRleHRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlRFWFRcXFwiPmFiYzwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcInRleHRfY2hhbmdlQ2FzZVxcXCI+XFxuICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIkNBU0VcXFwiPlVQUEVSQ0FTRTwvZmllbGQ+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlRFWFRcXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcInRleHRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlRFWFRcXFwiPmFiYzwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcInRleHRfYXBwZW5kXFxcIj5cXG4gICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVkFSXFxcIiBpZD1cXFwiTUh2ZUUkXiNYNy9jfCpSQSFye0lcXFwiPml0ZW08L2ZpZWxkPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJURVhUXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJ0ZXh0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJURVhUXFxcIiAvPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJ0ZXh0X2pvaW5cXFwiPlxcbiAgICAgICAgICAgIDxtdXRhdGlvbiBpdGVtcz1cXFwiMlxcXCIgLz5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwidGV4dF9pbmRleE9mXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcInRleHRfY2hhckF0XFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcInRleHRfZ2V0U3Vic3RyaW5nXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcInRleHRfcHJvbXB0X2V4dFxcXCI+XFxuICAgICAgICAgICAgPG11dGF0aW9uIHR5cGU9XFxcIlRFWFRcXFwiIC8+XFxuICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlRZUEVcXFwiPlRFWFQ8L2ZpZWxkPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJURVhUXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJ0ZXh0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJURVhUXFxcIj5hYmM8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgPC9jYXRlZ29yeT5cXG4gICAgPGNhdGVnb3J5IG5hbWU9XFxcIkxpc3RzXFxcIiBjYXRlZ29yeXN0eWxlPVxcXCJsaXN0X2NhdGVnb3J5XFxcIj5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsaXN0c19jcmVhdGVfd2l0aFxcXCI+XFxuICAgICAgICAgICAgPG11dGF0aW9uIGl0ZW1zPVxcXCIwXFxcIj48L211dGF0aW9uPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsaXN0c19jcmVhdGVfd2l0aFxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsaXN0c19yZXBlYXRcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJOVU1cXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjU8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsaXN0c19sZW5ndGhcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfaXNFbXB0eVxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsaXN0c19pbmRleE9mXFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVkFMVUVcXFwiPlxcbiAgICAgICAgICAgICAgICA8YmxvY2sgdHlwZT1cXFwidmFyaWFibGVzX2dldFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVkFSXFxcIj5saXN0PC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsaXN0c19nZXRJbmRleFxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlZBTFVFXFxcIj5cXG4gICAgICAgICAgICAgICAgPGJsb2NrIHR5cGU9XFxcInZhcmlhYmxlc19nZXRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlZBUlxcXCI+bGlzdDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfc2V0SW5kZXhcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJMSVNUXFxcIj5cXG4gICAgICAgICAgICAgICAgPGJsb2NrIHR5cGU9XFxcInZhcmlhYmxlc19nZXRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlZBUlxcXCI+bGlzdDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfZ2V0U3VibGlzdFxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIkxJU1RcXFwiPlxcbiAgICAgICAgICAgICAgICA8YmxvY2sgdHlwZT1cXFwidmFyaWFibGVzX2dldFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVkFSXFxcIj5saXN0PC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsaXN0c19zcGxpdFxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIkRFTElNXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJ0ZXh0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJURVhUXFxcIj4sPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfc29ydFxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsaXN0c19yZXZlcnNlXFxcIj48L2Jsb2NrPlxcbiAgICA8L2NhdGVnb3J5PlxcbiAgICA8Y2F0ZWdvcnkgbmFtZT1cXFwiVmFyaWFibGVzXFxcIiBjdXN0b209XFxcIlZBUklBQkxFXFxcIiBjYXRlZ29yeXN0eWxlPVxcXCJ2YXJpYWJsZV9jYXRlZ29yeVxcXCI+PC9jYXRlZ29yeT5cXG4gICAgPGNhdGVnb3J5IG5hbWU9XFxcIkZ1bmN0aW9uc1xcXCIgY3VzdG9tPVxcXCJQUk9DRURVUkVcXFwiIGNhdGVnb3J5c3R5bGU9XFxcInByb2NlZHVyZV9jYXRlZ29yeVxcXCI+PC9jYXRlZ29yeT5cXG4gICAgPGNhdGVnb3J5IG5hbWU9XFxcIk9iamVjdFxcXCIgY29sb3VyPVxcXCIzNTVcXFwiPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcIm9iamVjdF9nZXRmaWVsZFxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIk9CSkVDVFxcXCI+XFxuICAgICAgICAgICAgICAgIDxibG9jayB0eXBlPVxcXCJ2YXJpYWJsZXNfZ2V0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJWQVJcXFwiPm9iamVjdDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgIDwvY2F0ZWdvcnk+XFxuICAgIDxjYXRlZ29yeSBuYW1lPVxcXCJEZXZpY2VcXFwiIGNvbG91cj1cXFwiMzU1XFxcIj5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJjcmVhdGVfZGV2aWNlXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImRldmljZV9nZXR2YWx1ZVxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIkRFVklDRVxcXCI+XFxuICAgICAgICAgICAgICAgIDxibG9jayB0eXBlPVxcXCJ2YXJpYWJsZXNfZ2V0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJWQVJcXFwiPmRldmljZTwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwid2FpdF91bnRpbF9kZXZpY2VcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJERVZJQ0VcXFwiPlxcbiAgICAgICAgICAgICAgICA8YmxvY2sgdHlwZT1cXFwidmFyaWFibGVzX2dldFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVkFSXFxcIj5kZXZpY2U8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImRldmljZV9zdWJzY3JpYmVcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJERVZJQ0VcXFwiPlxcbiAgICAgICAgICAgICAgICA8YmxvY2sgdHlwZT1cXFwidmFyaWFibGVzX2dldFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVkFSXFxcIj5kZXZpY2U8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICA8L2NhdGVnb3J5PlxcbiAgICA8Y2F0ZWdvcnkgbmFtZT1cXFwiTW90b3JcXFwiIGNvbG91cj1cXFwiMzU1XFxcIj5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJjcmVhdGVfbW90b3JcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibW90b3JfcG93ZXJcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJWQVJcXFwiPlxcbiAgICAgICAgICAgICAgICA8YmxvY2sgdHlwZT1cXFwidmFyaWFibGVzX2dldFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVkFSXFxcIj5tb3RvcjwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT4gICAgICAgICAgICBcXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiUE9XRVJcXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjEwMDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICA8L2NhdGVnb3J5PlxcbiAgICA8Y2F0ZWdvcnkgbmFtZT1cXFwiVGFjaG9Nb3RvclxcXCIgY29sb3VyPVxcXCIzNTVcXFwiPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImNyZWF0ZV90YWNob19tb3RvclxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJtb3Rvcl9zcGVlZFxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlZBUlxcXCI+XFxuICAgICAgICAgICAgICAgIDxibG9jayB0eXBlPVxcXCJ2YXJpYWJsZXNfZ2V0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJWQVJcXFwiPm1vdG9yPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgICAgICA8L3ZhbHVlPiAgXFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlNQRUVEXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj4xMDA8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJtb3Rvcl9zcGVlZF90aW1lXFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVkFSXFxcIj5cXG4gICAgICAgICAgICAgICAgPGJsb2NrIHR5cGU9XFxcInZhcmlhYmxlc19nZXRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlZBUlxcXCI+bW90b3I8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgICAgIDwvdmFsdWU+ICBcXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVElNRVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlNQRUVEXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj4xMDA8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJtb3Rvcl9zcGVlZF9kZWdyZWVzXFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVkFSXFxcIj5cXG4gICAgICAgICAgICAgICAgPGJsb2NrIHR5cGU9XFxcInZhcmlhYmxlc19nZXRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlZBUlxcXCI+bW90b3I8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgICAgIDwvdmFsdWU+ICBcXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiREVHUkVFU1xcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTgwPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiU1BFRURcXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjEwMDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcIm1vdG9yX3NwZWVkX3Bvc2l0aW9uXFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVkFSXFxcIj5cXG4gICAgICAgICAgICAgICAgPGJsb2NrIHR5cGU9XFxcInZhcmlhYmxlc19nZXRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlZBUlxcXCI+bW90b3I8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgICAgIDwvdmFsdWU+ICBcXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiQU5HTEVcXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjA8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJTUEVFRFxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTAwPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibW90b3JfcmVzZXRfcG9zaXRpb25cXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJWQVJcXFwiPlxcbiAgICAgICAgICAgICAgICA8YmxvY2sgdHlwZT1cXFwidmFyaWFibGVzX2dldFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVkFSXFxcIj5tb3RvcjwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT4gIFxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJtb3Rvcl9nZXRfc3BlZWRcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJWQVJcXFwiPlxcbiAgICAgICAgICAgICAgICA8YmxvY2sgdHlwZT1cXFwidmFyaWFibGVzX2dldFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVkFSXFxcIj5tb3RvcjwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT4gIFxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJtb3Rvcl9nZXRfcG9zaXRpb25cXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJWQVJcXFwiPlxcbiAgICAgICAgICAgICAgICA8YmxvY2sgdHlwZT1cXFwidmFyaWFibGVzX2dldFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVkFSXFxcIj5tb3RvcjwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT4gIFxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJtb3Rvcl9nZXRfYWJzb2x1dGVwb3NpdGlvblxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlZBUlxcXCI+XFxuICAgICAgICAgICAgICAgIDxibG9jayB0eXBlPVxcXCJ2YXJpYWJsZXNfZ2V0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJWQVJcXFwiPm1vdG9yPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgICAgICA8L3ZhbHVlPiAgXFxuICAgICAgICA8L2Jsb2NrPlxcblxcbiAgICA8L2NhdGVnb3J5PlxcbiAgICA8Y2F0ZWdvcnkgbmFtZT1cXFwiUGFpck1vdG9yXFxcIiBjb2xvdXI9XFxcIjM1NVxcXCI+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwiY3JlYXRlX3BhaXJfbW90b3JcXFwiPlxcbiAgICAgICAgICAgIDxGSUVMRCBuYW1lPVxcXCJQT1JUMlxcXCI+QjwvRklFTEQ+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcInBhaXJfbW90b3Jfc3BlZWRcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJWQVJcXFwiPlxcbiAgICAgICAgICAgICAgICA8YmxvY2sgdHlwZT1cXFwidmFyaWFibGVzX2dldFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVkFSXFxcIj5tb3RvcjwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT4gIFxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJTUEVFRDFcXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjEwMDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlNQRUVEMlxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTAwPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuXFxuXFxuICAgIDwvY2F0ZWdvcnk+XFxuICAgIDxjYXRlZ29yeSBuYW1lPVxcXCJIdWJcXFwiIGNvbG91cj1cXFwiMzU1XFxcIj5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJodWJfY29sb3JcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwiaHViX2dldF90aWx0XFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImh1Yl9nZXRfdm9sdGFnZVxcXCI+PC9ibG9jaz5cXG4gICAgPC9jYXRlZ29yeT5cXG4gICAgPGNhdGVnb3J5IG5hbWU9XFxcIlN5c3RlbVxcXCIgY29sb3VyPVxcXCIzNTVcXFwiPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcInNsZWVwXFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVElNRVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICA8L2NhdGVnb3J5PlxcblxcbjwveG1sPlwiLFxuXG5cdGRlcHM6IFtcblx0XHQnYnJlaXpib3QucGFnZXInLFxuXHRcdCdicmVpemJvdC5ibG9ja2x5aW50ZXJwcmV0b3InLCBcblx0XHQnaHViJywgXG5cdFx0J2JyZWl6Ym90LmdhbWVwYWQnLCBcblx0XHQnYnJlaXpib3QuaHR0cCcsXG5cdFx0J2JyZWl6Ym90LmZpbGVzJ1xuXHRdLFxuXG5cdHByb3BzOiB7XG5cdFx0aHViRGV2aWNlczogbnVsbCxcblx0XHRjb25maWc6IG51bGwsXG5cblx0fSxcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5CbG9ja2x5SW50ZXJwcmV0b3IuSW50ZXJmYWNlfSBibG9ja2x5SW50ZXJwcmV0b3Jcblx0ICogQHBhcmFtIHtIVUJ9IGh1YlNydlxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkdhbWVwYWQuSW50ZXJmYWNlfSBnYW1lcGFkXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuSHR0cC5JbnRlcmZhY2V9IGh0dHBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5GaWxlcy5JbnRlcmZhY2V9IGZpbGVTcnZcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHBhZ2VyLCBibG9ja2x5SW50ZXJwcmV0b3IsIGh1YlNydiwgZ2FtZXBhZCwgaHR0cCwgZmlsZVNydikge1xuXG5cdFx0Y29uc29sZS5sb2coJ3Byb3BzJywgdGhpcy5wcm9wcylcblxuXHRcdGNvbnN0IHByb2dyZXNzRGxnID0gJCQudWkucHJvZ3Jlc3NEaWFsb2coJ0xvYWRpbmcgZGV2aWNlIGluZm8nKVxuXG5cdFx0LyoqQHR5cGUge0FycmF5PEhVQi5IdWJEZXZpY2U+fSAqL1xuXHRcdGNvbnN0IGh1YkRldmljZXMgPSB0aGlzLnByb3BzLmh1YkRldmljZXNcblxuXHRcdGVsdC5maW5kKCdidXR0b24nKS5hZGRDbGFzcygndzMtYnRuIHczLWJsdWUnKVxuXG5cdFx0bGV0IHsgY29uZmlnIH0gPSB0aGlzLnByb3BzXG5cblx0XHRpZiAoY29uZmlnID09IG51bGwpIHtcblx0XHRcdGNvbmZpZyA9IHtcblx0XHRcdFx0Y29kZTogbnVsbCxcblx0XHRcdFx0Z2FtZXBhZElkOiAnJyxcblx0XHRcdFx0bWFwcGluZ3M6IHt9LFxuXHRcdFx0XHRuYW1lOiAnJ1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGNvbnNvbGUubG9nKCdjb25maWcnLCBjb25maWcpXG5cblx0XHRnYW1lcGFkLm9uKCdjb25uZWN0ZWQnLCAoZXYpID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKCdnYW1lcGFkIGNvbm5uZWN0ZWQnLCBldilcblx0XHRcdGNvbmZpZy5nYW1lcGFkSWQgPSBldi5pZFxuXHRcdFx0Y29uZmlnLmdhbWVwYWRNYXBwaW5nID0gY29uZmlnLm1hcHBpbmdzW2V2LmlkXVxuXHRcdFx0Y29uc29sZS5sb2coeyBnYW1lcGFkTWFwcGluZzogY29uZmlnLmdhbWVwYWRNYXBwaW5nIH0pXG5cblx0XHRcdGN0cmwuc2V0RGF0YSh7IGdhbWVwYWRDb25uZWN0ZWQ6IHRydWUgfSlcblx0XHRcdGdhbWVwYWQuY2hlY2tHYW1lUGFkU3RhdHVzKClcblxuXHRcdH0pXG5cblx0XHRnYW1lcGFkLm9uKCdkaXNjb25uZWN0ZWQnLCAoZXYpID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKCdnYW1lcGFkIGRpc2Nvbm5lY3RlZCcpXG5cdFx0XHRjdHJsLnNldERhdGEoeyBnYW1lcGFkQ29ubmVjdGVkOiBmYWxzZSB9KVxuXHRcdFx0Y29uZmlnLmdhbWVwYWRNYXBwaW5nID0gbnVsbFxuXHRcdFx0Y29uZmlnLmdhbWVwYWRJZCA9ICcnXG5cblx0XHR9KVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gY2FsbEZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuY2FsbEZ1bmN0aW9uKG5hbWUsIHZhbHVlKVxuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiBlID09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHsgdGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6IGUgfSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGxldCBnYW1lcGFkQXhlc1ZhbHVlID0ge31cblxuXHRcdGFzeW5jIGZ1bmN0aW9uIG9uR2FtZXBhZEF4ZShkYXRhKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdheGUnLCBkYXRhKVxuXHRcdFx0aWYgKGNvbmZpZy5nYW1lcGFkTWFwcGluZykge1xuXHRcdFx0XHRjb25zdCB7IGFjdGlvbiB9ID0gY29uZmlnLmdhbWVwYWRNYXBwaW5nLmF4ZXNbZGF0YS5pZF1cblx0XHRcdFx0bGV0IHsgdmFsdWUgfSA9IGRhdGFcblx0XHRcdFx0aWYgKGFjdGlvbiAhPSAnTm9uZScpIHtcblx0XHRcdFx0XHR2YWx1ZSA9IE1hdGguc2lnbih2YWx1ZSkgKiAxMDBcblx0XHRcdFx0XHRpZiAodmFsdWUgIT0gKGdhbWVwYWRBeGVzVmFsdWVbZGF0YS5pZF0gfHwgMCkpIHtcblx0XHRcdFx0XHRcdGdhbWVwYWRBeGVzVmFsdWVbZGF0YS5pZF0gPSB2YWx1ZVxuXHRcdFx0XHRcdFx0YXdhaXQgY2FsbEZ1bmN0aW9uKGFjdGlvbiwgdmFsdWUpXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRhc3luYyBmdW5jdGlvbiBvbkdhbWVwYWRCdXR0b25Eb3duKGRhdGEpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdidXR0b25Eb3duJywgZGF0YS5pZClcblx0XHRcdGlmIChjb25maWcuZ2FtZXBhZE1hcHBpbmcpIHtcblx0XHRcdFx0Y29uc3QgeyBkb3duLCBkb3duVmFsdWUgfSA9IGNvbmZpZy5nYW1lcGFkTWFwcGluZy5idXR0b25zW2RhdGEuaWRdXG5cdFx0XHRcdGlmIChkb3duICE9ICdOb25lJykge1xuXHRcdFx0XHRcdGF3YWl0IGNhbGxGdW5jdGlvbihkb3duLCBkb3duVmFsdWUpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRhc3luYyBmdW5jdGlvbiBvbkdhbWVwYWRCdXR0b25VcChkYXRhKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnYnV0dG9uRG93bicsIGRhdGEuaWQpXG5cdFx0XHRpZiAoY29uZmlnLmdhbWVwYWRNYXBwaW5nKSB7XG5cdFx0XHRcdGNvbnN0IHsgdXAsIHVwVmFsdWUgfSA9IGNvbmZpZy5nYW1lcGFkTWFwcGluZy5idXR0b25zW2RhdGEuaWRdXG5cdFx0XHRcdGlmICh1cCAhPSAnTm9uZScpIHtcblx0XHRcdFx0XHRhd2FpdCBjYWxsRnVuY3Rpb24odXAsIHVwVmFsdWUpXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGVuYWJsZUNhbGxiYWNrKGVuYWJsZWQpIHtcblx0XHRcdGlmIChlbmFibGVkKSB7XG5cdFx0XHRcdGdhbWVwYWQub24oJ2F4ZScsIG9uR2FtZXBhZEF4ZSlcblx0XHRcdFx0Z2FtZXBhZC5vbignYnV0dG9uRG93bicsIG9uR2FtZXBhZEJ1dHRvbkRvd24pXG5cdFx0XHRcdGdhbWVwYWQub24oJ2J1dHRvblVwJywgb25HYW1lcGFkQnV0dG9uVXApXG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Z2FtZXBhZC5vZmYoJ2F4ZScsIG9uR2FtZXBhZEF4ZSlcblx0XHRcdFx0Z2FtZXBhZC5vZmYoJ2J1dHRvbkRvd24nLCBvbkdhbWVwYWRCdXR0b25Eb3duKVxuXHRcdFx0XHRnYW1lcGFkLm9mZignYnV0dG9uVXAnLCBvbkdhbWVwYWRCdXR0b25VcClcblx0XHRcdH1cblx0XHR9XG5cblx0XHRlbmFibGVDYWxsYmFjayh0cnVlKVxuXG5cblx0XHR0aGlzLmRpc3Bvc2UgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnZGlzcG9zZScpXG5cdFx0XHRlbmFibGVDYWxsYmFjayhmYWxzZSlcblxuXHRcdH1cblxuXHRcdGNvbnN0IGRlbW9Xb3Jrc3BhY2UgPSBCbG9ja2x5LmluamVjdCgnYmxvY2tseURpdicsXG5cdFx0XHR7XG5cdFx0XHRcdG1lZGlhOiAnL2V4dC9ibG9ja2x5L21lZGlhLycsXG5cdFx0XHRcdHRvb2xib3g6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b29sYm94Jylcblx0XHRcdFx0Ly9ob3Jpem9udGFsTGF5b3V0OiB0cnVlLFxuXHRcdFx0XHQvL3Rvb2xib3hQb3NpdGlvbjogJ2VuZCdcblx0XHRcdH1cblx0XHQpXG5cblx0XHRibG9ja2x5SW50ZXJwcmV0b3Iuc2V0TG9nRnVuY3Rpb24oKHRleHQpID0+IHtcblx0XHRcdGN0cmwubW9kZWwubG9ncy5wdXNoKHRleHQpXG5cdFx0XHRjdHJsLnVwZGF0ZSgpXG5cdFx0XHRsb2dQYW5lbC5zY3JvbGxUb0JvdHRvbSgpXG5cdFx0fSlcblxuXHRcdGZ1bmN0aW9uIGdldEh1YihibG9jaykge1xuXHRcdFx0LyoqQHR5cGUge3N0cmluZ30gKi9cblx0XHRcdGNvbnN0IGh1Yk5hbWUgPSBibG9jay5maWVsZHMuSFVCXG5cdFx0XHRjb25zdCBodWJEZXZpY2UgPSBodWJEZXZpY2VzLmZpbmQoZSA9PiBlLm5hbWUgPT0gaHViTmFtZSlcblx0XHRcdGlmIChodWJEZXZpY2UgPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHRocm93IGBIdWIgJHtodWJOYW1lfSBpcyBub3QgY29ubmVjdGVkYFxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGh1YkRldmljZVxuXHRcdH1cblxuXG5cblx0XHRibG9ja2x5SW50ZXJwcmV0b3IuYWRkQmxvY2tUeXBlKCdvYmplY3RfZ2V0ZmllbGQnLCBhc3luYyAoYmxvY2spID0+IHtcblxuXHRcdFx0LyoqQHR5cGUge3N0cmluZ30gKi9cblx0XHRcdGNvbnN0IGZpZWxkTmFtZSA9IGJsb2NrLmZpZWxkcy5GSUVMRFxuXG5cdFx0XHRjb25zdCBvYmplY3QgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLk9CSkVDVClcblx0XHRcdGNvbnNvbGUubG9nKHsgZmllbGROYW1lLCBvYmplY3QgfSlcblxuXHRcdFx0cmV0dXJuIG9iamVjdFtmaWVsZE5hbWVdXG5cblx0XHR9KVxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnY3JlYXRlX2RldmljZScsIGFzeW5jIChibG9jaykgPT4ge1xuXG5cdFx0XHQvKipAdHlwZSB7bnVtYmVyfSAqL1xuXHRcdFx0Y29uc3QgcG9ydCA9IGJsb2NrLmZpZWxkcy5QT1JUXG5cdFx0XHRjb25zb2xlLmxvZyh7IHBvcnQgfSlcblxuXHRcdFx0Y29uc3QgaHViRGV2aWNlID0gZ2V0SHViKGJsb2NrKVxuXHRcdFx0cmV0dXJuIGh1YkRldmljZS5nZXREZXZpY2UocG9ydClcblxuXHRcdH0pXG5cblx0XHRibG9ja2x5SW50ZXJwcmV0b3IuYWRkQmxvY2tUeXBlKCdkZXZpY2VfZ2V0dmFsdWUnLCBhc3luYyAoYmxvY2spID0+IHtcblx0XHRcdC8qKkB0eXBlIHtIVUIuRGV2aWNlTW9kZX0gKi9cblx0XHRcdGNvbnN0IG1vZGUgPSBibG9jay5maWVsZHMuTU9ERVxuXHRcdFx0LyoqQHR5cGUge0hVQi5EZXZpY2V9ICovXG5cdFx0XHRjb25zdCBkZXZpY2UgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLkRFVklDRSlcblx0XHRcdGNvbnNvbGUubG9nKHsgbW9kZSwgZGV2aWNlIH0pXG5cdFx0XHRyZXR1cm4gZGV2aWNlLmdldFZhbHVlKG1vZGUpXG5cblx0XHR9KVxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnd2FpdF91bnRpbF9kZXZpY2UnLCBhc3luYyAoYmxvY2spID0+IHtcblxuXHRcdFx0LyoqQHR5cGUge0hVQi5EZXZpY2VNb2RlfSAqL1xuXHRcdFx0Y29uc3QgbW9kZSA9IGJsb2NrLmZpZWxkcy5NT0RFXG5cblx0XHRcdC8qKkB0eXBlIHtIVUIuRGV2aWNlfSAqL1xuXHRcdFx0Y29uc3QgZGV2aWNlID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5ERVZJQ0UpXG5cdFx0XHRjb25zdCB2YXJJZCA9IGJsb2NrLmZpZWxkcy5WQVIuaWRcblx0XHRcdGNvbnNvbGUubG9nKHsgbW9kZSwgZGV2aWNlIH0pXG5cblx0XHRcdGF3YWl0IGRldmljZS53YWl0VGVzdFZhbHVlKG1vZGUsIGFzeW5jICh2YWx1ZSkgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnd2FpdFRlc3RWYWx1ZScsIHZhbHVlKVxuXHRcdFx0XHRibG9ja2x5SW50ZXJwcmV0b3Iuc2V0VmFyVmFsdWUodmFySWQsIHZhbHVlKVxuXHRcdFx0XHQvKipAdHlwZSB7Ym9vbGVhbn0gKi9cblx0XHRcdFx0Y29uc3QgcmV0VmFsdWUgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLlRFU1QpXG5cdFx0XHRcdHJldHVybiByZXRWYWx1ZVxuXHRcdFx0fSlcblx0XHR9KVxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnZGV2aWNlX3N1YnNjcmliZScsIGFzeW5jIChibG9jaykgPT4ge1xuXG5cdFx0XHQvKipAdHlwZSB7SFVCLkRldmljZU1vZGV9ICovXG5cdFx0XHRjb25zdCBtb2RlID0gYmxvY2suZmllbGRzLk1PREVcblxuXHRcdFx0Y29uc3QgZGVsdGFJbnRlcnZhbCA9IGJsb2NrLmZpZWxkcy5ERUxUQVxuXG5cdFx0XHQvKipAdHlwZSB7SFVCLkRldmljZX0gKi9cblx0XHRcdGNvbnN0IGRldmljZSA9IGF3YWl0IGJsb2NrbHlJbnRlcnByZXRvci5ldmFsQ29kZShibG9jay5pbnB1dHMuREVWSUNFKVxuXHRcdFx0Y29uc29sZS5sb2coeyBtb2RlLCBkZWx0YUludGVydmFsLCBkZXZpY2UgfSlcblx0XHRcdGNvbnN0IHZhcklkID0gYmxvY2suZmllbGRzLlZBUi5pZFxuXG5cdFx0XHRhd2FpdCBkZXZpY2Uuc3Vic2NyaWJlKG1vZGUsIGFzeW5jICh2YWx1ZSkgPT4ge1xuXHRcdFx0XHRibG9ja2x5SW50ZXJwcmV0b3Iuc2V0VmFyVmFsdWUodmFySWQsIHZhbHVlKVxuXHRcdFx0XHRhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLkRPKVxuXHRcdFx0fSwgZGVsdGFJbnRlcnZhbClcblx0XHR9KVxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnY3JlYXRlX3BhaXJfbW90b3InLCBhc3luYyAoYmxvY2spID0+IHtcblxuXHRcdFx0LyoqQHR5cGUge3N0cmluZ30gKi9cblx0XHRcdGNvbnN0IHBvcnROYW1lMSA9IGJsb2NrLmZpZWxkcy5QT1JUMVxuXG5cdFx0XHQvKipAdHlwZSB7c3RyaW5nfSAqL1xuXHRcdFx0Y29uc3QgcG9ydE5hbWUyID0gYmxvY2suZmllbGRzLlBPUlQyXG5cblx0XHRcdGNvbnN0IGh1YkRldmljZSA9IGdldEh1YihibG9jaylcblx0XHRcdGNvbnN0IG1vdG9yID0gYXdhaXQgaHViRGV2aWNlLmdldERibE1vdG9yKGh1YlNydi5Qb3J0TWFwW3BvcnROYW1lMV0sIGh1YlNydi5Qb3J0TWFwW3BvcnROYW1lMl0pXG5cblx0XHRcdHJldHVybiBtb3RvclxuXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ2NyZWF0ZV90YWNob19tb3RvcicsIGFzeW5jIChibG9jaykgPT4ge1xuXG5cdFx0XHQvKipAdHlwZSB7c3RyaW5nfSAqL1xuXHRcdFx0Y29uc3QgcG9ydE5hbWUgPSBibG9jay5maWVsZHMuUE9SVFxuXG5cdFx0XHRjb25zdCBodWJEZXZpY2UgPSBnZXRIdWIoYmxvY2spXG5cdFx0XHRjb25zdCBtb3RvciA9IGh1YkRldmljZS5nZXREZXZpY2UoaHViU3J2LlBvcnRNYXBbcG9ydE5hbWVdKVxuXHRcdFx0aWYgKCFodWJTcnYuaXNUYWNob01vdG9yKG1vdG9yKSkge1xuXHRcdFx0XHR0aHJvdyBgRGV2aWNlIGNvbm5lY3RlZCB0byBwb3J0ICcke3BvcnROYW1lfScgaXMgbm90IG9mIGEgVGFjaG9Nb3RvcmBcblx0XHRcdH1cblx0XHRcdHJldHVybiBtb3RvclxuXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ2NyZWF0ZV9tb3RvcicsIGFzeW5jIChibG9jaykgPT4ge1xuXG5cdFx0XHQvKipAdHlwZSB7c3RyaW5nfSAqL1xuXHRcdFx0Y29uc3QgcG9ydE5hbWUgPSBibG9jay5maWVsZHMuUE9SVFxuXG5cdFx0XHRjb25zdCBodWJEZXZpY2UgPSBnZXRIdWIoYmxvY2spXG5cdFx0XHRjb25zdCBtb3RvciA9IGh1YkRldmljZS5nZXREZXZpY2UoaHViU3J2LlBvcnRNYXBbcG9ydE5hbWVdKVxuXHRcdFx0aWYgKCFodWJTcnYuaXNNb3Rvcihtb3RvcikpIHtcblx0XHRcdFx0dGhyb3cgYERldmljZSBjb25uZWN0ZWQgdG8gcG9ydCAnJHtwb3J0TmFtZX0nIGlzIG5vdCBvZiBhIE1vdG9yYFxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG1vdG9yXG5cblx0XHR9KVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gZ2V0TW90b3IoYmxvY2spIHtcblx0XHRcdC8qKkB0eXBlIHtIVUIuTW90b3J9ICovXG5cdFx0XHRjb25zdCBtb3RvciA9IGF3YWl0IGJsb2NrbHlJbnRlcnByZXRvci5ldmFsQ29kZShibG9jay5pbnB1dHMuVkFSKVxuXHRcdFx0aWYgKCFodWJTcnYuaXNNb3Rvcihtb3RvcikpIHtcblx0XHRcdFx0dGhyb3cgYGlucHV0IGlzIG5vdCBvZiB0eXBlIE1vdG9yYFxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG1vdG9yXG5cdFx0fVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gZ2V0VGFjaG9Nb3RvcihibG9jaykge1xuXHRcdFx0LyoqQHR5cGUge0hVQi5UYWNob01vdG9yfSAqL1xuXHRcdFx0Y29uc3QgbW90b3IgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLlZBUilcblxuXHRcdFx0aWYgKCFodWJTcnYuaXNUYWNob01vdG9yKG1vdG9yKSkge1xuXHRcdFx0XHR0aHJvdyBgaW5wdXQgaXMgbm90IG9mIHR5cGUgVGFjaG9Nb3RvcmBcblx0XHRcdH1cblx0XHRcdHJldHVybiBtb3RvclxuXHRcdH1cblxuXHRcdGFzeW5jIGZ1bmN0aW9uIGdldFBhaXJNb3RvcihibG9jaykge1xuXHRcdFx0LyoqQHR5cGUge0hVQi5Eb3VibGVNb3Rvcn0gKi9cblx0XHRcdGNvbnN0IG1vdG9yID0gYXdhaXQgYmxvY2tseUludGVycHJldG9yLmV2YWxDb2RlKGJsb2NrLmlucHV0cy5WQVIpXG5cdFx0XHRjb25zb2xlLmxvZygnbW90b3InLCBtb3Rvcilcblx0XHRcdGlmICghaHViU3J2LmlzRG91YmxlTW90b3IobW90b3IpKSB7XG5cdFx0XHRcdHRocm93IGBpbnB1dCBpcyBub3Qgb2YgdHlwZSBQYWlyTW90b3JgXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbW90b3Jcblx0XHR9XG5cblx0XHRibG9ja2x5SW50ZXJwcmV0b3IuYWRkQmxvY2tUeXBlKCdtb3Rvcl9wb3dlcicsIGFzeW5jIChibG9jaykgPT4ge1xuXG5cdFx0XHQvKipAdHlwZSB7bnVtYmVyfSAqL1xuXHRcdFx0Y29uc3QgcG93ZXIgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLlBPV0VSKVxuXG5cdFx0XHRjb25zdCBtb3RvciA9IGF3YWl0IGdldE1vdG9yKGJsb2NrKVxuXG5cdFx0XHRjb25zb2xlLmxvZyh7IHBvd2VyIH0pXG5cdFx0XHRhd2FpdCBtb3Rvci5zZXRQb3dlcihwb3dlcilcblxuXHRcdH0pXG5cblx0XHRibG9ja2x5SW50ZXJwcmV0b3IuYWRkQmxvY2tUeXBlKCdtb3Rvcl9zcGVlZCcsIGFzeW5jIChibG9jaykgPT4ge1xuXG5cdFx0XHQvKipAdHlwZSB7bnVtYmVyfSAqL1xuXHRcdFx0Y29uc3Qgc3BlZWQgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLlNQRUVEKVxuXG5cdFx0XHRjb25zdCBtb3RvciA9IGF3YWl0IGdldFRhY2hvTW90b3IoYmxvY2spXG5cblx0XHRcdGNvbnNvbGUubG9nKHsgc3BlZWQgfSlcblx0XHRcdGF3YWl0IG1vdG9yLnNldFNwZWVkKHNwZWVkKVxuXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ3BhaXJfbW90b3Jfc3BlZWQnLCBhc3luYyAoYmxvY2spID0+IHtcblxuXHRcdFx0LyoqQHR5cGUge251bWJlcn0gKi9cblx0XHRcdGNvbnN0IHNwZWVkMSA9IGF3YWl0IGJsb2NrbHlJbnRlcnByZXRvci5ldmFsQ29kZShibG9jay5pbnB1dHMuU1BFRUQxKVxuXHRcdFx0LyoqQHR5cGUge251bWJlcn0gKi9cblx0XHRcdGNvbnN0IHNwZWVkMiA9IGF3YWl0IGJsb2NrbHlJbnRlcnByZXRvci5ldmFsQ29kZShibG9jay5pbnB1dHMuU1BFRUQyKVxuXG5cdFx0XHRjb25zdCBtb3RvciA9IGF3YWl0IGdldFBhaXJNb3RvcihibG9jaylcblxuXHRcdFx0Y29uc29sZS5sb2coeyBzcGVlZDEsIHNwZWVkMiwgbW90b3IgfSlcblx0XHRcdGF3YWl0IG1vdG9yLnNldFNwZWVkKHNwZWVkMSwgc3BlZWQyKVxuXG5cdFx0fSlcblxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnbW90b3Jfc3BlZWRfdGltZScsIGFzeW5jIChibG9jaykgPT4ge1xuXG5cdFx0XHQvKipAdHlwZSB7bnVtYmVyfSAqL1xuXHRcdFx0Y29uc3Qgc3BlZWQgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLlNQRUVEKVxuXG5cdFx0XHRjb25zdCB3YWl0RW5kID0gYmxvY2suZmllbGRzLldBSVRcblxuXHRcdFx0LyoqQHR5cGUge251bWJlcn0gKi9cblx0XHRcdGNvbnN0IHRpbWUgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLlRJTUUpXG5cblx0XHRcdGNvbnN0IG1vdG9yID0gYXdhaXQgZ2V0VGFjaG9Nb3RvcihibG9jaylcblxuXHRcdFx0Y29uc29sZS5sb2coeyBzcGVlZCwgdGltZSwgd2FpdEVuZCwgbW90b3IgfSlcblx0XHRcdGF3YWl0IG1vdG9yLnNldFNwZWVkRm9yVGltZShzcGVlZCwgdGltZSAqIDEwMDAsIHdhaXRFbmQsIGh1YlNydi5CcmFraW5nU3R5bGUuRkxPQVQpXG5cblx0XHR9KVxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnbW90b3Jfc3BlZWRfZGVncmVlcycsIGFzeW5jIChibG9jaykgPT4ge1xuXG5cdFx0XHRjb25zdCBtb3RvciA9IGF3YWl0IGdldFRhY2hvTW90b3IoYmxvY2spXG5cblx0XHRcdC8qKkB0eXBlIHtudW1iZXJ9ICovXG5cdFx0XHRjb25zdCBzcGVlZCA9IGF3YWl0IGJsb2NrbHlJbnRlcnByZXRvci5ldmFsQ29kZShibG9jay5pbnB1dHMuU1BFRUQpXG5cblx0XHRcdGNvbnN0IHdhaXRFbmQgPSBibG9jay5maWVsZHMuV0FJVFxuXG5cdFx0XHQvKipAdHlwZSB7bnVtYmVyfSAqL1xuXHRcdFx0Y29uc3QgZGVncmVlcyA9IGF3YWl0IGJsb2NrbHlJbnRlcnByZXRvci5ldmFsQ29kZShibG9jay5pbnB1dHMuREVHUkVFUylcblxuXHRcdFx0Y29uc29sZS5sb2coeyBzcGVlZCwgZGVncmVlcywgd2FpdEVuZCB9KVxuXHRcdFx0YXdhaXQgbW90b3Iucm90YXRlRGVncmVlcyhkZWdyZWVzLCBzcGVlZCwgd2FpdEVuZCwgaHViU3J2LkJyYWtpbmdTdHlsZS5CUkFLRSlcblxuXHRcdH0pXG5cblx0XHRibG9ja2x5SW50ZXJwcmV0b3IuYWRkQmxvY2tUeXBlKCdtb3Rvcl9zcGVlZF9wb3NpdGlvbicsIGFzeW5jIChibG9jaykgPT4ge1xuXG5cdFx0XHRjb25zdCBtb3RvciA9IGF3YWl0IGdldFRhY2hvTW90b3IoYmxvY2spXG5cblx0XHRcdC8qKkB0eXBlIHtudW1iZXJ9ICovXG5cdFx0XHRjb25zdCBzcGVlZCA9IGF3YWl0IGJsb2NrbHlJbnRlcnByZXRvci5ldmFsQ29kZShibG9jay5pbnB1dHMuU1BFRUQpXG5cblx0XHRcdGNvbnN0IHdhaXRFbmQgPSBibG9jay5maWVsZHMuV0FJVFxuXG5cdFx0XHQvKipAdHlwZSB7bnVtYmVyfSAqL1xuXHRcdFx0Y29uc3QgYW5nbGUgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLkFOR0xFKVxuXG5cdFx0XHRjb25zb2xlLmxvZyh7IHNwZWVkLCBhbmdsZSwgd2FpdEVuZCB9KVxuXHRcdFx0YXdhaXQgbW90b3IuZ290b0FuZ2xlKGFuZ2xlLCBzcGVlZCwgd2FpdEVuZCwgaHViU3J2LkJyYWtpbmdTdHlsZS5GTE9BVClcblxuXHRcdH0pXG5cblx0XHRibG9ja2x5SW50ZXJwcmV0b3IuYWRkQmxvY2tUeXBlKCdtb3Rvcl9yZXNldF9wb3NpdGlvbicsIGFzeW5jIChibG9jaykgPT4ge1xuXG5cdFx0XHRjb25zdCBtb3RvciA9IGF3YWl0IGdldFRhY2hvTW90b3IoYmxvY2spXG5cdFx0XHRhd2FpdCBtb3Rvci5yZXNldFplcm8oKVxuXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ21vdG9yX2dldF9zcGVlZCcsIGFzeW5jIChibG9jaykgPT4ge1xuXG5cdFx0XHRjb25zdCBtb3RvciA9IGF3YWl0IGdldFRhY2hvTW90b3IoYmxvY2spXG5cdFx0XHRyZXR1cm4gbW90b3IuZ2V0U3BlZWQoKVxuXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ21vdG9yX2dldF9wb3NpdGlvbicsIGFzeW5jIChibG9jaykgPT4ge1xuXG5cdFx0XHRjb25zdCBtb3RvciA9IGF3YWl0IGdldFRhY2hvTW90b3IoYmxvY2spXG5cdFx0XHRyZXR1cm4gbW90b3IuZ2V0UG9zaXRpb24oKVxuXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ21vdG9yX2dldF9hYnNvbHV0ZXBvc2l0aW9uJywgYXN5bmMgKGJsb2NrKSA9PiB7XG5cblx0XHRcdGNvbnN0IG1vdG9yID0gYXdhaXQgZ2V0VGFjaG9Nb3RvcihibG9jaylcblx0XHRcdHJldHVybiBtb3Rvci5nZXRBYnNvbHV0ZVBvc2l0aW9uKClcblxuXHRcdH0pXG5cblx0XHRibG9ja2x5SW50ZXJwcmV0b3IuYWRkQmxvY2tUeXBlKCdodWJfY29sb3InLCBhc3luYyAoYmxvY2spID0+IHtcblxuXHRcdFx0LyoqQHR5cGUge3N0cmluZ30gKi9cblx0XHRcdGNvbnN0IGNvbG9yID0gYmxvY2suZmllbGRzLkNPTE9SXG5cblx0XHRcdGNvbnN0IGh1YkRldmljZSA9IGdldEh1YihibG9jaylcblx0XHRcdC8qKkB0eXBlIHtIVUIuUmdiTGVkfSAqL1xuXHRcdFx0Y29uc3QgbGVkID0gaHViRGV2aWNlLmdldERldmljZShodWJTcnYuUG9ydE1hcC5IVUJfTEVEKVxuXHRcdFx0YXdhaXQgbGVkLnNldENvbG9yKGh1YlNydi5Db2xvcltjb2xvcl0pXG5cblx0XHR9KVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gZ2V0SHViVmFsdWUoYmxvY2ssIHBvcnRJZCwgbW9kZSkge1xuXHRcdFx0Y29uc3QgaHViRGV2aWNlID0gZ2V0SHViKGJsb2NrKVxuXHRcdFx0Y29uc3QgZGV2aWNlID0gaHViRGV2aWNlLmdldERldmljZShwb3J0SWQpXG5cdFx0XHRjb25zb2xlLmxvZygnZ2V0SHViVmFsdWUnLCB7cG9ydElkLCBtb2RlLCBkZXZpY2V9KVxuXHRcdFx0cmV0dXJuIGRldmljZS5nZXRWYWx1ZShtb2RlKVxuXHRcdH1cblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ2h1Yl9nZXRfdm9sdGFnZScsIGFzeW5jIChibG9jaykgPT4ge1xuXG5cdFx0XHRyZXR1cm4gZ2V0SHViVmFsdWUoYmxvY2ssIGh1YlNydi5Qb3J0TWFwLlZPTFRBR0VfU0VOU09SLCAwKVxuXG5cdFx0fSlcblxuXHRcdGJsb2NrbHlJbnRlcnByZXRvci5hZGRCbG9ja1R5cGUoJ2h1Yl9nZXRfdGlsdCcsIGFzeW5jIChibG9jaykgPT4ge1xuXG5cdFx0XHQvKipAdHlwZSB7c3RyaW5nfSAqL1xuXHRcdFx0Y29uc3QgdHlwZSA9IGJsb2NrLmZpZWxkcy5UWVBFXG5cblx0XHRcdGNvbnN0IHZhbHVlID0gYXdhaXQgZ2V0SHViVmFsdWUoYmxvY2ssIGh1YlNydi5Qb3J0TWFwLlRJTFRfU0VOU09SLCBodWJTcnYuRGV2aWNlTW9kZS5USUxUX1BPUylcblx0XHRcdHJldHVybiB2YWx1ZVt0eXBlXVxuXG5cdFx0fSlcblxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLmFkZEJsb2NrVHlwZSgnc2xlZXAnLCBhc3luYyAoYmxvY2spID0+IHtcblx0XHRcdGNvbnN0IHRpbWUgPSBhd2FpdCBibG9ja2x5SW50ZXJwcmV0b3IuZXZhbENvZGUoYmxvY2suaW5wdXRzLlRJTUUpXG5cdFx0XHRjb25zb2xlLmxvZyh7IHRpbWUgfSlcblx0XHRcdGF3YWl0ICQkLnV0aWwud2FpdCh0aW1lICogMTAwMClcblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gbG9hZENvZGUoY29kZSkge1xuXHRcdFx0Y29uc3Qgd29ya3NwYWNlID0gQmxvY2tseS5nZXRNYWluV29ya3NwYWNlKCk7XG5cdFx0XHRCbG9ja2x5LnNlcmlhbGl6YXRpb24ud29ya3NwYWNlcy5sb2FkKGNvZGUsIHdvcmtzcGFjZSk7XG5cdFx0fVxuXG5cdFx0aWYgKGNvbmZpZy5jb2RlICE9IG51bGwpIHtcblx0XHRcdGxvYWRDb2RlKGNvbmZpZy5jb2RlKVxuXHRcdH1cblxuXHRcdHRoaXMub25CYWNrID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnb25CYWNrJylcblx0XHRcdGNvbmZpZy5jb2RlID0gZ2V0Q29kZSgpXG5cdFx0XHRyZXR1cm4gY29uZmlnXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0Q29kZSgpIHtcblx0XHRcdHJldHVybiBCbG9ja2x5LnNlcmlhbGl6YXRpb24ud29ya3NwYWNlcy5zYXZlKEJsb2NrbHkuZ2V0TWFpbldvcmtzcGFjZSgpKVxuXHRcdH1cblxuXHRcdGFzeW5jIGZ1bmN0aW9uIHN0b3AoKSB7XG5cdFx0XHRmb3IgKGNvbnN0IGh1YiBvZiBodWJEZXZpY2VzKSB7XG5cdFx0XHRcdGZvciAoY29uc3QgZGV2aWNlIG9mIGh1Yi5nZXRIdWJEZXZpY2VzKCkpIHtcblx0XHRcdFx0XHRpZiAoaHViU3J2LmlzTW90b3IoZGV2aWNlKSkge1xuXHRcdFx0XHRcdFx0YXdhaXQgZGV2aWNlLnNldFBvd2VyKDApXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGF3YWl0IGRldmljZS51bnN1YnNjcmliZSgpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGN1cnJlbnRDb25maWc6IGNvbmZpZy5uYW1lLFxuXHRcdFx0XHRnYW1lcGFkQ29ubmVjdGVkOiBjb25maWcuZ2FtZXBhZElkICE9ICcnLFxuXHRcdFx0XHRsb2dzOiBbXSxcblx0XHRcdFx0Z2V0TG9nczogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmxvZ3Muam9pbignPGJyPicpXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25FeHBvcnQ6IGFzeW5jIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGxldCBmaWxlTmFtZSA9IGF3YWl0ICQkLnVpLnNob3dQcm9tcHQoe3RpdGxlOiAnRXhwb3J0JywgbGFiZWw6ICdGaWxlTmFtZTogJ30pXG5cdFx0XHRcdFx0aWYgKGZpbGVOYW1lKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBqc29uVGV4dCA9IEpTT04uc3RyaW5naWZ5KHtjb2RlOiBnZXRDb2RlKCksIG1hcHBpbmdzOiBjb25maWcubWFwcGluZ3N9KVxuXHRcdFx0XHRcdFx0Y29uc3QgYmxvYiA9IG5ldyBCbG9iKFtqc29uVGV4dF0sIHsgdHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nIH0pXG5cdFx0XHRcdFx0XHRmaWxlTmFtZSArPSAnLnBvdydcblx0XHRcdFx0XHRcdGF3YWl0IGZpbGVTcnYuc2F2ZUZpbGUoYmxvYiwgZmlsZU5hbWUpXG5cdFx0XHRcdFx0XHQkLm5vdGlmeSgnQ29kZSBleHBvcnRlZCcsICdzdWNjZXNzJylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSW1wb3J0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuZmlsZXMnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ09wZW4gRmlsZScsXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRmaWx0ZXJFeHRlbnNpb246ICdwb3cnXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdFx0XHRcdGZpbGVjbGljazogZnVuY3Rpb24gKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0XHRcdFx0cGFnZXIucG9wUGFnZShkYXRhKVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0b25SZXR1cm46IGFzeW5jIGZ1bmN0aW9uIChkYXRhKSB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uUmV0dXJuJywgZGF0YSlcblx0XHRcdFx0XHRcdFx0Y29uc3QgdXJsID0gZmlsZVNydi5maWxlVXJsKGRhdGEucm9vdERpciArIGRhdGEuZmlsZU5hbWUpXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHJlc3AgPSBhd2FpdCBmZXRjaCh1cmwpXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHtjb2RlLCBtYXBwaW5nc30gPSBhd2FpdCByZXNwLmpzb24oKVxuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyh7Y29kZSwgbWFwcGluZ3N9KVxuXHRcdFx0XHRcdFx0XHRjb25maWcuY29kZSA9IGNvZGVcblx0XHRcdFx0XHRcdFx0Y29uZmlnLm5hbWUgPSAnJ1xuXHRcdFx0XHRcdFx0XHRjb25maWcubWFwcGluZ3MgPSBtYXBwaW5nc1xuXHRcdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBjdXJyZW50Q29uZmlnOiAnJyB9KVxuXHRcdFx0XHRcdFx0XHRjb25maWcuZ2FtZXBhZE1hcHBpbmcgPSBjb25maWcubWFwcGluZ3NbY29uZmlnLmdhbWVwYWRJZF1cblx0XHRcdFx0XHRcdFx0bG9hZENvZGUoY29uZmlnLmNvZGUpXG5cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblN0b3A6IGFzeW5jIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGF3YWl0IHN0b3AoKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkdhbWVQYWQ6IGZ1bmN0aW9uICgpIHtcblxuXHRcdFx0XHRcdGNvbnN0IGNvZGUgPSBnZXRDb2RlKClcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnY29kZScsIGNvZGUpXG5cdFx0XHRcdFx0ZW5hYmxlQ2FsbGJhY2soZmFsc2UpXG5cblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnZ2FtZXBhZCcsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnR2FtZXBhZCcsXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRtYXBwaW5nOiBjb25maWcuZ2FtZXBhZE1hcHBpbmcsXG5cdFx0XHRcdFx0XHRcdGFjdGlvbnM6IChjb2RlICE9IG51bGwpID8gYmxvY2tseUludGVycHJldG9yLmdldEZ1bmN0aW9uTmFtZXMoY29kZSkgOiBbXVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdG9uUmV0dXJuOiBhc3luYyAobWFwcGluZykgPT4ge1xuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25SZXR1cm4nLCBtYXBwaW5nKVxuXG5cdFx0XHRcdFx0XHRcdGNvbmZpZy5nYW1lcGFkTWFwcGluZyA9IG1hcHBpbmdcblx0XHRcdFx0XHRcdFx0Y29uZmlnLm1hcHBpbmdzW21hcHBpbmcuaWRdID0gbWFwcGluZ1xuXHRcdFx0XHRcdFx0XHRlbmFibGVDYWxsYmFjayh0cnVlKVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdG9uQmFjazogKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRlbmFibGVDYWxsYmFjayh0cnVlKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTmV3Q29uZmlnOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uZmlnLm1hcHBpbmdzID0ge31cblx0XHRcdFx0XHRjb25maWcuZ2FtZXBhZE1hcHBpbmcgPSBudWxsXG5cdFx0XHRcdFx0Y29uZmlnLm5hbWUgPSAnJ1xuXHRcdFx0XHRcdGNvbnN0IHdvcmtzcGFjZSA9IEJsb2NrbHkuZ2V0TWFpbldvcmtzcGFjZSgpXG5cdFx0XHRcdFx0d29ya3NwYWNlLmNsZWFyKClcblxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGN1cnJlbnRDb25maWc6ICcnIH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uU2F2ZUNvbmZpZzogYXN5bmMgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbmNvZGVTYXZlQ29uZmlnJywgY29uZmlnKVxuXHRcdFx0XHRcdGlmIChjdHJsLm1vZGVsLmN1cnJlbnRDb25maWcgPT0gJycpIHtcblx0XHRcdFx0XHRcdGNvbnN0IGN1cnJlbnRDb25maWcgPSBhd2FpdCAkJC51aS5zaG93UHJvbXB0KHsgdGl0bGU6ICdTYXZlIENvbmZpZycsIGxhYmVsOiAnQ29uZmlnIE5hbWU6JyB9KVxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZyh7Y3VycmVudENvbmZpZ30pXG5cdFx0XHRcdFx0XHRpZiAoY3VycmVudENvbmZpZykge1xuXHRcdFx0XHRcdFx0XHRhd2FpdCBodHRwLnBvc3QoJy9hZGQnLCB7IG5hbWU6IGN1cnJlbnRDb25maWcsIGNvZGU6IGdldENvZGUoKSwgbWFwcGluZ3M6IGNvbmZpZy5tYXBwaW5ncyB9KVxuXHRcdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoeyBjdXJyZW50Q29uZmlnIH0pXG5cdFx0XHRcdFx0XHRcdGNvbmZpZy5uYW1lID0gY3VycmVudENvbmZpZ1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdGF3YWl0IGh0dHAucG9zdCgnL3VwZGF0ZScsIHsgbmFtZTogY29uZmlnLm5hbWUsIGNvZGU6IGdldENvZGUoKSwgbWFwcGluZ3M6IGNvbmZpZy5tYXBwaW5ncyB9KVxuXHRcdFx0XHRcdFx0JC5ub3RpZnkoYENvbmZpZyAnJHtjb25maWcubmFtZX0nIHVwZGF0ZWRgLCAnc3VjY2VzcycpXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQ29uZmlnOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Db25maWcnKVxuXHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdjb25maWdDdHJsJywge1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdDb25maWd1cmF0aW9ucycsXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRjdXJyZW50Q29uZmlnOiBjdHJsLm1vZGVsLmN1cnJlbnRDb25maWdcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRvblJldHVybjogZnVuY3Rpb24gKGRhdGEpIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ25ld0NvbmZpZycsIGRhdGEpXG5cdFx0XHRcdFx0XHRcdGNvbmZpZy5jb2RlID0gZGF0YS5jb2RlXG5cdFx0XHRcdFx0XHRcdGNvbmZpZy5uYW1lID0gZGF0YS5uYW1lXG5cdFx0XHRcdFx0XHRcdGNvbmZpZy5tYXBwaW5ncyA9IGRhdGEubWFwcGluZ3Ncblx0XHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHsgY3VycmVudENvbmZpZzogZGF0YS5uYW1lIH0pXG5cdFx0XHRcdFx0XHRcdGNvbmZpZy5nYW1lcGFkTWFwcGluZyA9IGNvbmZpZy5tYXBwaW5nc1tjb25maWcuZ2FtZXBhZElkXVxuXHRcdFx0XHRcdFx0XHRsb2FkQ29kZShjb25maWcuY29kZSlcblx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZyh7Z2FtZXBhZE1hcHBpbmd9KVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUnVuOiBhc3luYyBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uUnVuJylcblx0XHRcdFx0XHRhd2FpdCBzdG9wKClcblx0XHRcdFx0XHRwcm9ncmVzc0RsZy5zZXRQZXJjZW50YWdlKDApXG5cdFx0XHRcdFx0cHJvZ3Jlc3NEbGcuc2hvdygpXG5cdFx0XHRcdFx0bGV0IG5iQWNjZXNzID0gMFxuXHRcdFx0XHRcdGZvciAoY29uc3QgaHViIG9mIGh1YkRldmljZXMpIHtcblx0XHRcdFx0XHRcdG5iQWNjZXNzICs9IGh1Yi5nZXRIdWJEZXZpY2VzKCkubGVuZ3RoXG5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coeyBuYkFjY2VzcyB9KVxuXHRcdFx0XHRcdGNvbnN0IHJhbmdlID0gJCQudXRpbC5tYXBSYW5nZSgwLCBuYkFjY2VzcywgMCwgMSlcblx0XHRcdFx0XHRsZXQgaSA9IDBcblx0XHRcdFx0XHRmb3IgKGNvbnN0IGh1YiBvZiBodWJEZXZpY2VzKSB7XG5cdFx0XHRcdFx0XHRmb3IgKGNvbnN0IGRldmljZSBvZiBodWIuZ2V0SHViRGV2aWNlcygpKSB7XG5cdFx0XHRcdFx0XHRcdGF3YWl0IGRldmljZS5yZWFkSW5mbygpXG5cdFx0XHRcdFx0XHRcdHByb2dyZXNzRGxnLnNldFBlcmNlbnRhZ2UocmFuZ2UoKytpKSlcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cHJvZ3Jlc3NEbGcuaGlkZSgpXG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGdldENvZGUoKVxuXHRcdFx0XHRcdGdhbWVwYWRBeGVzVmFsdWUgPSB7fVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7IGxvZ3M6IFtdIH0pXG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGF3YWl0IGJsb2NrbHlJbnRlcnByZXRvci5zdGFydENvZGUoaW5mbylcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgZSA9PSAnc3RyaW5nJykge1xuXHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoeyB0aXRsZTogJ0Vycm9yJywgY29udGVudDogZSB9KVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGNvbnN0IGxvZ1BhbmVsID0gY3RybC5zY29wZS5sb2dQYW5lbFxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIi8vIEB0cy1jaGVja1xuXG4kJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnY29uZmlnQ3RybCcsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLXNob3c9XFxcIiFoYXNDb25maWdzXFxcIiBjbGFzcz1cXFwibWVzc2FnZVxcXCI+XFxuICAgIE5vIGNvbmZpZ3VyYXRpb25zIGRlZmluZWRcXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFxcXCIgYm4tc2hvdz1cXFwiaGFzQ29uZmlnc1xcXCI+XFxuICAgIDxkaXYgYm4tZWFjaD1cXFwiY29uZmlnc1xcXCIgY2xhc3M9XFxcIml0ZW1zXFxcIiBibi1ldmVudD1cXFwiY2xpY2suaXRlbTogb25JdGVtQ2xpY2ssIGNvbnRleHRtZW51Y2hhbmdlLml0ZW06b25JdGVtQ29udGV4dE1lbnVcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwidzMtY2FyZC0yIGl0ZW1cXFwiIGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIGJuLWRhdGE9XFxcIntcXG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7XFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlOiB7bmFtZTogXFwnUmVtb3ZlXFwnLCBpY29uOiBcXCdmYXMgZmEtdHJhc2gtYWx0XFwnfVxcbiAgICAgICAgICAgICAgICAgICAgfVxcbiAgICAgICAgICAgICAgICB9XFxcIj5cXG4gICAgICAgICAgICA8ZGl2PlxcbiAgICAgICAgICAgICAgICA8c3Ryb25nIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5uYW1lXFxcIj48L3N0cm9uZz5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnBhZ2VyJywgJ2JyZWl6Ym90Lmh0dHAnXSxcblxuXHRwcm9wczoge1xuXHRcdGN1cnJlbnRDb25maWc6ICcnXG5cdH0sXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXIgXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuSHR0cC5JbnRlcmZhY2V9IGh0dHBcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHBhZ2VyLCBodHRwKSB7XG5cblx0XHQvL2NvbnNvbGUubG9nKCdwcm9wcycsIHRoaXMucHJvcHMpXG5cblx0XHRjb25zdCB7Y3VycmVudENvbmZpZ30gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGNvbmZpZ3M6IFtdLFxuXHRcdFx0XHRoYXNDb25maWdzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5jb25maWdzLmxlbmd0aCA+IDBcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkl0ZW1Db250ZXh0TWVudTogYXN5bmMgZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJy5pdGVtJykuaW5kZXgoKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uSXRlbUNvbnRleHRNZW51JywgaWR4LCBkYXRhKVxuXHRcdFx0XHRcdGNvbnN0IGNvbmZpZyA9IGN0cmwubW9kZWwuY29uZmlnc1tpZHhdXG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdkZWxldGUnKSB7XG5cdFx0XHRcdFx0XHRpZiAoY29uZmlnLm5hbWUgPT0gY3VycmVudENvbmZpZykge1xuXHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe2NvbnRlbnQ6ICdDYW5ub3QgZGVsZXRlIGFjdGl2ZSBjb25maWcnLCB0aXRsZTogJ1dhcm5pbmcnfSlcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRhd2FpdCBodHRwLnBvc3QoJy9kZWxldGUnLCBjb25maWcpXG5cdFx0XHRcdFx0XHRcdGxvYWRDb25maWcoKVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0fSxcbiAgICAgICAgICAgICAgICBvbkl0ZW1DbGljazogZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnLml0ZW0nKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uSXRlbUNsaWNrJywgaWR4KVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb25maWcgPSBjdHJsLm1vZGVsLmNvbmZpZ3NbaWR4XVxuXHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoY29uZmlnKVxuXG5cbiAgICAgICAgICAgICAgICB9XHRcblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gbG9hZENvbmZpZygpIHtcblx0XHRcdGNvbnN0IGNvbmZpZ3MgPSBhd2FpdCBodHRwLmdldCgnLycpXG5cdFx0XHRjb25zb2xlLmxvZyh7Y29uZmlnc30pXG5cdFx0XHRjdHJsLnNldERhdGEoe2NvbmZpZ3N9KVxuXHRcdH1cblxuXHRcdGxvYWRDb25maWcoKVxuXG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiLy8gQHRzLWNoZWNrXG5cbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdnYW1lcGFkJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXY+XFxuICAgIDxoMiBibi10ZXh0PVxcXCJpZFxcXCI+PC9oMj5cXG48L2Rpdj5cXG5cXG48aDM+QXhlczwvaDM+XFxuPGRpdj5cXG4gICAgPHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZS1hbGwgYXhlVGFibGVcXFwiPlxcbiAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgIDx0cj5cXG4gICAgICAgICAgICAgICAgPHRoPkF4ZTwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5BY3Rpb248L3RoPlxcbiAgICAgICAgICAgIDwvdHI+XFxuICAgICAgICA8L3RoZWFkPlxcbiAgICAgICAgPHRib2R5IGJuLWVhY2g9XFxcImF4ZXNcXFwiIGJuLWJpbmQ9XFxcImF4ZXNcXFwiIGJuLWluZGV4PVxcXCJpZHhcXFwiPlxcbiAgICAgICAgICAgIDx0cj5cXG4gICAgICAgICAgICAgICAgPHRkIGJuLXRleHQ9XFxcImdldEF4ZUxhYmVsXFxcIj48L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29tYm9ib3hcXFwiIGJuLWRhdGE9XFxcIntpdGVtczogYWN0aW9uc31cXFwiIGJuLXZhbD1cXFwiJHNjb3BlLiRpLmFjdGlvblxcXCJcXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cXFwiaXRlbVxcXCI+PC9kaXY+XFxuICAgICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+XFxuPC9kaXY+XFxuXFxuPGgzPkJ1dHRvbnM8L2gzPlxcbjxkaXYgY2xhc3M9XFxcImNvbW1hbmRUYWJsZVxcXCI+XFxuICAgIDx0YWJsZSBjbGFzcz1cXFwidzMtdGFibGUtYWxsXFxcIj5cXG4gICAgICAgIDx0aGVhZD5cXG4gICAgICAgICAgICA8dHI+XFxuICAgICAgICAgICAgICAgIDx0aD5CdXR0b248L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+RG93bjwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5VcDwvdGg+XFxuICAgICAgICAgICAgPC90cj5cXG4gICAgICAgIDwvdGhlYWQ+XFxuICAgICAgICA8dGJvZHkgYm4tZWFjaD1cXFwiYnV0dG9uc1xcXCIgYm4tYmluZD1cXFwiYnV0dG9uc1xcXCIgYm4taW5kZXg9XFxcImlkeFxcXCI+XFxuICAgICAgICAgICAgPHRyPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tdGV4dD1cXFwiZ2V0QnV0dG9uTGFiZWxcXFwiPjwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcIml0ZW1cXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIgYm4tZGF0YT1cXFwie2l0ZW1zOiBhY3Rpb25zfVxcXCIgYm4tdmFsPVxcXCIkc2NvcGUuJGkuZG93blxcXCJcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XFxcImRvd25cXFwiPjwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCBibi12YWw9XFxcIiRzY29wZS4kaS5kb3duVmFsdWVcXFwiIHR5cGU9XFxcIm51bWJlclxcXCIgY2xhc3M9XFxcImRvd25WYWx1ZVxcXCI+XFxuXFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiaXRlbVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbWJvYm94XFxcIiBibi1kYXRhPVxcXCJ7aXRlbXM6IGFjdGlvbnN9XFxcIiBibi12YWw9XFxcIiRzY29wZS4kaS51cFxcXCIgY2xhc3M9XFxcInVwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgYm4tdmFsPVxcXCIkc2NvcGUuJGkudXBWYWx1ZVxcXCIgdHlwZT1cXFwibnVtYmVyXFxcIiBjbGFzcz1cXFwidXBWYWx1ZVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG5cXG5cXG4gICAgICAgICAgICAgICAgPC90ZD5cXG5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90Ym9keT5cXG4gICAgPC90YWJsZT5cXG48L2Rpdj5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnBhZ2VyJywgJ2JyZWl6Ym90LmdhbWVwYWQnXSxcblxuXHRwcm9wczoge1xuXHRcdG1hcHBpbmc6IG51bGwsXG5cdFx0YWN0aW9uczogbnVsbFxuXHR9LFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLkdhbWVwYWQuSW50ZXJmYWNlfSBnYW1lcGFkXG5cdCAqL1xuXHRpbml0OiBmdW5jdGlvbiAoZWx0LCBwYWdlciwgZ2FtZXBhZCkge1xuXG5cdFx0Y29uc29sZS5sb2coJ3Byb3BzJywgdGhpcy5wcm9wcylcblxuXHRcdGNvbnN0IHttYXBwaW5nLCBhY3Rpb25zfSA9IHRoaXMucHJvcHNcblxuXHRcdGFjdGlvbnMudW5zaGlmdCgnTm9uZScpXG5cblx0XHRjb25zb2xlLmxvZyh0aGlzLnByb3BzKVxuXG5cdFx0bGV0IGF4ZXMgPSBbXVxuXHRcdGxldCBidXR0b25zID0gW11cblxuXHRcdGNvbnN0IGluZm8gPSBnYW1lcGFkLmdldEdhbWVwYWRzKClbMF1cblx0XHRjb25zb2xlLmxvZyh7IGluZm8gfSlcblxuXHRcdGlmIChtYXBwaW5nICE9IG51bGwpIHtcblx0XHRcdGF4ZXMgPSBtYXBwaW5nLmF4ZXNcblx0XHRcdGJ1dHRvbnMgPSBtYXBwaW5nLmJ1dHRvbnNcblx0XHR9XG5cblx0XHRpZiAoYXhlcy5sZW5ndGggPT0gMCkge1xuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBpbmZvLmF4ZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0YXhlcy5wdXNoKHsgYWN0aW9uOiAnTm9uZScgfSlcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoYnV0dG9ucy5sZW5ndGggPT0gMCkge1x0XG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGluZm8uYnV0dG9ucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRidXR0b25zLnB1c2goeyB1cDogJ05vbmUnLCBkb3duOiAnTm9uZScsIHVwVmFsdWU6IDAsIGRvd25WYWx1ZTogMSB9KVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHJlc2V0VmFsdWUoKSB7XG5cdFx0XHRsZXQgYXhlcyA9IFtdXG5cdFx0XHRsZXQgYnV0dG9ucyA9IFtdXG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGluZm8uYXhlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRheGVzLnB1c2goeyBhY3Rpb246ICdOb25lJyB9KVxuXHRcdFx0fVxuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBpbmZvLmJ1dHRvbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0YnV0dG9ucy5wdXNoKHsgdXA6ICdOb25lJywgZG93bjogJ05vbmUnLCB1cFZhbHVlOiAwLCBkb3duVmFsdWU6IDEgfSlcblx0XHRcdH1cblx0XHRcdGN0cmwuc2V0RGF0YSh7YXhlcywgYnV0dG9uc30pXG5cdFx0fVxuXG5cdFx0XG5cdFx0ZnVuY3Rpb24gb25HYW1lcGFkQXhlKGRhdGEpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ2F4ZScsIGRhdGEpXG5cdFx0XHRjb25zdCB7IHZhbHVlLCBpZCB9ID0gZGF0YVxuXHRcdFx0aWYgKHZhbHVlICE9IDApIHtcblx0XHRcdFx0YXhlc0VsdC5maW5kKCd0cicpLmVxKGlkKS5maW5kKCd0ZCcpLmVxKDApLmFkZENsYXNzKCdwcmVzc2VkJylcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRheGVzRWx0LmZpbmQoJ3RyJykuZXEoaWQpLmZpbmQoJ3RkJykuZXEoMCkucmVtb3ZlQ2xhc3MoJ3ByZXNzZWQnKVxuXHRcdFx0fVxuXHRcdH0gXG5cblxuXHRcdGZ1bmN0aW9uIG9uR2FtZXBhZEJ1dHRvbkRvd24oZGF0YSkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnYnV0dG9uRG93bicsIGRhdGEuaWQpXG5cdFx0XHRidXR0b25zRWx0LmZpbmQoJ3RyJykuZXEoZGF0YS5pZCkuZmluZCgndGQnKS5lcSgwKS5hZGRDbGFzcygncHJlc3NlZCcpXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gb25HYW1lcGFkQnV0dG9uVXAoZGF0YSkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygnYnV0dG9uRG93bicsIGRhdGEuaWQpXG5cdFx0XHRidXR0b25zRWx0LmZpbmQoJ3RyJykuZXEoZGF0YS5pZCkuZmluZCgndGQnKS5lcSgwKS5yZW1vdmVDbGFzcygncHJlc3NlZCcpXG5cdFx0fVxuXG5cdFx0Z2FtZXBhZC5vbignYXhlJywgb25HYW1lcGFkQXhlKVxuXHRcdGdhbWVwYWQub24oJ2J1dHRvbkRvd24nLCBvbkdhbWVwYWRCdXR0b25Eb3duKVxuXHRcdGdhbWVwYWQub24oJ2J1dHRvblVwJywgb25HYW1lcGFkQnV0dG9uVXApXG5cblx0XHR0aGlzLmRpc3Bvc2UgPSBmdW5jdGlvbigpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdkaXNwb3NlJylcblx0XHRcdGdhbWVwYWQub2ZmKCdheGUnLCBvbkdhbWVwYWRBeGUpXG5cdFx0XHRnYW1lcGFkLm9mZignYnV0dG9uRG93bicsIG9uR2FtZXBhZEJ1dHRvbkRvd24pXG5cdFx0XHRnYW1lcGFkLm9mZignYnV0dG9uVXAnLCBvbkdhbWVwYWRCdXR0b25VcClcblx0XG5cdFx0fVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRpZDogaW5mby5pZCxcblx0XHRcdFx0YXhlcyxcblx0XHRcdFx0YnV0dG9ucyxcblx0XHRcdFx0YWN0aW9ucyxcblx0XHRcdFx0Z2V0QnV0dG9uTGFiZWw6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGBCdXR0b24gJHtzY29wZS5pZHggKyAxfWBcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0QXhlTGFiZWw6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGBBeGUgJHtzY29wZS5pZHggKyAxfWBcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdC8qKkB0eXBlIHtKUXVlcnl9ICovXG5cdFx0Y29uc3QgYXhlc0VsdCA9IGN0cmwuc2NvcGUuYXhlc1xuXG5cdFx0LyoqQHR5cGUge0pRdWVyeX0gKi9cblx0XHRjb25zdCBidXR0b25zRWx0ID0gY3RybC5zY29wZS5idXR0b25zXG5cblx0XHRmdW5jdGlvbiBnZXRJbmZvKCkge1xuXHRcdFx0Y29uc3QgcmV0ID0ge1xuXHRcdFx0XHRpZDogaW5mby5pZCxcblx0XHRcdFx0YXhlczogW10sXG5cdFx0XHRcdGJ1dHRvbnM6IFtdXG5cdFx0XHR9XG5cdFx0XHRheGVzRWx0LmZpbmQoJ3RyJykuZWFjaChmdW5jdGlvbiAoaWR4KSB7XG5cdFx0XHRcdGNvbnN0IGFjdGlvbiA9ICQodGhpcykuZmluZCgnLml0ZW0nKS5nZXRWYWx1ZSgpXG5cdFx0XHRcdHJldC5heGVzLnB1c2goe1xuXHRcdFx0XHRcdGFjdGlvblxuXHRcdFx0XHR9KVxuXHRcdFx0fSlcblxuXHRcdFx0YnV0dG9uc0VsdC5maW5kKCd0cicpLmVhY2goZnVuY3Rpb24gKGlkeCkge1xuXHRcdFx0XHRjb25zdCB1cCA9ICQodGhpcykuZmluZCgnLnVwJykuZ2V0VmFsdWUoKVxuXHRcdFx0XHRjb25zdCBkb3duID0gJCh0aGlzKS5maW5kKCcuZG93bicpLmdldFZhbHVlKClcblx0XHRcdFx0Y29uc3QgdXBWYWx1ZSA9ICQodGhpcykuZmluZCgnLnVwVmFsdWUnKS5nZXRWYWx1ZSgpXG5cdFx0XHRcdGNvbnN0IGRvd25WYWx1ZSA9ICQodGhpcykuZmluZCgnLmRvd25WYWx1ZScpLmdldFZhbHVlKClcblxuXHRcdFx0XHRyZXQuYnV0dG9ucy5wdXNoKHtcblx0XHRcdFx0XHR1cCxcblx0XHRcdFx0XHRkb3duLFxuXHRcdFx0XHRcdHVwVmFsdWUsXG5cdFx0XHRcdFx0ZG93blZhbHVlXG5cdFx0XHRcdH0pXG5cdFx0XHR9KVx0XHRcblx0XHRcdFxuXHRcdFx0Y29uc29sZS5sb2coe3JldH0pXG5cblx0XHRcdHJldHVybiByZXRcblx0XHR9XG5cblx0XHR0aGlzLmdldEJ1dHRvbnMgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRjaGVjazoge1xuXHRcdFx0XHRcdGljb246ICdmYSBmYS1jaGVjaycsXG5cdFx0XHRcdFx0dGl0bGU6ICdBcHBseScsXG5cdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0cGFnZXIucG9wUGFnZShnZXRJbmZvKCkpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRyZXNldDoge1xuXHRcdFx0XHRcdGljb246ICdmYXMgZmEtc3luYycsXG5cdFx0XHRcdFx0dGl0bGU6ICdSZXNldCB2YWx1ZScsXG5cdFx0XHRcdFx0b25DbGljazogcmVzZXRWYWx1ZVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHR9XG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiLy8gQHRzLWNoZWNrXG5cbiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdodWJpbmZvJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInNjcm9sbEJhclxcXCI+XFxuICAgIDxoMT5FeHRlcm5hbCBEZXZpY2VzPC9oMT5cXG4gICAgPHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZS1hbGxcXFwiPlxcbiAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgIDx0cj5cXG4gICAgICAgICAgICAgICAgPHRoPlBvcnQ8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+RGV2aWNlIFR5cGU8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+QWN0aW9uPC90aD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90aGVhZD5cXG4gICAgICAgIDx0Ym9keSBibi1lYWNoPVxcXCJleHRlcm5hbERldmljZXNcXFwiIGJuLWV2ZW50PVxcXCJcXG4gICAgICAgICAgICBtb3VzZWRvd24ubW90b3JNb3VzZUFjdGlvbjogb25Nb3VzZVVwLCBcXG4gICAgICAgICAgICBtb3VzZXVwLm1vdG9yTW91c2VBY3Rpb246b25Nb3VzZURvd24sIFxcbiAgICAgICAgICAgIGNsaWNrLm1vdG9yQWN0aW9uOm9uTW90b3JBY3Rpb24sIFxcbiAgICAgICAgICAgIGNsaWNrLmxlZEFjdGlvbjogb25MZWRBY3Rpb24sXFxuICAgICAgICAgICAgY2xpY2sucG9ydEluZm86IG9uSW5mbzIsIFxcbiAgICAgICAgICAgIGNsaWNrLmNhbGlicmF0ZTpvbkNhbGlicmF0ZVxcXCI+XFxuICAgICAgICAgICAgPHRyPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLm5hbWVcXFwiPjwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkudHlwZVxcXCI+PC90ZD5cXG4gICAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gYm4taWY9XFxcImlzTW90b3JcXFwiIGNsYXNzPVxcXCJzcGFuQnV0dG9uc1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwidzMtYnRuIHczLWdyZWVuIG1vdG9yTW91c2VBY3Rpb25cXFwiIGRhdGEtYWN0aW9uPVxcXCJmb3J3YXJkXFxcIj5GV0Q8L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJ3My1idG4gdzMtZ3JlZW4gbW90b3JNb3VzZUFjdGlvblxcXCIgZGF0YS1hY3Rpb249XFxcImJhY2t3YXJkXFxcIj5CS1dEPC9idXR0b24+XFxuICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBibi1pZj1cXFwiaXNUYWNob01vdG9yXFxcIiBjbGFzcz1cXFwic3BhbkJ1dHRvbnNcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcInczLWJ0biB3My1ncmVlbiBtb3RvckFjdGlvblxcXCIgZGF0YS1hY3Rpb249XFxcInJlc2V0XFxcIj5SRVNFVDwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcInczLWJ0biB3My1ncmVlbiBtb3RvckFjdGlvblxcXCIgZGF0YS1hY3Rpb249XFxcImdvemVyb1xcXCI+R08gWkVSTzwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gYm4taWY9XFxcImlzTGVkXFxcIiBjbGFzcz1cXFwic3BhbkJ1dHRvbnNcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcInczLWJ0biB3My1ncmVlbiBsZWRBY3Rpb25cXFwiIGRhdGEtYWN0aW9uPVxcXCJvblxcXCI+T048L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJ3My1idG4gdzMtZ3JlZW4gbGVkQWN0aW9uXFxcIiBkYXRhLWFjdGlvbj1cXFwib2ZmXFxcIj5PRkY8L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cXG5cXG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcInczLWJ0biB3My1ibHVlIHBvcnRJbmZvXFxcIj5NT0RFPC9idXR0b24+XFxuICAgICAgICAgICAgICAgIDwvdGQ+XFxuXFxuICAgICAgICAgICAgPC90cj5cXG5cXG4gICAgICAgIDwvdGJvZHk+XFxuICAgIDwvdGFibGU+XFxuICAgIDxoMT5JbnRlcm5hbCBEZXZpY2VzPC9oMT5cXG4gICAgPHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZS1hbGxcXFwiPlxcbiAgICAgICAgPHRoZWFkPlxcbiAgICAgICAgICAgIDx0cj5cXG4gICAgICAgICAgICAgICAgPHRoPlBvcnQgSUQ8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+RGV2aWNlIFR5cGU8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+QWN0aW9uPC90aD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90aGVhZD5cXG4gICAgICAgIDx0Ym9keSBibi1lYWNoPVxcXCJpbnRlcm5hbERldmljZXNcXFwiIGJuLWV2ZW50PVxcXCJjbGljay53My1idG46IG9uSW5mb1xcXCI+XFxuICAgICAgICAgICAgPHRyPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLnBvcnRJZFxcXCI+PC90ZD5cXG4gICAgICAgICAgICAgICAgPHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS50eXBlXFxcIj48L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCI+TU9ERTwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgIDwvdHI+XFxuXFxuICAgICAgICA8L3Rib2R5PlxcbiAgICA8L3RhYmxlPjwvZGl2PlwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInLCAnaHViJ10sXG5cblx0cHJvcHM6IHtcblx0XHRodWJEZXZpY2U6IG51bGxcblx0fSxcblxuXHQvKipcblx0ICogXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuUGFnZXIuSW50ZXJmYWNlfSBwYWdlciBcblx0ICogQHBhcmFtIHtIVUJ9IGh1YlxuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIsIGh1Yikge1xuXG5cdFx0LyoqQHR5cGUge0hVQi5IdWJEZXZpY2V9ICovXG5cdFx0Y29uc3QgaHViRGV2aWNlID0gdGhpcy5wcm9wcy5odWJEZXZpY2VcblxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gaW5pdERldmljZXMoKSB7XG5cdFx0XHRjb25zdCBkZXZpY2VzID0gaHViRGV2aWNlLmdldEh1YkRldmljZXMoKVxuXHRcdFx0Y29uc29sZS5sb2coJ2RldmljZXMnLCBkZXZpY2VzKVxuXG5cdFx0XHRjb25zdCBpbnRlcm5hbERldmljZXMgPSBbXVxuXHRcdFx0Y29uc3QgZXh0ZXJuYWxEZXZpY2VzID0gW11cblxuXHRcdFx0Zm9yIChjb25zdCBkZXZpY2Ugb2YgZGV2aWNlcykge1xuXHRcdFx0XHQvL2F3YWl0IGRldmljZS5yZWFkSW5mbygpXG5cdFx0XHRcdGNvbnN0IHsgcG9ydElkLCB0eXBlLCBuYW1lIH0gPSBkZXZpY2Vcblx0XHRcdFx0aWYgKHBvcnRJZCA8IDUwKSB7XG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IHsgbmFtZSwgcG9ydElkLCB0eXBlIH1cblx0XHRcdFx0XHRleHRlcm5hbERldmljZXMucHVzaChpbmZvKVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGludGVybmFsRGV2aWNlcy5wdXNoKHtcblx0XHRcdFx0XHRcdHBvcnRJZCxcblx0XHRcdFx0XHRcdHR5cGVcblx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Y3RybC5zZXREYXRhKHsgaW50ZXJuYWxEZXZpY2VzLCBleHRlcm5hbERldmljZXMgfSlcblx0XHR9XG5cblxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB7bnVtYmVyfSBwb3J0SWQgXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IGRldmljZVR5cGVOYW1lXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gb3BlbkluZm9QYWdlKHBvcnRJZCwgZGV2aWNlVHlwZU5hbWUpIHtcblx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdpbmZvJywge1xuXHRcdFx0XHR0aXRsZTogZGV2aWNlVHlwZU5hbWUsXG5cdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0ZGV2aWNlOiBodWJEZXZpY2UuZ2V0RGV2aWNlKHBvcnRJZClcblx0XHRcdFx0fVxuXHRcdFx0fSlcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKiBAcGFyYW0ge0pRdWVyeTxIVE1MRWxlbWVudD59IGVsdCBcblx0XHQgKi9cblx0XHRmdW5jdGlvbiBnZXRFeHRlcm5hbFBvcnRJZChlbHQpIHtcblx0XHRcdGNvbnN0IGlkeCA9IGVsdC5jbG9zZXN0KCd0cicpLmluZGV4KClcblx0XHRcdHJldHVybiBjdHJsLm1vZGVsLmV4dGVybmFsRGV2aWNlc1tpZHhdLnBvcnRJZFxuXG5cdFx0fVxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gYXR0YWNoQ2JrKGRhdGEpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdhdHRhY2gnLCBkYXRhKVxuXHRcdFx0Y29uc3QgeyBwb3J0SWQsIG5hbWUsIHR5cGUgfSA9IGRhdGFcblx0XHRcdGNvbnN0IGluZm8gPSB7IHBvcnRJZCwgbmFtZSwgdHlwZSB9XG5cdFx0XHRjdHJsLm1vZGVsLmV4dGVybmFsRGV2aWNlcy5wdXNoKGluZm8pXG5cdFx0XHRjdHJsLnVwZGF0ZSgpXG5cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBkZXRhY2hDYmsoZGF0YSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2RldGFjaCcsIGRhdGEpXG5cdFx0XHRjb25zdCBpZHggPSBjdHJsLm1vZGVsLmV4dGVybmFsRGV2aWNlcy5maW5kSW5kZXgoKGRldikgPT4gZGV2LnBvcnRJZCA9PSBkYXRhLnBvcnRJZClcblx0XHRcdC8vY29uc29sZS5sb2coJ2lkeCcsIGlkeClcblx0XHRcdGN0cmwubW9kZWwuZXh0ZXJuYWxEZXZpY2VzLnNwbGljZShpZHgsIDEpXG5cdFx0XHRjdHJsLnVwZGF0ZSgpXG5cblx0XHR9XG5cblx0XHRodWJEZXZpY2Uub24oJ2F0dGFjaCcsIGF0dGFjaENiaylcblx0XHRodWJEZXZpY2Uub24oJ2RldGFjaCcsIGRldGFjaENiaylcblxuXHRcdHRoaXMuZGlzcG9zZSA9IGFzeW5jIGZ1bmN0aW9uICgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdodWJJbmZvIGRpc3Bvc2UnKVxuXHRcdFx0aHViRGV2aWNlLm9mZignYXR0YWNoJywgYXR0YWNoQ2JrKVxuXHRcdFx0aHViRGV2aWNlLm9mZignZGV0YWNoJywgZGV0YWNoQ2JrKVxuXG5cblx0XHR9XG5cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0aW50ZXJuYWxEZXZpY2VzOiBbXSxcblx0XHRcdFx0ZXh0ZXJuYWxEZXZpY2VzOiBbXSxcblx0XHRcdFx0aXNNb3RvcjogZnVuY3Rpb24gKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGh1Yi5pc01vdG9yKGh1YkRldmljZS5nZXREZXZpY2Uoc2NvcGUuJGkucG9ydElkKSlcblx0XHRcdFx0fSxcblx0XHRcdFx0aXNMZWQ6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBodWIuaXNMZWQoaHViRGV2aWNlLmdldERldmljZShzY29wZS4kaS5wb3J0SWQpKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRpc1RhY2hvTW90b3I6IGZ1bmN0aW9uIChzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBodWIuaXNUYWNob01vdG9yKGh1YkRldmljZS5nZXREZXZpY2Uoc2NvcGUuJGkucG9ydElkKSlcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbk1vdG9yQWN0aW9uOiBhc3luYyBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Y29uc3QgcG9ydElkID0gZ2V0RXh0ZXJuYWxQb3J0SWQoJCh0aGlzKSlcblx0XHRcdFx0XHRjb25zdCBhY3Rpb24gPSAkKHRoaXMpLmRhdGEoJ2FjdGlvbicpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uTW90b3JBY3Rpb24nLCBwb3J0SWQsIGFjdGlvbilcblx0XHRcdFx0XHRjb25zdCBtb3RvciA9IGF3YWl0IGh1YkRldmljZS5nZXRUYWNob01vdG9yKHBvcnRJZClcblx0XHRcdFx0XHRzd2l0Y2ggKGFjdGlvbikge1xuXHRcdFx0XHRcdFx0Y2FzZSAncmVzZXQnOlxuXHRcdFx0XHRcdFx0XHRtb3Rvci5yZXNldFplcm8oKVxuXHRcdFx0XHRcdFx0XHRicmVha1xuXHRcdFx0XHRcdFx0Y2FzZSAnZ296ZXJvJzpcblx0XHRcdFx0XHRcdFx0bW90b3IuZ290b0FuZ2xlKDAsIDUwLCBmYWxzZSlcblxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkxlZEFjdGlvbjogYXN5bmMgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IHBvcnRJZCA9IGdldEV4dGVybmFsUG9ydElkKCQodGhpcykpXG5cdFx0XHRcdFx0Y29uc3QgYWN0aW9uID0gJCh0aGlzKS5kYXRhKCdhY3Rpb24nKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkxlZEFjdGlvbicsIHBvcnRJZCwgYWN0aW9uKVxuXHRcdFx0XHRcdGNvbnN0IGxlZCA9IGF3YWl0IGh1YkRldmljZS5nZXRMZWQocG9ydElkKVxuXHRcdFx0XHRcdGxlZC5zZXRCcmlnaHRuZXNzKChhY3Rpb24gPT0gJ29uJyA/IDEwMCA6IDApKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkNhbGlicmF0ZTogYXN5bmMgZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IHBvcnRJZCA9IGdldEV4dGVybmFsUG9ydElkKCQodGhpcykpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ2FsaWJyYXRlJywgcG9ydElkKVxuXHRcdFx0XHRcdGNvbnN0IG1vdG9yID0gYXdhaXQgaHViRGV2aWNlLmdldE1vdG9yKHBvcnRJZClcblx0XHRcdFx0XHRhd2FpdCBtb3Rvci5jYWxpYnJhdGUoKVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbk1vdXNlVXA6IGFzeW5jIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdvbk1vdXNlVXAnKVxuXHRcdFx0XHRcdGNvbnN0IGFjdGlvbiA9ICQodGhpcykuZGF0YSgnYWN0aW9uJylcblx0XHRcdFx0XHRjb25zdCBwb3J0SWQgPSBnZXRFeHRlcm5hbFBvcnRJZCgkKHRoaXMpKVxuXHRcdFx0XHRcdGNvbnN0IG1vdG9yID0gYXdhaXQgaHViRGV2aWNlLmdldE1vdG9yKHBvcnRJZClcblx0XHRcdFx0XHRzd2l0Y2ggKGFjdGlvbikge1xuXHRcdFx0XHRcdFx0Y2FzZSAnZm9yd2FyZCc6XG5cdFx0XHRcdFx0XHRcdG1vdG9yLnNldFBvd2VyKDEwMClcblx0XHRcdFx0XHRcdFx0YnJlYWtcblx0XHRcdFx0XHRcdGNhc2UgJ2JhY2t3YXJkJzpcblx0XHRcdFx0XHRcdFx0bW90b3Iuc2V0UG93ZXIoLTEwMClcblx0XHRcdFx0XHRcdFx0YnJlYWtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTW91c2VEb3duOiBhc3luYyBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25Nb3VzZURvd24nKVxuXHRcdFx0XHRcdGNvbnN0IHBvcnRJZCA9IGdldEV4dGVybmFsUG9ydElkKCQodGhpcykpXG5cdFx0XHRcdFx0Y29uc3QgbW90b3IgPSBhd2FpdCBodWJEZXZpY2UuZ2V0TW90b3IocG9ydElkKVxuXHRcdFx0XHRcdG1vdG9yLnNldFBvd2VyKDApXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uSW5mbzogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3QgeyBwb3J0SWQsIGRldmljZVR5cGVOYW1lIH0gPSBjdHJsLm1vZGVsLmludGVybmFsRGV2aWNlc1tpZHhdXG5cdFx0XHRcdFx0b3BlbkluZm9QYWdlKHBvcnRJZCwgZGV2aWNlVHlwZU5hbWUpXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25JbmZvMjogZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3QgeyBwb3J0SWQsIGRldmljZVR5cGVOYW1lIH0gPSBjdHJsLm1vZGVsLmV4dGVybmFsRGV2aWNlc1tpZHhdXG5cdFx0XHRcdFx0b3BlbkluZm9QYWdlKHBvcnRJZCwgZGV2aWNlVHlwZU5hbWUpXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRpbml0RGV2aWNlcygpXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIvLyBAdHMtY2hlY2tcblxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2luZm8nLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdj5cXG4gICAgPGRpdj5cXG4gICAgICAgIENhcGFiaWxpdGllczogPHNwYW4gYm4tdGV4dD1cXFwiY2FwYWJpbGl0aWVzXFxcIj48L3NwYW4+XFxuICAgIDwvZGl2PlxcbiAgICA8dGFibGUgY2xhc3M9XFxcInczLXRhYmxlLWFsbFxcXCI+XFxuICAgICAgICA8dGhlYWQ+XFxuICAgICAgICAgICAgPHRyPlxcbiAgICAgICAgICAgICAgICA8dGg+TU9ERTwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5DQVBBQklMSVRJRVM8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+VU5JVDwvdGg+XFxuICAgICAgICAgICAgICAgIDx0aD5SQVc8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+U0k8L3RoPlxcbiAgICAgICAgICAgICAgICA8dGg+VkFMVUUgRk9STUFUPC90aD5cXG4gICAgICAgICAgICAgICAgPHRoPlZhbHVlPC90aD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90aGVhZD5cXG4gICAgICAgIDx0Ym9keSBibi1lYWNoPVxcXCJtb2Rlc1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLmJ0bkdldDogb25CdG5HZXRcXFwiPlxcbiAgICAgICAgICAgIDx0cj5cXG4gICAgICAgICAgICAgICAgPHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5uYW1lXFxcIj48L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQgYm4tdGV4dD1cXFwiZ2V0Q2FwYWJpbGl0ZXNcXFwiPjwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkudW5pdFxcXCI+PC90ZD5cXG4gICAgICAgICAgICAgICAgPHRkPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gYm4tdGV4dD1cXFwiJHNjb3BlLiRpLlJBVy5taW5cXFwiPjwvc3Bhbj48YnI+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuJGkuUkFXLm1heFxcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuJGkuUENULm1pblxcXCI+PC9zcGFuPjxicj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5QQ1QubWF4XFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5TSS5taW5cXFwiPjwvc3Bhbj48YnI+XFxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuJGkuU0kubWF4XFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgICAgIDwvdGQ+XFxuICAgICAgICAgICAgICAgIDx0ZD5cXG4gICAgICAgICAgICAgICAgICAgIGRhdGFUeXBlOiA8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuJGkuVkFMVUVfRk9STUFULmRhdGFUeXBlXFxcIj48L3NwYW4+PGJyPlxcbiAgICAgICAgICAgICAgICAgICAgbnVtVmFsdWVzOiA8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuJGkuVkFMVUVfRk9STUFULm51bVZhbHVlc1xcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgICAgICA8L3RkPlxcbiAgICAgICAgICAgICAgICA8dGQ+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGJuLWlmPVxcXCJpc0lucHV0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJ3My1idG4gdzMtZ3JlZW4gYnRuR2V0XFxcIj5HZXQ8L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3Bhbj48L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG5cXG4gICAgICAgICAgICAgICAgPC90ZD5cXG4gICAgICAgICAgICA8L3RyPlxcbiAgICAgICAgPC90Ym9keT5cXG4gICAgPC90YWJsZT5cXG48L2Rpdj5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnBhZ2VyJywgJ2h1YiddLFxuXG5cdHByb3BzOiB7XG5cdFx0ZGV2aWNlOiBudWxsXG5cdH0sXG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0ge0JyZWl6Ym90LlNlcnZpY2VzLlBhZ2VyLkludGVyZmFjZX0gcGFnZXIgXG5cdCAqIEBwYXJhbSB7SFVCfSBodWJcblx0ICovXG5cdGluaXQ6IGZ1bmN0aW9uIChlbHQsIHBhZ2VyLCBodWIpIHtcblxuXHRcdC8qKkB0eXBlIHtIVUIuRGV2aWNlfSAqL1xuXHRcdGNvbnN0IGRldmljZSA9IHRoaXMucHJvcHMuZGV2aWNlXG5cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0bW9kZXM6IFtdLFxuXHRcdFx0XHRjYXBhYmlsaXRpZXM6ICcnLFxuXHRcdFx0XHRpc0lucHV0OiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiAoc2NvcGUuJGkubW9kZSAmIDB4MSkgIT0gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRDYXBhYmlsaXRlczogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRpZiAoc2NvcGUuJGkubW9kZSA9PSAyKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJ09VVCdcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSBpZiAoc2NvcGUuJGkubW9kZSA9PSAxKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJ0lOJ1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIGlmIChzY29wZS4kaS5tb2RlID09IDMpIHtcblx0XHRcdFx0XHRcdHJldHVybiAnSU4vT1VUJ1xuXHRcdFx0XHRcdH1cdFx0XHRcdFxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQnRuR2V0OiBhc3luYyBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdGNvbnN0IG1vZGUgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkJ0bkdldCcsIG1vZGUpXG5cdFx0XHRcdFx0Y29uc3QgdmFsdWVzID0gYXdhaXQgZGV2aWNlLmdldFZhbHVlKG1vZGUpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3ZhbHVlcycsIHZhbHVlcylcblx0XHRcdFx0XHQkKHRoaXMpLmNsb3Nlc3QoJ3RkJykuZmluZCgnc3BhbicpLnRleHQoSlNPTi5zdHJpbmdpZnkodmFsdWVzLCBudWxsLCA0KSlcblx0XHRcdFx0XHRcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRhc3luYyBmdW5jdGlvbiBpbml0KCkge1xuXHRcdFx0Y29uc3QgeyBtb2RlcywgY2FwYWJpbGl0aWVzIH0gPSBhd2FpdCBkZXZpY2UucmVhZEluZm8oKVxuXHRcdFx0Y3RybC5zZXREYXRhKHsgbW9kZXMsIGNhcGFiaWxpdGllcyB9KVxuXHRcdH1cblxuXHRcdGluaXQoKVxuXHR9XG5cblxufSk7XG5cblxuXG5cbiJdfQ==
