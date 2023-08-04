// @ts-check

$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, pager) {



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

		javascript.javascriptGenerator.forBlock['play_sound'] = function(block, generator) {
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


		const toolbox = {
			"kind": "flyoutToolbox",
			"contents": [
				{
					kind: 'block',
					type: 'play_sound'
				},
				{
					"kind": "block",
					"type": "controls_if"
				},
				{
					"kind": "block",
					"type": "logic_compare"
				},
				{
					"kind": "block",
					"type": "controls_repeat_ext",
					"inputs": {
						TIMES: {
							shadow: {
								type: 'math_number',
								fields: {
									NUM: 5
								}
							}
						}
					}
				},
				{
					"kind": "block",
					"type": "math_number",
					"fields": {
						"NUM": 123
					}
				},
				{
					"kind": "block",
					"type": "math_arithmetic"
				},
				{
					"kind": "block",
					"type": "text"
				},
				{
					"kind": "block",
					"type": "text_print"
				}
			]
		}

		const demoWorkspace = Blockly.inject('blocklyDiv',
			{
				media: '../lib/blockly/media/',
				toolbox: document.getElementById('toolbox')
				//horizontalLayout: true,
				//toolboxPosition: 'end'
			}
		)

		$$.viewController(elt, {
			data: {},
			events: {
				onSave: function() {
					console.log('onSave')
					const info = Blockly.serialization.workspaces.save(Blockly.getMainWorkspace())
					console.log('info', info)
				},
				onGenerate: function() {
					const code = Blockly.JavaScript.workspaceToCode(Blockly.getMainWorkspace())
					console.log('code', code)
				}
			}
		})


	}


});




