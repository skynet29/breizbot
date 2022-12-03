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
         * @param {HUB.HubDevice} hubDevice 
         * @param {*} actions 
         * @param {string} actionName 
         */
        async function execAction(hubDevice, actions, actionName) {
			console.log('execAction', actionName)
			const actionDesc = actions.find(e => e.name == actionName)
			//console.log({actionDesc})
			if (actionDesc.type == 'POWER') {
				const motor = hubDevice.createMotor(hub.PortMap[actionDesc.port])
				motor.setPower(actionDesc.power)				
			}
			else if (actionDesc.type == 'SPEED') {
				const motor = hubDevice.createMotor(hub.PortMap[actionDesc.port])
				motor.setSpeed(actionDesc.speed)				
			}
			else if (actionDesc.type == 'DBLSPEED') {
				const portId1 = hub.PortMap[actionDesc.port1]
				const portId2 = hub.PortMap[actionDesc.port2]

				const motor = await hubDevice.createDblMotor(portId1, portId2)
				motor.setSpeed(actionDesc.speed1, actionDesc.speed2)				
			}
		}

        return {
            execAction
        }

    }
});
