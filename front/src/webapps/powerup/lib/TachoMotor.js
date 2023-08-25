//@ts-check

const Motor = require('./Motor')
const {PortMapNames, DeviceMode, BrakingStyle} = require('./Const')
const {toInt32, toInt16} = require('./Util')

const maxPower = 100

class TachoMotor extends Motor {

    /**
     * 
     * @param {HubDevice} hubDevice 
     * @param {number} portId 
     */
    constructor(hubDevice, portId, type) {
        super(hubDevice, portId, type)
    }

    setSpeed(speed) {
        console.log('setSpeed', this.portId, { speed })
        if (speed == 0) {
            return this.setPower(0)
        }
        return this.writePortCommand(false, 0x07, speed, maxPower, 0)
    }

    rotateDegrees(degrees, speed, waitFeedback, brakingStyle = BrakingStyle.BRAKE) {
        console.log('rotateDegrees', this.portId, { degrees, speed, waitFeedback, brakingStyle })
        return this.writePortCommand(waitFeedback, 0x0B, toInt32(degrees), speed, maxPower, brakingStyle)
    }

    /**
     * 
     * @param {number} angle 
     * @param {number} speed 
     * @param {boolean} waitFeedback 
     * @param {number} brakingStyle 
     * @returns 
     */
    gotoAngle(angle, speed, waitFeedback, brakingStyle = BrakingStyle.BRAKE) {
        console.log('gotoAngle', this.portId, { angle, speed, waitFeedback, brakingStyle })

        if (this.calibrationValue) {
            angle *= this.calibrationValue
        }

        return this.writePortCommand(waitFeedback, 0x0D, toInt32(angle), speed, maxPower, brakingStyle)
    }

    setSpeedForTime(speed, time, waitFeedback = false, brakingStyle = BrakingStyle.BRAKE) {

        console.log('setSpeedForTime', this.portId, { speed, time, waitFeedback, brakingStyle })
        return this.writePortCommand(waitFeedback, 0x09, toInt16(time), speed, maxPower, brakingStyle)
    }

    resetZero() {
        console.log('resetZero', this.portId)
        return this.writeDirectMode(DeviceMode.ROTATION, true, 0x00, 0x00, 0x00, 0x00)
    }

    getSpeed() {
        return this.getValue(DeviceMode.SPEED)
    }

    getPosition() {
        return this.getValue(DeviceMode.ROTATION)
    }

    getAbsolutePosition() {
        return this.getValue(DeviceMode.ABSOLUTE)
    }

    async calibrate() {

        console.log('calibrate', this.portId)
        this.setPower(50)
        await this.waitTestValue(DeviceMode.SPEED, (value) => value > 10)
        await this.waitTestValue(DeviceMode.SPEED, (value) => value == 0)


        this.setPower(0)

        await $$.util.wait(1000)

        // await this.hubDevice.setPortFormat(this.portId, DeviceMode.ROTATION)
        // let value = await this.hubDevice.getPortValue(this.portId)
        // console.log(value)	

        await this.resetZero()


        this.setPower(-50)
        await this.waitTestValue(DeviceMode.SPEED, (value) => Math.abs(value) > 10)
        await this.waitTestValue(DeviceMode.SPEED, (value) => value == 0)

        this.setPower(0)
        const value = await this.getValue(DeviceMode.ROTATION)
        console.log(value)
        const offset = Math.floor(value / 2)
        console.log({ offset })
        await this.gotoAngle(offset, 10, true)
        await this.resetZero()
        this.calibrationValue = Math.abs(offset)
    }

    /**
     * 
     * @param {DataView} msg 
     */
    decodeValue(msg) {
        let value
        switch (this.mode) {
            case DeviceMode.ABSOLUTE:
                value = msg.getInt16(4, true)
                break
            case DeviceMode.ROTATION:
                value = msg.getInt32(4, true)
                break
            case DeviceMode.SPEED:
                value = msg.getInt8(4)
                break

        }
        return value
    }

}

module.exports = TachoMotor