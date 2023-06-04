//@ts-check

const Device = require('./Device')
const {PortMapNames, DeviceMode} = require('./Const')

class Led extends Device {

    /**
    * 
    * @param {HubDevice} hubDevice 
    * @param {number} portId 
    */
    constructor(hubDevice, portId, type) {
        super(hubDevice, portId, type, PortMapNames[portId])

    }

    setBrightness(brightness) {
        console.log('setBrightness', this.portId, { brightness })
        return this.writeDirectMode(DeviceMode.POWER, false, brightness)
    }


}

module.exports = Led