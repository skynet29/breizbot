//@ts-check
$$.service.registerService('breizbot.blocklyinterpretor', {

    init: function (config) {

        let variablesValue
        let procedureBlock
        let breakState = ''
        let logFunction

        function mathRandomInt(a, b) {
            if (a > b) {
                // Swap a and b to ensure a is smaller.
                const c = a;
                a = b;
                b = c;
            }
            return Math.floor(Math.random() * (b - a + 1) + a);
        }

        function mathRandomList(list) {
            const x = Math.floor(Math.random() * list.length);
            return list[x];
        }

        function mathMean(myList) {
            return myList.reduce(function (x, y) { return x + y; }, 0) / myList.length;
        }

        function mathMedian(myList) {
            const localList = myList.filter(function (x) { return typeof x === 'number'; });
            if (!localList.length) return null;
            localList.sort(function (a, b) { return b - a; });
            if (localList.length % 2 === 0) {
                return (localList[localList.length / 2 - 1] + localList[localList.length / 2]) / 2;
            } else {
                return localList[(localList.length - 1) / 2];
            }
        }

        function mathCompare(operator, val1, val2) {
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
        }

        const blockTypeMap = {
            'math_number': async function (block, localVariables) {
                return block.fields.NUM
            },
            'text': async function (block, localVariables) {
                return block.fields.TEXT
            },
            'text_append': async function (block, localVariables) {
                const varId = block.fields.VAR.id
                const text = await evalCode(block.inputs.TEXT, localVariables)
                variablesValue[varId] += text
            },
            'text_join': async function (block, localVariables) {
                const nbItems = block.extraState.itemCount
                let ret = ''
                if (block.inputs != undefined) {
                    for (let i = 0; i < nbItems; i++) {
                        const itemName = `ADD${i}`
                        if (block.inputs[itemName] != undefined) {
                            const text = await evalCode(block.inputs[itemName], localVariables)
                            ret += text
                        }
                    }
                }
                return ret
            },
            'text_length': async function (block, localVariables) {
                const text = await evalCode(block.inputs.VALUE, localVariables)
                if (typeof text != 'string') {
                    throw 'in textLength text is not a string !'
                }
                return text.length
            },

            'global_declaration': async function (block) {
                const value = await evalCode(block.inputs.VALUE)
                const varName = block.fields.NAME
                console.log(`${varName} = ${value}`)
                variablesValue[varName] = value
            },
            'lexical_variable_get': async function (block, localVariables) {
                /**@type {string} */
                const varName = block.fields.VAR
                return (varName.startsWith('global ')) ?
                    variablesValue[varName.substring(7)] : localVariables[varName]
            },
            'lexical_variable_set': async function (block, localVariables) {
                const varName = block.fields.VAR
                const value = await evalCode(block.inputs.VALUE, localVariables)
                if (varName.startsWith('global ')) {
                    variablesValue[varName.substring(7)] = value
                }
                else {
                    localVariables[varName] = value
                }
            },
            'local_declaration_statement': async function (block, localVariables) {
                const { fields, inputs } = block
                if (inputs.STACK == undefined)
                    return

                const argsName = getArgNames(fields)
                //console.log({ argsName })
                const values = {}
                for (let i = 0; i < argsName.length; i++) {
                    const valueName = 'DECL' + i
                    if (inputs[valueName] != undefined) {
                        const value = await evalCode(inputs[valueName], localVariables)
                        values[argsName[i]] = value
                    }
                }

                for (const [varName, value] of Object.entries(values)) {
                    localVariables[varName] = value
                }

                await evalCode(inputs.STACK, localVariables)

                for (const varName of Object.keys(values)) {
                    delete localVariables[varName]
                }

            },
            'math_arithmetic': async function (block, localVariables) {
                const operator = block.fields.OP
                const val1 = await evalCode(block.inputs.A, localVariables)
                const val2 = await evalCode(block.inputs.B, localVariables)
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
            'math_single': async function (block, localVariables) {
                const operator = block.fields.OP
                const val = await evalCode(block.inputs.NUM, localVariables)
                console.log({ operator, val })
                switch (operator) {
                    case 'ROOT':
                        return Math.sqrt(val)
                    case 'ABS':
                        return Math.abs(val)
                    case 'NEG':
                        return -val
                    case 'LN':
                        return Math.log(val)
                    case 'LOG10':
                        return Math.log10(val)
                    case 'EXP':
                        return Math.exp(val)
                    case 'POW10':
                        return Math.pow(10, val)
                    default:
                        throw (`Unknown operator '${operator}'`)
                }
            },
            'math_trig': async function (block, localVariables) {
                const operator = block.fields.OP
                const val = await evalCode(block.inputs.NUM, localVariables)
                console.log({ operator, val })
                switch (operator) {
                    case 'SIN':
                        return Math.sin(val / 180 * Math.PI)
                    case 'COS':
                        return Math.cos(val / 180 * Math.PI)
                    case 'TAN':
                        return Math.tan(val / 180 * Math.PI)
                    case 'ASIN':
                        return Math.asin(val) / Math.PI * 180
                    case 'ACOS':
                        return Math.acos(val) / Math.PI * 180
                    case 'ATAN':
                        return Math.atan(val) / Math.PI * 180
                    default:
                        throw (`Unknown operator '${operator}'`)
                }
            },
            'math_random_int': async function (block, localVariables) {
                const from = await evalCode(block.inputs.FROM, localVariables)
                const to = await evalCode(block.inputs.TO, localVariables)
                return mathRandomInt(from, to)
            },
            'math_round': async function (block, localVariables) {
                const operator = block.fields.OP
                const val = await evalCode(block.inputs.NUM, localVariables)
                console.log({ operator, val })
                switch (operator) {
                    case 'ROUND':
                        return Math.round(val)
                    case 'ROUNDUP':
                        return Math.ceil(val)
                    case 'ROUNDDOWN':
                        return Math.floor(val)
                    default:
                        throw (`Unknown operator '${operator}'`)
                }
            },
            'math_constant': async function (block, localVariables) {
                const c = block.fields.CONSTANT
                switch (c) {
                    case 'PI':
                        return Math.PI
                    case 'E':
                        return Math.E
                    case 'GOLDEN_RATIO':
                        return (1 + Math.sqrt(5)) / 2
                    case 'SQRT2':
                        return Math.SQRT2
                    case 'SQRT1_2':
                        return Math.SQRT1_2
                    case 'INFINITY':
                        return Infinity
                    default:
                        throw (`Unknown constante '${c}'`)
                }
            },
            'math_on_list': async function (block, localVariables) {
                const operator = block.fields.OP
                const list = await evalCode(block.inputs.LIST, localVariables)
                if (!Array.isArray(list)) {
                    throw 'in mathList list is not an Array !'
                }
                switch (operator) {
                    case 'SUM':
                        return list.reduce(function (x, y) { return x + y; }, 0)
                    case 'MIN':
                        return Math.min.apply(null, list)
                    case 'MAX':
                        return Math.max.apply(null, list)
                    case 'AVERAGE':
                        return mathMean(list)
                    case 'MEDIAN':
                        return mathMedian(list)
                    case 'RANDOM':
                        return mathRandomList(list)
                    default:
                        throw `operator '${operator}' is not implemented`
                }
            },
            'controls_repeat_ext': async function (block, localVariables) {
                const times = await evalCode(block.inputs.TIMES, localVariables)
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
            'text_print': async function (block, localVariables) {
                if (typeof logFunction == 'function') {
                    logFunction(await evalCode(block.inputs.TEXT, localVariables))
                }
            },
            'text_prompt_ext': async function (block, localVariables) {
                const type = block.fields.TYPE
                const label = await evalCode(block.inputs.TEXT, localVariables)
                console.log({ type, label })
                const ret = await $$.ui.showPrompt({
                    label, title: 'Enter value', attrs: {
                        type: type.toLowerCase()
                    }
                })
                return ret
            },
            'text_changeCase': async function (block, localVariables) {
                const charCase = block.fields.CASE
                console.log({ charCase })
                const value = await evalCode(block.inputs.TEXT, localVariables)
                if (typeof value != 'string') {
                    throw 'in textLength text is not a string !'
                }
                switch (charCase) {
                    case 'UPPERCASE':
                        return value.toUpperCase()
                    case 'LOWERCASE':
                        return value.toLowerCase()
                    case 'TITLECASE':
                        return textToTitleCase(value)
                }
            },
            'logic_compare': async function (block, localVariables) {
                const operator = block.fields.OP
                const val1 = await evalCode(block.inputs.A, localVariables)
                const val2 = await evalCode(block.inputs.B, localVariables)
                console.log({ operator, val1, val2 })
                return mathCompare(operator, val1, val2)
            },
            'logic_operation': async function (block, localVariables) {
                const operator = block.fields.OP
                const val1 = await evalCode(block.inputs.A, localVariables)
                const val2 = await evalCode(block.inputs.B, localVariables)
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
            'logic_boolean': async function (block, localVariables) {
                const test = block.fields.BOOL
                console.log('test', test)
                return (test == 'TRUE')
            },
            'logic_negate': async function (block, localVariables) {
                const test = await evalCode(block.inputs.BOOL, localVariables)
                return !test
            },
            'logic_ternary': async function (block, localVariables) {
                const test = await evalCode(block.inputs.IF, localVariables)
                if (test) {
                    return await evalCode(block.inputs.THEN, localVariables)
                }
                else {
                    return await evalCode(block.inputs.ELSE, localVariables)
                }
            },
            'controls_if': async function (block, localVariables) {

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
                    test = await evalCode(block.inputs[ifName], localVariables)
                    console.log(ifName, test)
                    if (test) {
                        await evalCode(block.inputs[doName], localVariables)
                        break
                    }

                }
                if (hasElse && !test) {
                    await evalCode(block.inputs.ELSE, localVariables)
                }

            },
            'controls_whileUntil': async function (block, localVariables) {
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
            'controls_forEach': async function (block, localVariables) {
                const varName = block.fields.VAR
                const list = await evalCode(block.inputs.LIST, localVariables)
                console.log({ varName, list })
                if (!Array.isArray(list)) {
                    throw 'in forEach list is not an Array !'
                }
                for (const item of list) {
                    localVariables[varName] = item
                    await evalCode(block.inputs.DO, localVariables)
                    if (breakState == 'BREAK') {
                        breakState = ''
                        break
                    }
                    else if (breakState == 'CONTINUE') {
                        breakState = ''
                    }
                }
                delete localVariables[varName]
            },
            'controls_for': async function (block, localVariables) {
                const varName = block.fields.VAR
                const from = await evalCode(block.inputs.START, localVariables)
                const to = await evalCode(block.inputs.END, localVariables)
                const by = await evalCode(block.inputs.STEP, localVariables)
                console.log({ from, to, by, varName })
                for (let i = from; i <= to; i += by) {
                    localVariables[varName] = i
                    await evalCode(block.inputs.DO, localVariables)
                    if (breakState == 'BREAK') {
                        breakState = ''
                        break
                    }
                    else if (breakState == 'CONTINUE') {
                        breakState = ''
                    }
                }
                delete localVariables[varName]
            },
            'procedures_callnoreturn': async function (block, localVariables) {
                const functionName = block.fields.PROCNAME

                const { inputs, fields } = procedureBlock[functionName]


                if (inputs != undefined) {

                    const argNames = getArgNames(fields)
                    console.log({ argNames })

                    const newContext = {}
                    for (let i = 0; i < argNames.length; i++) {
                        const argName = `ARG${i}`
                        const value = await evalCode(block.inputs[argName], localVariables)
                        newContext[argNames[i]] = value
                    }

                    //console.log({ functionName, newContext })

                    if (inputs.STACK != undefined) {
                        await evalCode(inputs.STACK, newContext)
                    }

                    if (inputs.RETURN != undefined) {
                        return await evalCode(inputs.RETURN, newContext)
                    }
                }

            },
            'procedures_callreturn': async function (block, localVariables) {
                return this.procedures_callnoreturn(block, localVariables)
            },
            'controls_flow_statements': async function (block, localVariables) {
                const flow = block.fields.FLOW
                console.log({ flow })
                breakState = flow
            },
            'lists_create_with': async function (block, localVariables) {
                const { inputs, extraState } = block
                const { itemCount } = extraState
                console.log({ itemCount })
                const ret = []
                for (let i = 0; i < itemCount; i++) {
                    const argName = 'ADD' + i
                    if (inputs != undefined && inputs[argName] != undefined) {
                        ret[i] = await evalCode(inputs[argName], localVariables)
                    }
                    else {
                        ret[i] = undefined
                    }
                }

                console.log({ ret })
                return ret
            },
            'lists_getIndex': async function (block, localVariables) {
                const { fields, inputs } = block
                const mode = fields.MODE
                const where = fields.WHERE
                /**@type {Array<any>} */
                const list = await evalCode(inputs.VALUE, localVariables)
                console.log({ list, mode, where })
                if (!Array.isArray(list)) {
                    throw 'in getIndex list is not an Array !'
                }
                let ret
                if (mode == 'GET') {
                    if (where == 'FROM_START') {
                        const idx = await evalCode(inputs.AT, localVariables)
                        console.log({ idx })
                        ret = list[idx - 1]
                    }
                    else if (where == 'FROM_END') {
                        const idx = await evalCode(inputs.AT, localVariables)
                        console.log({ idx })
                        ret = list.slice(-idx)[0]
                    }
                    else if (where == 'FIRST') {
                        ret = list[0]
                    }
                    else if (where == 'LAST') {
                        ret = list.slice(-1)[0]
                    }
                }
                else if (mode == 'GET_REMOVE' || mode == 'REMOVE') {
                    if (where == 'FROM_START') {
                        const idx = await evalCode(inputs.AT, localVariables)
                        console.log({ idx })
                        ret = list.splice(idx - 1, 1)[0]
                    }
                    else if (where == 'FROM_END') {
                        const idx = await evalCode(inputs.AT, localVariables)
                        console.log({ idx })
                        ret = list.splice(-idx, 1)[0]
                    }
                    else if (where == 'FIRST') {
                        ret = list.shift()
                    }
                    else if (where == 'LAST') {
                        ret = list.pop()
                    }
                }

                console.log({ ret })

                return ret
            },
            'lists_setIndex': async function (block, localVariables) {
                const { fields, inputs } = block
                const mode = fields.MODE
                const where = fields.WHERE
                /**@type {Array<any>} */
                const list = await evalCode(inputs.LIST, localVariables)
                const newValue = await evalCode(inputs.TO, localVariables)

                console.log({ list, mode, where })
                if (!Array.isArray(list)) {
                    throw 'in setIndex list is not an Array !'
                }
                let ret
                if (mode == 'SET') {
                    if (where == 'FROM_START') {
                        const idx = await evalCode(inputs.AT, localVariables)

                        console.log({ idx })
                        list[idx - 1] = newValue
                    }
                    else if (where == 'FROM_END') {
                        const idx = await evalCode(inputs.AT, localVariables)

                        console.log({ idx })
                        list[list.length - idx] = newValue
                    }
                    else if (where == 'FIRST') {
                        list[0] = newValue
                    }
                    else if (where == 'LAST') {
                        list[length - 1] = newValue
                    }
                }
                else if (mode == 'INSERT') {
                    if (where == 'FROM_START') {
                        const idx = await evalCode(inputs.AT, localVariables)
                        console.log({ idx })
                        list.splice(idx - 1, 0, newValue)
                    }
                    else if (where == 'FROM_END') {
                        const idx = await evalCode(inputs.AT, localVariables)
                        console.log({ idx })
                        list.splice(list.length - idx, 0, newValue)
                    }
                    else if (where == 'FIRST') {
                        list.unshift(newValue)
                    }
                    else if (where == 'LAST') {
                        list.push(newValue)
                    }
                }

            },
            'lists_length': async function (block, localVariables) {
                const { inputs } = block
                /**@type {Array<any>} */
                const list = await evalCode(inputs.VALUE, localVariables)
                if (!Array.isArray(list)) {
                    throw 'in getLength list is not an Array !'
                }
                return list.length
            }
        }

        function textToTitleCase(str) {
            return str.replace(/\S+/g,
                function (txt) { return txt[0].toUpperCase() + txt.substring(1).toLowerCase(); })
        }

        function getVarValue(varName) {
            return variablesValue[varName]
        }

        function dumpVariables() {
            console.log('dumpVariables:')
            for (const [name, value] of Object.entries(variablesValue)) {
                console.log(`${name}=${value}`)
            }
        }


        async function evalCode(block, localVariables) {
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
            console.log('evalCode', block.type, localVariables)
            const fn = blockTypeMap[block.type]
            if (typeof fn != 'function') {
                console.log('block', block)
                throw `function '${block.type}' not implemented yet`
            }
            const ret = await fn.call(blockTypeMap, block, localVariables)
            if (block.next != undefined && breakState == '') {
                await evalCode(block.next, localVariables)
            }
            return ret
        }

        function getFunctionNames({ blocks }) {
            const ret = []
            if (blocks && blocks.blocks) {
                for (let block of blocks.blocks) {
                    if (block.type == 'procedures_defnoreturn' || block.type == 'procedures_defreturn') {
                        const procedureName = block.fields.NAME
                        ret.push(procedureName)
                    }
                }
            }

            return ret
        }

        function getArgNames(fields) {
            const argNames = []
            for (let i = 0, done = false; !done; i++) {
                const argName = fields['VAR' + i]
                if (argName != undefined) {
                    argNames.push(argName)
                }
                else {
                    done = true
                }
            }
            return argNames
        }

        async function callFunction(functionName, ...functionArgs) {
            console.log('callFunction', functionName, functionArgs)
            const block = procedureBlock[functionName]
            if (block == undefined) {
                throw `function '${functionName}' does not exists !`
            }

            const { inputs, fields } = block

            if (inputs != undefined) {

                const argNames = getArgNames(fields)

                const newContext = {}
                for (let i = 0; i < argNames.length; i++) {
                    newContext[argNames[i]] = functionArgs[i]
                }

                console.log({ functionName, newContext })

                if (inputs.STACK != undefined) {
                    await evalCode(inputs.STACK, newContext)
                }
            }
        }

        async function startCode({ blocks }) {
            console.log('startCode')

            variablesValue = {}
            procedureBlock = {}
            const codeBlocks = blocks.blocks
            breakState = ''


            for (const block of codeBlocks) {
                if (block.type == 'global_declaration') {
                    await evalCode(block)
                }
                else if (block.type == 'procedures_defnoreturn' || block.type == 'procedures_defreturn') {
                    const procedureName = block.fields.NAME
                    procedureBlock[procedureName] = block
                }
            }

            console.log('procedures:')
            for (const procedureName of Object.keys(procedureBlock)) {
                console.log(procedureName)
            }

            // for (const block of codeBlocks) {
            //     if (block.type != 'procedures_defnoreturn' &&
            //         block.type != 'procedures_defreturn' &&
            //         block.type != 'global_declaration') {
            //         await evalCode(block, {})
            //     }
            // }
            dumpVariables()
            callFunction('main')
        }

        function setLogFunction(fn) {
            logFunction = fn
        }

        function addBlockType(typeName, fn) {
            blockTypeMap[typeName] = fn
        }

        return {
            startCode,
            setLogFunction,
            evalCode,
            dumpVariables,
            addBlockType,
            getVarValue,
            getFunctionNames,
            callFunction,
            mathCompare
        }
    }
});


