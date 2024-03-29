//@ts-check

const Device = require('./Device')
const {PortMapNames} = require('./Const')

const DeviceMode = {
    COLOR: 0x00,
    RGB: 0x01
}

class RgbLed extends Device {

    /**
    * 
    * @param {HubDevice} hubDevice 
    * @param {number} portId 
    */
    constructor(hubDevice, portId, type) {
        super(hubDevice, portId, type)

    }

    async setColor(color) {
        console.log('setColor', this.portId, { color })
        await this.setMode(DeviceMode.COLOR, false)
        return this.writeDirectMode(DeviceMode.COLOR, color)
    }

    async setRGBColor(r, g, b) {
        console.log('setColor', this.portId, { r, g, b })
        await this.setMode(DeviceMode.RGB, false)
        return this.writeDirectMode(DeviceMode.RGB, r, g, b)
    }
}

module.exports = RgbLed