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
		let variablesValue

		const blockTypeMap = {
			'math_number': function (block) {
				return block.fields.NUM
			},
			'text': function (block) {
				return block.fields.TEXT
			},
			'variables_set': function (block) {
				const varId = block.fields.VAR.id
				const value = evalCode(block.inputs.VALUE)
				console.log({ varId, value })
				variablesValue[varId] = value
			},
			'variables_get': function (block) {
				const varId = block.fields.VAR.id
				return variablesValue[varId]
			},
			'math_arithmetic': function (block) {
				const operator = block.fields.OP
				const val1 = evalCode(block.inputs.A)
				const val2 = evalCode(block.inputs.B)
				console.log({ operator, val1, val2 })
				switch (operator) {
					case 'ADD':
						return val1 + val2
					case 'MINUS':
						return val1 - val2
					case 'MULTIPLY':
						return val1 * val2
					case 'DIVIDE':
						return val1 / val2
					case 'POWER':
						return Math.pow(val1, val2)
					default:
						throw (`Unknown operator '${operator}'`)
				}
			},
			'controls_repeat_ext': function (block) {
				const times = evalCode(block.inputs.TIMES)
				console.log('TIMES', times)
				for (let i = 0; i < times; i++) {
					evalCode(block.inputs.DO)
				}
			},
			'text_print': function (block) {
				console.log('PRINT', evalCode(block.inputs.TEXT))
			},
			'logic_compare': function (block) {
				const operator = block.fields.OP
				const val1 = evalCode(block.inputs.A)
				const val2 = evalCode(block.inputs.B)
				switch (operator) {
					case 'EQ':
						return val1 === val2
					case 'NEQ':
						return val1 !== val2
					case 'LT':
						return val1 < val2
					case 'LTE':
						return val1 <= val2
					case 'GT':
						return val1 > val2
					case 'GTE':
						return val1 >= val2
					default:
						throw (`Unknown operator '${operator}'`)

				}
			},
			'logic_boolean': function(block) {
				const test = block.fields.BOOL
				console.log('test', test)
				return (test == 'TRUE')
			},
			'controls_if': function(block) {

				let hasElse = false
				let nbIf = 1

				const {extraState} = block
				if (extraState != undefined) {
					if (extraState.hasElse != undefined) {
						hasElse = extraState.hasElse
					}
					if (extraState.elseIfCount != undefined) {
						nbIf += extraState.elseIfCount
					}
				}
				console.log({hasElse, nbIf})
				let test = false
				for(let i = 0; i < nbIf; i++) {
					const ifName = `IF${i}`
					const doName = `DO${i}`
					test = evalCode(block.inputs[ifName])
					console.log(ifName, test)
					if (test) {
						evalCode(block.inputs[doName])
						break
					}

				}
				if (hasElse && !test) {
					evalCode(block.inputs.ELSE)
				}

			}
		}

		/**
		 * 
		 * @param {string} varId 
		 * @param {Array<{name: string, id: string}>} variables 
		 * @returns 
		 */
		function getVarName(varId, variables) {
			return variables.find((e) => e.id == varId).name
		}

		function dumpVariables(variables) {
			console.log('dumpVariables:')
			for (const [varId, value] of Object.entries(variablesValue)) {
				const varName = getVarName(varId, variables)
				console.log(`${varName}=${value}`)
			}
		}

		function evalCode(block) {
			if (block == undefined) {
				return
			}
			if (block.type == undefined) {
				block = block.block
			}
			console.log('evalCode', block.type)
			const fn = blockTypeMap[block.type]
			if (typeof fn != 'function') {
				throw `function '${block.type}' not implemented yet`
			}
			const ret = fn(block)
			if (ret == undefined) {
				evalCode(block.next)
			}
			return ret
		}

		function startCode({ blocks, variables }) {
			console.log('startCode', blocks, variables)
			variablesValue = {}
			for (let block of blocks.blocks) {
				evalCode(block)
			}
			dumpVariables(variables)
		}



		$$.viewController(elt, {
			data: {},
			events: {
				onSave: function () {
					console.log('onSave')
					const info = Blockly.serialization.workspaces.save(Blockly.getMainWorkspace())
					startCode(info)
				},
				onGenerate: function () {
					const code = Blockly.JavaScript.workspaceToCode(Blockly.getMainWorkspace())
					console.log('code', code)
				}
			}
		})


	}


});




