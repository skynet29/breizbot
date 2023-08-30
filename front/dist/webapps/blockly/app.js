// @ts-check


$$.control.registerControl('rootPage', {

	template: "<div class=\"toolbar\">\n    <button bn-event=\"click: onRun\" class=\"w3-btn w3-blue\">Block</button>\n    <button bn-event=\"click: onGenerate\" class=\"w3-btn w3-blue\">Run</button>\n\n</div>\n<div id=\"blocklyDiv\"></div>\n<div class=\"logPanel\" bn-html=\"getLogs\"></div>\n\n<xml id=\"toolbox\" style=\"display: none;\">\n    <category name=\"Logic\" categorystyle=\"logic_category\">\n        <block type=\"controls_if\"></block>\n        <block type=\"logic_compare\"></block>\n        <block type=\"logic_operation\"></block>\n        <block type=\"logic_negate\"></block>\n        <block type=\"logic_boolean\"></block>\n        <block type=\"logic_ternary\"></block>\n    </category>\n    <category name=\"Loop\" categorystyle=\"loop_category\">\n        <block type=\"controls_repeat_ext\">\n            <value name=\"TIMES\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">10</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"controls_whileUntil\"></block>\n        <block type=\"controls_for\">\n            <value name=\"START\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">1</field>\n                </shadow>\n            </value>\n            <value name=\"END\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">10</field>\n                </shadow>\n            </value>\n            <value name=\"STEP\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">1</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"controls_forEach\"></block>\n        <block type=\"controls_flow_statements\"></block>\n    </category>\n    <category name=\"Math\" categorystyle=\"math_category\">\n        <block type=\"math_number\"></block>\n        <block type=\"math_arithmetic\"></block>\n        <block type=\"math_random_int\">\n            <value name=\"FROM\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">1</field>\n                </shadow>\n            </value>\n            <value name=\"TO\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">100</field>\n                </shadow>\n            </value>\n        </block>\n    </category>\n    <category name=\"Text\" categorystyle=\"text_category\">\n        <block type=\"text\"></block>\n        <block type=\"text_print\"></block>\n        <block type=\"text_length\">\n            <value name=\"VALUE\">\n                <shadow type=\"text\">\n                    <field name=\"TEXT\">abc</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"text_changeCase\">\n            <field name=\"CASE\">UPPERCASE</field>\n            <value name=\"TEXT\">\n                <shadow type=\"text\">\n                    <field name=\"TEXT\">abc</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"text_append\">\n            <field name=\"VAR\" id=\"MHveE$^#X7/c|*RA!r{I\">item</field>\n            <value name=\"TEXT\">\n                <shadow type=\"text\">\n                    <field name=\"TEXT\" />\n                </shadow>\n            </value>\n        </block>\n        <block type=\"text_join\">\n            <mutation items=\"2\" />\n        </block>\n        <block type=\"text_indexOf\"></block>\n        <block type=\"text_charAt\"></block>\n        <block type=\"text_getSubstring\"></block>\n        <block type=\"text_prompt_ext\">\n            <mutation type=\"TEXT\" />\n            <field name=\"TYPE\">TEXT</field>\n            <value name=\"TEXT\">\n                <shadow type=\"text\">\n                    <field name=\"TEXT\">abc</field>\n                </shadow>\n            </value>\n        </block>\n    </category>\n    <category name=\"Lists\" categorystyle=\"list_category\">\n        <block type=\"lists_create_with\">\n            <mutation items=\"0\"></mutation>\n        </block>\n        <block type=\"lists_create_with\"></block>\n        <block type=\"lists_repeat\">\n            <value name=\"NUM\">\n                <shadow type=\"math_number\">\n                    <field name=\"NUM\">5</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"lists_length\"></block>\n        <block type=\"lists_isEmpty\"></block>\n        <block type=\"lists_indexOf\">\n            <value name=\"VALUE\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">list</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"lists_getIndex\">\n            <value name=\"VALUE\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">list</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"lists_setIndex\">\n            <value name=\"LIST\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">list</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"lists_getSublist\">\n            <value name=\"LIST\">\n                <block type=\"variables_get\">\n                    <field name=\"VAR\">list</field>\n                </block>\n            </value>\n        </block>\n        <block type=\"lists_split\">\n            <value name=\"DELIM\">\n                <shadow type=\"text\">\n                    <field name=\"TEXT\">,</field>\n                </shadow>\n            </value>\n        </block>\n        <block type=\"lists_sort\"></block>\n        <block type=\"lists_reverse\"></block>\n    </category>\n    <category id=\"catVariables\" colour=\"330\" name=\"Variables\">\n        <block type=\"global_declaration\"></block>\n        <block type=\"local_declaration_statement\"></block>\n        <block type=\"lexical_variable_get\"></block>\n        <block type=\"lexical_variable_set\"></block>\n    </category>\n    <category name=\"Functions\" custom=\"PROCEDURE\" categorystyle=\"procedure_category\"></category>\n    <category name=\"Music\" colour=\"355\">\n        <block type=\"play_sound\"></block>\n    </category>\n\n</xml>",

	deps: ['breizbot.pager', 'breizbot.blocklyinterpretorLexical', 'breizbot.blockly'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager
	 * @param {Breizbot.Services.BlocklyInterpretor.Interface} blocklyInterpretor 
	 */
	init: function (elt, pager, blocklyInterpretor, blocklySrv) {



		Blockly.Blocks['play_sound'] = {
			init: function () {
				this.appendDummyInput()
					.appendField("Play")
					.appendField(new Blockly.FieldDropdown([["C4", "sounds/c4.m4a"], ["D4", "sounds/d4.m4a"], ["E4", "sounds/e4.m4a"]]), "NAME");
				this.setPreviousStatement(true, null);
				this.setNextStatement(true, null);
				this.setColour(355);
				this.setTooltip("");
				this.setHelpUrl("");
			}
		}

		javascript.javascriptGenerator.forBlock['play_sound'] = function (block, generator) {
			var dropdown_name = block.getFieldValue('NAME');
			console.log('value', dropdown_name)

			// TODO: Assemble javascript into code variable.
			var code = '...\n';
			return code;
		};

		// Blockly.JavaScript['play_sound'] = function(block) {
		// 	let value = block.getFieldValue('NAME')
		// 	console.log('value', value)
		// 	return '\n'
		//   }

		// Blockly.common.defineBlocksWithJsonArray([
		// 	{
		// 	  "type": "play_sound",
		// 	  "message0": "Play %1",
		// 	  "args0": [
		// 		{
		// 		  "type": "field_dropdown",
		// 		  "name": "VALUE",
		// 		  "options": [
		// 			["C4", "sounds/c4.m4a"],
		// 			["D4", "sounds/d4.m4a"],
		// 			["E4", "sounds/e4.m4a"],
		// 			["F4", "sounds/f4.m4a"],
		// 			["G4", "sounds/g4.m4a"]
		// 		  ]
		// 		}
		// 	  ],
		// 	  "previousStatement": null,
		// 	  "nextStatement": null,
		// 	  "colour": 355
		// 	}
		//   ]);



		blocklySrv.inject('blocklyDiv', document.getElementById('toolbox'))



		blocklyInterpretor.setLogFunction((text) => {
			ctrl.model.logs.push(text)
			ctrl.update()
		})


		const ctrl = $$.viewController(elt, {
			data: {
				logs: [],
				getLogs: function () {
					return this.logs.join('<br>')
				}
			},
			events: {
				onRun: function () {
					//console.log('onSave')
					const info = Blockly.serialization.workspaces.save(Blockly.getMainWorkspace())
					console.log('code', info)
				},
				onGenerate: function () {
					const code = Blockly.serialization.workspaces.save(Blockly.getMainWorkspace())
					ctrl.setData({logs: []})				
					blocklyInterpretor.startCode(code)
				}
			}
		})


	}


});





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQHRzLWNoZWNrXG5cblxuJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcbiAgICA8YnV0dG9uIGJuLWV2ZW50PVxcXCJjbGljazogb25SdW5cXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCI+QmxvY2s8L2J1dHRvbj5cXG4gICAgPGJ1dHRvbiBibi1ldmVudD1cXFwiY2xpY2s6IG9uR2VuZXJhdGVcXFwiIGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCI+UnVuPC9idXR0b24+XFxuXFxuPC9kaXY+XFxuPGRpdiBpZD1cXFwiYmxvY2tseURpdlxcXCI+PC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwibG9nUGFuZWxcXFwiIGJuLWh0bWw9XFxcImdldExvZ3NcXFwiPjwvZGl2Plxcblxcbjx4bWwgaWQ9XFxcInRvb2xib3hcXFwiIHN0eWxlPVxcXCJkaXNwbGF5OiBub25lO1xcXCI+XFxuICAgIDxjYXRlZ29yeSBuYW1lPVxcXCJMb2dpY1xcXCIgY2F0ZWdvcnlzdHlsZT1cXFwibG9naWNfY2F0ZWdvcnlcXFwiPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImNvbnRyb2xzX2lmXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxvZ2ljX2NvbXBhcmVcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibG9naWNfb3BlcmF0aW9uXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxvZ2ljX25lZ2F0ZVxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsb2dpY19ib29sZWFuXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxvZ2ljX3Rlcm5hcnlcXFwiPjwvYmxvY2s+XFxuICAgIDwvY2F0ZWdvcnk+XFxuICAgIDxjYXRlZ29yeSBuYW1lPVxcXCJMb29wXFxcIiBjYXRlZ29yeXN0eWxlPVxcXCJsb29wX2NhdGVnb3J5XFxcIj5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJjb250cm9sc19yZXBlYXRfZXh0XFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVElNRVNcXFwiPlxcbiAgICAgICAgICAgICAgICA8c2hhZG93IHR5cGU9XFxcIm1hdGhfbnVtYmVyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJOVU1cXFwiPjEwPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwiY29udHJvbHNfd2hpbGVVbnRpbFxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJjb250cm9sc19mb3JcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJTVEFSVFxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIkVORFxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTA8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJTVEVQXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj4xPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwiY29udHJvbHNfZm9yRWFjaFxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJjb250cm9sc19mbG93X3N0YXRlbWVudHNcXFwiPjwvYmxvY2s+XFxuICAgIDwvY2F0ZWdvcnk+XFxuICAgIDxjYXRlZ29yeSBuYW1lPVxcXCJNYXRoXFxcIiBjYXRlZ29yeXN0eWxlPVxcXCJtYXRoX2NhdGVnb3J5XFxcIj5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJtYXRoX2FyaXRobWV0aWNcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibWF0aF9yYW5kb21faW50XFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiRlJPTVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwibWF0aF9udW1iZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIk5VTVxcXCI+MTwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlRPXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj4xMDA8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgPC9jYXRlZ29yeT5cXG4gICAgPGNhdGVnb3J5IG5hbWU9XFxcIlRleHRcXFwiIGNhdGVnb3J5c3R5bGU9XFxcInRleHRfY2F0ZWdvcnlcXFwiPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcInRleHRcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwidGV4dF9wcmludFxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJ0ZXh0X2xlbmd0aFxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlZBTFVFXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJ0ZXh0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJURVhUXFxcIj5hYmM8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJ0ZXh0X2NoYW5nZUNhc2VcXFwiPlxcbiAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJDQVNFXFxcIj5VUFBFUkNBU0U8L2ZpZWxkPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJURVhUXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJ0ZXh0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJURVhUXFxcIj5hYmM8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L3NoYWRvdz5cXG4gICAgICAgICAgICA8L3ZhbHVlPlxcbiAgICAgICAgPC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJ0ZXh0X2FwcGVuZFxcXCI+XFxuICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlZBUlxcXCIgaWQ9XFxcIk1IdmVFJF4jWDcvY3wqUkEhcntJXFxcIj5pdGVtPC9maWVsZD5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVEVYVFxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwidGV4dFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVEVYVFxcXCIgLz5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwidGV4dF9qb2luXFxcIj5cXG4gICAgICAgICAgICA8bXV0YXRpb24gaXRlbXM9XFxcIjJcXFwiIC8+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcInRleHRfaW5kZXhPZlxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJ0ZXh0X2NoYXJBdFxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJ0ZXh0X2dldFN1YnN0cmluZ1xcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJ0ZXh0X3Byb21wdF9leHRcXFwiPlxcbiAgICAgICAgICAgIDxtdXRhdGlvbiB0eXBlPVxcXCJURVhUXFxcIiAvPlxcbiAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJUWVBFXFxcIj5URVhUPC9maWVsZD5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiVEVYVFxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwidGV4dFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVEVYVFxcXCI+YWJjPC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgIDwvY2F0ZWdvcnk+XFxuICAgIDxjYXRlZ29yeSBuYW1lPVxcXCJMaXN0c1xcXCIgY2F0ZWdvcnlzdHlsZT1cXFwibGlzdF9jYXRlZ29yeVxcXCI+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfY3JlYXRlX3dpdGhcXFwiPlxcbiAgICAgICAgICAgIDxtdXRhdGlvbiBpdGVtcz1cXFwiMFxcXCI+PC9tdXRhdGlvbj5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfY3JlYXRlX3dpdGhcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfcmVwZWF0XFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiTlVNXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNoYWRvdyB0eXBlPVxcXCJtYXRoX251bWJlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiTlVNXFxcIj41PC9maWVsZD5cXG4gICAgICAgICAgICAgICAgPC9zaGFkb3c+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfbGVuZ3RoXFxcIj48L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxpc3RzX2lzRW1wdHlcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfaW5kZXhPZlxcXCI+XFxuICAgICAgICAgICAgPHZhbHVlIG5hbWU9XFxcIlZBTFVFXFxcIj5cXG4gICAgICAgICAgICAgICAgPGJsb2NrIHR5cGU9XFxcInZhcmlhYmxlc19nZXRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlZBUlxcXCI+bGlzdDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfZ2V0SW5kZXhcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJWQUxVRVxcXCI+XFxuICAgICAgICAgICAgICAgIDxibG9jayB0eXBlPVxcXCJ2YXJpYWJsZXNfZ2V0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJWQVJcXFwiPmxpc3Q8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxpc3RzX3NldEluZGV4XFxcIj5cXG4gICAgICAgICAgICA8dmFsdWUgbmFtZT1cXFwiTElTVFxcXCI+XFxuICAgICAgICAgICAgICAgIDxibG9jayB0eXBlPVxcXCJ2YXJpYWJsZXNfZ2V0XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxmaWVsZCBuYW1lPVxcXCJWQVJcXFwiPmxpc3Q8L2ZpZWxkPlxcbiAgICAgICAgICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxpc3RzX2dldFN1Ymxpc3RcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJMSVNUXFxcIj5cXG4gICAgICAgICAgICAgICAgPGJsb2NrIHR5cGU9XFxcInZhcmlhYmxlc19nZXRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGZpZWxkIG5hbWU9XFxcIlZBUlxcXCI+bGlzdDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvYmxvY2s+XFxuICAgICAgICAgICAgPC92YWx1ZT5cXG4gICAgICAgIDwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfc3BsaXRcXFwiPlxcbiAgICAgICAgICAgIDx2YWx1ZSBuYW1lPVxcXCJERUxJTVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzaGFkb3cgdHlwZT1cXFwidGV4dFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZmllbGQgbmFtZT1cXFwiVEVYVFxcXCI+LDwvZmllbGQ+XFxuICAgICAgICAgICAgICAgIDwvc2hhZG93PlxcbiAgICAgICAgICAgIDwvdmFsdWU+XFxuICAgICAgICA8L2Jsb2NrPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImxpc3RzX3NvcnRcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGlzdHNfcmV2ZXJzZVxcXCI+PC9ibG9jaz5cXG4gICAgPC9jYXRlZ29yeT5cXG4gICAgPGNhdGVnb3J5IGlkPVxcXCJjYXRWYXJpYWJsZXNcXFwiIGNvbG91cj1cXFwiMzMwXFxcIiBuYW1lPVxcXCJWYXJpYWJsZXNcXFwiPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcImdsb2JhbF9kZWNsYXJhdGlvblxcXCI+PC9ibG9jaz5cXG4gICAgICAgIDxibG9jayB0eXBlPVxcXCJsb2NhbF9kZWNsYXJhdGlvbl9zdGF0ZW1lbnRcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGV4aWNhbF92YXJpYWJsZV9nZXRcXFwiPjwvYmxvY2s+XFxuICAgICAgICA8YmxvY2sgdHlwZT1cXFwibGV4aWNhbF92YXJpYWJsZV9zZXRcXFwiPjwvYmxvY2s+XFxuICAgIDwvY2F0ZWdvcnk+XFxuICAgIDxjYXRlZ29yeSBuYW1lPVxcXCJGdW5jdGlvbnNcXFwiIGN1c3RvbT1cXFwiUFJPQ0VEVVJFXFxcIiBjYXRlZ29yeXN0eWxlPVxcXCJwcm9jZWR1cmVfY2F0ZWdvcnlcXFwiPjwvY2F0ZWdvcnk+XFxuICAgIDxjYXRlZ29yeSBuYW1lPVxcXCJNdXNpY1xcXCIgY29sb3VyPVxcXCIzNTVcXFwiPlxcbiAgICAgICAgPGJsb2NrIHR5cGU9XFxcInBsYXlfc291bmRcXFwiPjwvYmxvY2s+XFxuICAgIDwvY2F0ZWdvcnk+XFxuXFxuPC94bWw+XCIsXG5cblx0ZGVwczogWydicmVpemJvdC5wYWdlcicsICdicmVpemJvdC5ibG9ja2x5aW50ZXJwcmV0b3JMZXhpY2FsJywgJ2JyZWl6Ym90LmJsb2NrbHknXSxcblxuXHRwcm9wczoge1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIHtCcmVpemJvdC5TZXJ2aWNlcy5QYWdlci5JbnRlcmZhY2V9IHBhZ2VyXG5cdCAqIEBwYXJhbSB7QnJlaXpib3QuU2VydmljZXMuQmxvY2tseUludGVycHJldG9yLkludGVyZmFjZX0gYmxvY2tseUludGVycHJldG9yIFxuXHQgKi9cblx0aW5pdDogZnVuY3Rpb24gKGVsdCwgcGFnZXIsIGJsb2NrbHlJbnRlcnByZXRvciwgYmxvY2tseVNydikge1xuXG5cblxuXHRcdEJsb2NrbHkuQmxvY2tzWydwbGF5X3NvdW5kJ10gPSB7XG5cdFx0XHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHRoaXMuYXBwZW5kRHVtbXlJbnB1dCgpXG5cdFx0XHRcdFx0LmFwcGVuZEZpZWxkKFwiUGxheVwiKVxuXHRcdFx0XHRcdC5hcHBlbmRGaWVsZChuZXcgQmxvY2tseS5GaWVsZERyb3Bkb3duKFtbXCJDNFwiLCBcInNvdW5kcy9jNC5tNGFcIl0sIFtcIkQ0XCIsIFwic291bmRzL2Q0Lm00YVwiXSwgW1wiRTRcIiwgXCJzb3VuZHMvZTQubTRhXCJdXSksIFwiTkFNRVwiKTtcblx0XHRcdFx0dGhpcy5zZXRQcmV2aW91c1N0YXRlbWVudCh0cnVlLCBudWxsKTtcblx0XHRcdFx0dGhpcy5zZXROZXh0U3RhdGVtZW50KHRydWUsIG51bGwpO1xuXHRcdFx0XHR0aGlzLnNldENvbG91cigzNTUpO1xuXHRcdFx0XHR0aGlzLnNldFRvb2x0aXAoXCJcIik7XG5cdFx0XHRcdHRoaXMuc2V0SGVscFVybChcIlwiKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRqYXZhc2NyaXB0LmphdmFzY3JpcHRHZW5lcmF0b3IuZm9yQmxvY2tbJ3BsYXlfc291bmQnXSA9IGZ1bmN0aW9uIChibG9jaywgZ2VuZXJhdG9yKSB7XG5cdFx0XHR2YXIgZHJvcGRvd25fbmFtZSA9IGJsb2NrLmdldEZpZWxkVmFsdWUoJ05BTUUnKTtcblx0XHRcdGNvbnNvbGUubG9nKCd2YWx1ZScsIGRyb3Bkb3duX25hbWUpXG5cblx0XHRcdC8vIFRPRE86IEFzc2VtYmxlIGphdmFzY3JpcHQgaW50byBjb2RlIHZhcmlhYmxlLlxuXHRcdFx0dmFyIGNvZGUgPSAnLi4uXFxuJztcblx0XHRcdHJldHVybiBjb2RlO1xuXHRcdH07XG5cblx0XHQvLyBCbG9ja2x5LkphdmFTY3JpcHRbJ3BsYXlfc291bmQnXSA9IGZ1bmN0aW9uKGJsb2NrKSB7XG5cdFx0Ly8gXHRsZXQgdmFsdWUgPSBibG9jay5nZXRGaWVsZFZhbHVlKCdOQU1FJylcblx0XHQvLyBcdGNvbnNvbGUubG9nKCd2YWx1ZScsIHZhbHVlKVxuXHRcdC8vIFx0cmV0dXJuICdcXG4nXG5cdFx0Ly8gICB9XG5cblx0XHQvLyBCbG9ja2x5LmNvbW1vbi5kZWZpbmVCbG9ja3NXaXRoSnNvbkFycmF5KFtcblx0XHQvLyBcdHtcblx0XHQvLyBcdCAgXCJ0eXBlXCI6IFwicGxheV9zb3VuZFwiLFxuXHRcdC8vIFx0ICBcIm1lc3NhZ2UwXCI6IFwiUGxheSAlMVwiLFxuXHRcdC8vIFx0ICBcImFyZ3MwXCI6IFtcblx0XHQvLyBcdFx0e1xuXHRcdC8vIFx0XHQgIFwidHlwZVwiOiBcImZpZWxkX2Ryb3Bkb3duXCIsXG5cdFx0Ly8gXHRcdCAgXCJuYW1lXCI6IFwiVkFMVUVcIixcblx0XHQvLyBcdFx0ICBcIm9wdGlvbnNcIjogW1xuXHRcdC8vIFx0XHRcdFtcIkM0XCIsIFwic291bmRzL2M0Lm00YVwiXSxcblx0XHQvLyBcdFx0XHRbXCJENFwiLCBcInNvdW5kcy9kNC5tNGFcIl0sXG5cdFx0Ly8gXHRcdFx0W1wiRTRcIiwgXCJzb3VuZHMvZTQubTRhXCJdLFxuXHRcdC8vIFx0XHRcdFtcIkY0XCIsIFwic291bmRzL2Y0Lm00YVwiXSxcblx0XHQvLyBcdFx0XHRbXCJHNFwiLCBcInNvdW5kcy9nNC5tNGFcIl1cblx0XHQvLyBcdFx0ICBdXG5cdFx0Ly8gXHRcdH1cblx0XHQvLyBcdCAgXSxcblx0XHQvLyBcdCAgXCJwcmV2aW91c1N0YXRlbWVudFwiOiBudWxsLFxuXHRcdC8vIFx0ICBcIm5leHRTdGF0ZW1lbnRcIjogbnVsbCxcblx0XHQvLyBcdCAgXCJjb2xvdXJcIjogMzU1XG5cdFx0Ly8gXHR9XG5cdFx0Ly8gICBdKTtcblxuXG5cblx0XHRibG9ja2x5U3J2LmluamVjdCgnYmxvY2tseURpdicsIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b29sYm94JykpXG5cblxuXG5cdFx0YmxvY2tseUludGVycHJldG9yLnNldExvZ0Z1bmN0aW9uKCh0ZXh0KSA9PiB7XG5cdFx0XHRjdHJsLm1vZGVsLmxvZ3MucHVzaCh0ZXh0KVxuXHRcdFx0Y3RybC51cGRhdGUoKVxuXHRcdH0pXG5cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0bG9nczogW10sXG5cdFx0XHRcdGdldExvZ3M6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5sb2dzLmpvaW4oJzxicj4nKVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uUnVuOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25TYXZlJylcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gQmxvY2tseS5zZXJpYWxpemF0aW9uLndvcmtzcGFjZXMuc2F2ZShCbG9ja2x5LmdldE1haW5Xb3Jrc3BhY2UoKSlcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnY29kZScsIGluZm8pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uR2VuZXJhdGU6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjb25zdCBjb2RlID0gQmxvY2tseS5zZXJpYWxpemF0aW9uLndvcmtzcGFjZXMuc2F2ZShCbG9ja2x5LmdldE1haW5Xb3Jrc3BhY2UoKSlcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe2xvZ3M6IFtdfSlcdFx0XHRcdFxuXHRcdFx0XHRcdGJsb2NrbHlJbnRlcnByZXRvci5zdGFydENvZGUoY29kZSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblxuXHR9XG5cblxufSk7XG5cblxuXG5cbiJdfQ==
