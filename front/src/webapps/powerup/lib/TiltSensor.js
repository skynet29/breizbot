//@ts-check

const Device = require('./Device')
const { DeviceMode } = require('./Const')
const {toInt32} = require('./Util')


class TiltSensor extends Device {
    constructor(hubDevice, portId, type) {
        super(hubDevice, portId, type)
    }

    getImpactCount() {
        return this.getValue(DeviceMode.TILT_INPACT_COUNT)
    }

    setImpactCount(count) {
        return this.writeDirectMode(DeviceMode.TILT_INPACT_COUNT, toInt32(count))
    }

    /**
     * 
     * @param {DataView} msg 
     */
    decodeValue(msg) {
        /**@type {Array<number>} */
        const value = super.decodeValue(msg)

        if (this.mode == DeviceMode.TILT_POS) {
            const [yaw, pitch, roll] = value
            return { yaw, pitch, roll }
        }

        return value
    }
}

module.exports = TiltSensor
