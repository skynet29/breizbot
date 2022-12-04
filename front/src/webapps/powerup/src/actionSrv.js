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
         * @param {Array<ActionSrv.ActionDesc>} actions 
         * @param {string} actionName 
         * @param {number} factor
         */
        async function execAction(hubDevices, actions, actionName, factor) {
            console.log('execAction', actionName, factor)
            const actionDesc = actions.find(e => e.name == actionName)
            //console.log({actionDesc})
            const hubDesc = hubDevices.find(e => e.hubId == actionDesc.hub)
            if (hubDesc) {
                //console.log({hubDesc})
                const { hubDevice } = hubDesc

                if (actionDesc.type == 'POWER') {
                    const motor = hubDevice.createMotor(hub.PortMap[actionDesc.port])
                    motor.setPower(actionDesc.power * factor)
                }
                else if (actionDesc.type == 'SPEED') {
                    const motor = hubDevice.createMotor(hub.PortMap[actionDesc.port])
                    motor.setSpeed(actionDesc.speed * factor)
                }
                else if (actionDesc.type == 'DBLSPEED') {
                    const portId1 = hub.PortMap[actionDesc.port1]
                    const portId2 = hub.PortMap[actionDesc.port2]

                    const motor = await hubDevice.createDblMotor(portId1, portId2)
                    motor.setSpeed(actionDesc.speed1 *factor, actionDesc.speed2 * factor)
                }
            }
            else {
                $.notify(`Hub ${actionDesc.hub} is not connected`, 'error')
            }


        }

        return {
            execAction
        }

    }
});
