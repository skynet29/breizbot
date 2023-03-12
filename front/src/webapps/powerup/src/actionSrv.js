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

        /**
         * 
         * @param {Array<ActionSrv.HubDesc>} hubDevices
         * @param {ActionSrv.StepDesc} stepDesc 
         * @param {number} factor
         */
        async function execStep(hubDevices, stepDesc, factor) {
            if (stepDesc.type == 'SLEEP') {
                await $$.util.wait(stepDesc.time)
                return
            }

            const hubDesc = hubDevices.find(e => e.hubId == stepDesc.hub)
            if (hubDesc) {
                //console.log({hubDesc})
                const { hubDevice } = hubDesc

                if (stepDesc.type == 'POWER') {
                    const motor = hubDevice.getMotor(hub.PortMap[stepDesc.port])
                    await motor.setPower(stepDesc.power * factor)
                }
                else if (stepDesc.type == 'SPEED') {
                    const motor = hubDevice.getMotor(hub.PortMap[stepDesc.port])
                    await motor.setSpeed(stepDesc.speed * factor)
                }
                else if (stepDesc.type == 'SPEEDTIME') {
                    const motor = hubDevice.getMotor(hub.PortMap[stepDesc.port])
                    await motor.setSpeedForTime(stepDesc.speed, stepDesc.time, stepDesc.waitFeedback, stepDesc.brakeStyle)
                }               
                else if (stepDesc.type == 'ROTATE') {
                    const motor = hubDevice.getMotor(hub.PortMap[stepDesc.port])
                    await motor.rotateDegrees(stepDesc.angle * factor, stepDesc.speed, stepDesc.waitFeedback)
                }
                else if (stepDesc.type == 'POSITION') {
                    const motor = hubDevice.getMotor(hub.PortMap[stepDesc.port])
                    const calibFactor = hubDevice.calibration[hub.PortMap[stepDesc.port]] || 1
                    console.log({calibFactor})
                    await motor.gotoAngle(stepDesc.angle * factor * calibFactor, stepDesc.speed, stepDesc.waitFeedback)
                }
                else if (stepDesc.type == 'ZERO') {
                    const motor = hubDevice.getMotor(hub.PortMap[stepDesc.port])
                    await motor.resetZero()
                }
                else if (stepDesc.type == 'COLOR') {
                    const led = hubDevice.getLed(hub.PortMap.HUB_LED)
                    await led.setColor(stepDesc.color)
                }
                else if (stepDesc.type == 'RGB') {
                    const led = hubDevice.getLed(hub.PortMap.HUB_LED)
                    await led.setRGBColor(stepDesc.red, stepDesc.green, stepDesc.blue)
                }
                else if (stepDesc.type == 'CALIBRATE') {
                    const motor = hubDevice.getMotor(hub.PortMap[stepDesc.port])
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
                    await motor.setSpeedForTime(stepDesc.speed1 *factor, stepDesc.speed2 * factor, 
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
         * @param {Array<ActionSrv.HubDesc>} hubDevices
         * @param {Array<ActionSrv.ActionDesc>} actions 
         * @param {string} actionName 
         * @param {number} factor
         */
        async function execAction(hubDevices, actions, actionName, factor) {
            console.log('execAction', actionName, factor)
            const actionDesc = actions.find(e => e.name == actionName)
            let {steps} = actionDesc
            if (!Array.isArray(steps)) {
                steps = [actionDesc]
            }

            for(const step of steps) {
                const ret = await execStep(hubDevices, step, factor)
                if (ret != null) {
                    $.notify(ret, 'error')
                    break
                }

            }

            //console.log({actionDesc})
 


        }

        return {
            execAction
        }

    }
});
