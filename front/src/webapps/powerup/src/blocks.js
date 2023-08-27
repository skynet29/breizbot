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


    Blockly.Blocks['device_subscribe'] = {
        init: function() {
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
