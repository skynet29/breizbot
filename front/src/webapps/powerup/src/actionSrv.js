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
                    const led = await hubDevice.getLed(hub.PortMap.HUB_LED)
                    await led.setColor(stepDesc.color)
                }
                else if (stepDesc.type == 'RGB') {
                    const led = await hubDevice.getLed(hub.PortMap.HUB_LED)
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
