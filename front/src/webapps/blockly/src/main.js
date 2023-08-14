// @ts-check


$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'breizbot.blocklyinterpretor'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager
	 * @param {Breizbot.Services.BlocklyInterpretor.Interface} blocklyInterpretor 
	 */
	init: function (elt, pager, blocklyInterpretor) {



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
					ctrl.setData({logs: []})
					blocklyInterpretor.startCode(info)
				},
				onGenerate: function () {
					const code = Blockly.JavaScript.workspaceToCode(Blockly.getMainWorkspace())
					console.log('code', code)
				}
			}
		})


	}


});




