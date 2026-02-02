//@ts-check

const Device = require('./Device')
const {PortMapNames, DeviceMode} = require('./Const')

const maxPower = 100

class Motor extends Device {

    /**
     * 
     * @param {HubDevice} hubDevice 
     * @param {number} portId 
     */
    constructor(hubDevice, portId, type) {
        super(hubDevice, portId, type)
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