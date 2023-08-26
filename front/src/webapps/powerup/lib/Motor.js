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

    setPower(power) {
        console.log('setPower', this.portId, { power })
        return this.writeDirectMode(DeviceMode.POWER, power)
    }


}

module.exports = Motor