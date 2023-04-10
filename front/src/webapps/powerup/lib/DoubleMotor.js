//@ts-check

const Device = require('./Device')
const {BrakingStyle} = require('./Const')
const {toInt16, toInt32} = require('./Util')

const maxPower = 100

class DoubleMotor extends Device {


    constructor(hubDevice, portId, name) {
        super(hubDevice, portId, 'Virtual Device', name)

    }

    /**
     * 
     * @param {number} speed1 
     * @param {number} speed2 
     * @returns 
     */
    setSpeed(speed1, speed2) {
        return this.writePortCommand(false, 0x08, speed1, speed2, maxPower, 0)
    }

    setSpeedForTime(speed1, speed2, time, waitFeedback = false, brakingStyle = BrakingStyle.BRAKE) {

        console.log('setSpeedForTime', this.portId, { speed1, speed2, time, waitFeedback, brakingStyle })
        return this.writePortCommand(this.portId, waitFeedback, 0x0A, toInt16(time), speed1, speed2, maxPower, brakingStyle)
    }

    rotateDegrees(degrees, speed1, speed2, waitFeedback, brakingStyle = BrakingStyle.BRAKE) {
        console.log('rotateDegrees', this.portId, { degrees, speed1, speed2, waitFeedback, brakingStyle })
        return this.writePortCommand(waitFeedback, 0x0C, toInt32(degrees), speed1, speed2, maxPower, brakingStyle)
    }

    gotoAngle(angle1, angle2, speed, waitFeedback, brakingStyle = BrakingStyle.BRAKE) {
        console.log('gotoAngle', this.portId, { angle1, angle2, speed, waitFeedback, brakingStyle })

        return this.writePortCommand(waitFeedback, 0x0E, toInt32(angle1), toInt32(angle2), speed, maxPower, brakingStyle)
    }
}

module.exports = DoubleMotor