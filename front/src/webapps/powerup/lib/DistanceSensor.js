const Device = require('./Device')


class DistanceSensor extends Device {
    constructor(hubDevice, portId, type) {
        super(hubDevice, portId, type)
    }

    async setBrightness (topLeft, bottomLeft, topRight, bottomRight) {
        await this.setMode(0x05, false)

        return this.writeDirectMode(0x05, topLeft, topRight, bottomLeft, bottomRight)
    }
}

module.exports = DistanceSensor