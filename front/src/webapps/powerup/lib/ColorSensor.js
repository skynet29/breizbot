const Device = require('./Device')


class ColorSensor extends Device {
    constructor(hubDevice, portId, type) {
        super(hubDevice, portId, type)
    }

    async setBrightness (firstSegment, secondSegment, thirdSegment) {
        await this.setMode(0x03, false)

        return this.writeDirectMode(0x03, firstSegment, secondSegment, thirdSegment)
    }
}

module.exports = ColorSensor