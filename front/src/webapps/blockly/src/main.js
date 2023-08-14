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



		const demoWorkspace = Blockly.inject('blocklyDiv',
			{
				media: '../lib/blockly/media/',
				toolbox: document.getElementById('toolbox')
				//horizontalLayout: true,
				//toolboxPosition: 'end'
			}
		)
		let variablesValue
		let procedureBlock
		let variablesDef
		let breakState = ''

		const blockTypeMap = {
			'math_number': async function (block) {
				return block.fields.NUM
			},
			'text': async function (block) {
				return block.fields.TEXT
			},
			'text_append': async function (block) {
				const varId = block.fields.VAR.id
				const text = await evalCode(block.inputs.TEXT)
				variablesValue[varId] += text
			},
			'text_length': async function (block) {
				return await evalCode(block.inputs.VALUE).length
			},

			'variables_set': async function (block) {
				const varId = block.fields.VAR.id
				const value = await evalCode(block.inputs.VALUE)
				console.log({ varId, value })
				variablesValue[varId] = value
			},
			'variables_get': async function (block) {
				const varId = block.fields.VAR.id
				return variablesValue[varId]
			},
			'math_arithmetic': async function (block) {
				const operator = block.fields.OP
				const val1 = await evalCode(block.inputs.A)
				const val2 = await evalCode(block.inputs.B)
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
			'controls_repeat_ext': async function (block) {
				const times = await evalCode(block.inputs.TIMES)
				console.log('TIMES', times)
				for (let i = 0; i < times; i++) {
					await evalCode(block.inputs.DO)
					if (breakState == 'BREAK') {
						breakState = ''
						break
					}
					else if (breakState == 'CONTINUE') {
						breakState = ''
					}
				}
			},
			'text_print': async function (block) {
				log(await evalCode(block.inputs.TEXT))
			},
			'text_prompt_ext': async function(block) {
				const type = block.fields.TYPE
				const label = await evalCode(block.inputs.TEXT)
				console.log({type, label})
				const ret = await $$.ui.showPrompt({label, title: 'Enter value' , attrs: {
					type: type.toLowerCase()
				}})
				return ret
			},
			'text_changeCase': async function (block) {
				const charCase = block.fields.CASE
				console.log({ charCase })
				const value = await evalCode(block.inputs.TEXT)
				switch (charCase) {
					case 'UPPERCASE':
						return value.toUpperCase()
					case 'LOWERCASE':
						return value.toLowerCase()
					case 'TITLECASE':
						return textToTitleCase(value)
				}
			},
			'logic_compare': async function (block) {
				const operator = block.fields.OP
				const val1 = await evalCode(block.inputs.A)
				const val2 = await evalCode(block.inputs.B)
				console.log({ operator, val1, val2 })
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
			'logic_operation': async function (block) {
				const operator = block.fields.OP
				const val1 = await evalCode(block.inputs.A)
				const val2 = await evalCode(block.inputs.B)
				console.log({ operator, val1, val2 })
				switch (operator) {
					case 'AND':
						return val1 && val2
					case 'OR':
						return val1 || val2
					default:
						throw (`Unknown operator '${operator}'`)
				}

			},
			'logic_boolean': async function (block) {
				const test = block.fields.BOOL
				console.log('test', test)
				return (test == 'TRUE')
			},
			'logic_negate': async function (block) {
				const test = await evalCode(block.inputs.BOOL)
				return !test
			},
			'logic_ternary': async function (block) {
				const test = await evalCode(block.inputs.IF)
				if (test) {
					return await evalCode(block.inputs.THEN)
				}
				else {
					return await evalCode(block.inputs.ELSE)
				}
			},
			'controls_if': async function (block) {

				let hasElse = false
				let nbIf = 1

				const { extraState } = block
				if (extraState != undefined) {
					if (extraState.hasElse != undefined) {
						hasElse = extraState.hasElse
					}
					if (extraState.elseIfCount != undefined) {
						nbIf += extraState.elseIfCount
					}
				}
				console.log({ hasElse, nbIf })
				let test = false
				for (let i = 0; i < nbIf; i++) {
					const ifName = `IF${i}`
					const doName = `DO${i}`
					test = await evalCode(block.inputs[ifName])
					console.log(ifName, test)
					if (test) {
						await evalCode(block.inputs[doName])
						break
					}

				}
				if (hasElse && !test) {
					await evalCode(block.inputs.ELSE)
				}

			},
			'controls_whileUntil': async function (block) {
				const mode = block.fields.MODE
				console.log({ mode })
				if (mode == 'WHILE') {
					let test = await evalCode(block.inputs.BOOL)
					while (test) {
						await evalCode(block.inputs.DO)
						test = await evalCode(block.inputs.BOOL)
					}
				}
				else if (mode == 'UNTIL') {
					let test = await evalCode(block.inputs.BOOL)
					while (!test) {
						await evalCode(block.inputs.DO)
						test = await evalCode(block.inputs.BOOL)
					}
				}
				else {
					throw `Unknown mode '${mode}'`
				}
			},
			'controls_for': async function (block) {
				const varId = block.fields.VAR.id
				const from = await evalCode(block.inputs.FROM)
				const to = await evalCode(block.inputs.TO)
				const by = await evalCode(block.inputs.BY)
				console.log({ from, to, by })
				for (let i = from; i <= to; i += by) {
					variablesValue[varId] = i
					await evalCode(block.inputs.DO)
					if (breakState == 'BREAK') {
						breakState = ''
						break
					}
					else if (breakState == 'CONTINUE') {
						breakState = ''
					}
				}
			},
			'procedures_callnoreturn': async function (block) {
				const { extraState } = block
				const functionName = extraState.name
				let nbArgs = 0
				if (extraState.params != undefined) {
					nbArgs = extraState.params.length
				}
				const args = []
				for (let i = 0; i < nbArgs; i++) {
					const argName = `ARG${i}`
					const val = await evalCode(block.inputs[argName])
					args.push(val)
					const varId = getVarId(extraState.params[i])
					variablesValue[varId] = val
				}
				console.log({ functionName, args })

				const { inputs } = procedureBlock[functionName]

				if (inputs != undefined) {
					if (inputs.STACK != undefined) {
						await evalCode(inputs.STACK)
					}

					if (inputs.RETURN != undefined) {
						return await evalCode(inputs.RETURN)
					}
				}


			},
			'procedures_callreturn': async function (block) {
				return this.procedures_callnoreturn(block)
			},
			'controls_flow_statements': async function (block) {
				const flow = block.fields.FLOW
				console.log({ flow })
				breakState = flow
			}
		}

		function textToTitleCase(str) {
			return str.replace(/\S+/g,
				function (txt) { return txt[0].toUpperCase() + txt.substring(1).toLowerCase(); })
		}

		function getVarId(name) {
			return variablesDef.find((e) => e.name == name).id
		}

		function dumpVariables() {
			console.log('dumpVariables:')
			if (variablesDef != undefined) {
				for (const { id, name } of variablesDef) {
					const value = variablesValue[id]
					console.log(`${name}=${value}`)
				}
			}
		}

		async function evalCode(block) {
			if (block == undefined) {
				return
			}
			if (block.type == undefined) {
				if (block.block != undefined) {
					block = block.block
				}
				else if (block.shadow != undefined) {
					block = block.shadow
				}
				else {
					throw `Missig parameter block or shadow`
				}

			}
			console.log('evalCode', block.type)
			const fn = blockTypeMap[block.type]
			if (typeof fn != 'function') {
				throw `function '${block.type}' not implemented yet`
			}
			const ret = await fn.call(blockTypeMap, block)
			if (ret == undefined && breakState == '') {
				await evalCode(block.next)
			}
			return ret
		}

		async function startCode({ blocks, variables }) {
			console.log('startCode', blocks, variables)
			ctrl.setData({ logs: [] })
			variablesValue = {}
			procedureBlock = {}
			variablesDef = variables
			breakState = ''
			for (let block of blocks.blocks) {
				if (block.type == 'procedures_defnoreturn' || block.type == 'procedures_defreturn') {
					const procedureName = block.fields.NAME
					procedureBlock[procedureName] = block
				}
			}
			console.log('procedures:')
			for (const procedureName of Object.keys(procedureBlock)) {
				console.log(procedureName)
			}
			for (let block of blocks.blocks) {
				if (block.type != 'procedures_defnoreturn' && block.type != 'procedures_defreturn') {
					await evalCode(block)
				}
			}
			dumpVariables()
		}

		function log(text) {
			ctrl.model.logs.push(text)
			ctrl.update()
		}

		const ctrl = $$.viewController(elt, {
			data: {
				logs: [],
				getLogs: function () {
					return this.logs.join('<br>')
				}
			},
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




