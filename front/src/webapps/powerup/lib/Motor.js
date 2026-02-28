//@ts-check

const Device = require('./Device')
const { PortMapNames, DeviceMode } = require('./Const')

const maxPower = 100

class Motor extends Device {

    /**
     * 
     * @param {HubDevice} hubDevice 
     * @param {number} portId 
     */
    constructor(hubDevice, portId, type) {
        super(hubDevice, portId, type)

        this.availableActions = ['FWD', 'BKD', 'STOP']

        this.power = 50
    }

    execAction(actionName) {
        switch (actionName) {
            case 'FWD':
                return this.setPower(this.power)
            case 'BKD':
                return this.setPower(-this.power)
            case 'STOP':
                return this.setPower(0)
            default:
                return super.execAction(actionName)
        }

    }

    async setPower(power, waitStale = false) {
        console.log('setPower', this.portId, { power, waitStale })
        await this.writeDirectMode(DeviceMode.POWER, power)

        this.waitStale = true

        if (waitStale) {
            await new Promise(async (resolve) => {
                this.feedbackCallback = resolve
            })
        }


    }


}

module.exports = Motor