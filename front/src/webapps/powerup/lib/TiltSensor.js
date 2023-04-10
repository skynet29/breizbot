//@ts-check

const Device = require('./Device')
const {PortMapNames, DeviceMode} = require('./Const')

class TiltSensor extends Device {
    constructor(hubDevice, portId, type) {
        super(hubDevice, portId, type, PortMapNames[portId])
    }

    /**
     * 
     * @param {DataView} msg 
     */
    decodeValue(msg) {
        let value
        switch (this.mode) {
            case DeviceMode.TILT_POS:
                value = {
                    yaw: msg.getInt16(4, true),
                    pitch: msg.getInt16(6, true),
                    roll: msg.getInt16(8, true)
                }
                break
        }
        return value
    }
}

module.exports = TiltSensor
