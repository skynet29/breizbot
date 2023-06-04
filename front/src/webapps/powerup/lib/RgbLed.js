//@ts-check

const Device = require('./Device')
const {PortMapNames, DeviceMode} = require('./Const')

class RgbLed extends Device {

    /**
    * 
    * @param {HubDevice} hubDevice 
    * @param {number} portId 
    */
    constructor(hubDevice, portId, type) {
        super(hubDevice, portId, type, PortMapNames[portId])

    }

    async setColor(color) {
        console.log('setColor', this.portId, { color })
        await this.setMode(DeviceMode.COLOR, false)
        return this.writeDirectMode(DeviceMode.COLOR, false, color)
    }

    async setRGBColor(r, g, b) {
        console.log('setColor', this.portId, { r, g, b })
        await this.setMode(DeviceMode.RGB, false)
        return this.writeDirectMode(DeviceMode.RGB, false, r, g, b)
    }
}

module.exports = RgbLed