//@ts-check

const Motor = require('./Motor')
const { PortMapNames, DeviceMode, BrakingStyle } = require('./Const')
const { toInt32, toInt16 } = require('./Util')

const maxPower = 100


class TachoMotor extends Motor {

    /**
     * 
     * @param {HubDevice} hubDevice 
     * @param {number} portId 
     */
    constructor(hubDevice, portId, type) {
        super(hubDevice, portId, type)
        this.calibrated = false
        this.minAngle = 0
        this.maxAngle = 0
    }

    setSpeed(speed) {
        console.log('#setSpeed', this.portId, { speed })
        if (speed == 0) {
            return this.setPower(0)
        }
        return this.writePortCommand(true, 0x07, speed, maxPower, 0)
    }

    rotateDegrees(degrees, speed, waitEnd, brakingStyle = BrakingStyle.BRAKE) {
        console.log('rotateDegrees', this.portId, { degrees, speed, waitEnd, brakingStyle })
        return this.writePortCommand(waitEnd, 0x0B, toInt32(degrees), speed, maxPower, brakingStyle)
    }

    /**
     * 
     * @param {number} angle 
     * @param {number} speed 
     * @param {boolean} waitEnd 
     * @param {number} brakingStyle 
     * @returns 
     */
    gotoAngle(angle, speed, waitEnd, brakingStyle = BrakingStyle.BRAKE) {
        console.log('gotoAngle', this.portId, { angle, speed, waitEnd, brakingStyle })

        return this.writePortCommand(waitEnd, 0x0D, toInt32(angle), speed, maxPower, brakingStyle)
    }

    async gotoAbsPosition(angle, speed, waitEnd, brakingStyle = BrakingStyle.BRAKE) {
        const absPos = await this.getAbsolutePosition()
        console.log('gotoAbsPosition', this.portId, { angle, absPos, speed, waitEnd, brakingStyle })

        let diff = angle - absPos
        if (diff < 0) {
            speed = -speed
        }
        diff = Math.abs(diff)
        return this.rotateDegrees(diff, speed, waitEnd, brakingStyle)

    }

    setSpeedForTime(speed, time, waitEnd = false, brakingStyle = BrakingStyle.BRAKE) {

        console.log('setSpeedForTime', this.portId, { speed, time, waitEnd, brakingStyle })
        return this.writePortCommand(waitEnd, 0x09, toInt16(time), speed, maxPower, brakingStyle)
    }

    resetZero() {
        console.log('resetZero', this.portId)
        return this.writeDirectMode(DeviceMode.ROTATION, 0x00, 0x00, 0x00, 0x00)
    }

    getSpeed() {
        return this.getValue(DeviceMode.SPEED)
    }

    getPosition() {
        return this.getValue(DeviceMode.ROTATION)
    }

    async getAbsolutePosition() {
        const angle = await this.getValue(DeviceMode.ABSOLUTE)
        return (angle < 0) ? angle + 360 : angle
    }


    async calibrate(power = 30) {
        console.log('calibrate')
        await this.readInfo()

        await this.setPower(-power, true)

        await $$.util.wait(1000)

        this.minAngle = await this.getValue(DeviceMode.ROTATION);

        //await this.setPower(0)


        await this.setPower(power, true)

        await $$.util.wait(1000)

        this.maxAngle = await this.getValue(DeviceMode.ROTATION);
        console.log({ minAngle: this.minAngle, maxAngle: this.maxAngle })

        this.calibrated = true
        this.gotoCenter()

        //await this.setPower(0)

    }

    async gotoCenter() {
        if (this.calibrated) {
            const middleAngle = (this.maxAngle + this.minAngle) / 2
            await this.gotoAngle(middleAngle, 10, true)
        }
        else {
            console.error('Motor not calibrated')
        }

    }

    async gotoLeft() {
        if (this.calibrated) {
            await this.gotoAngle(this.maxAngle, 10, true)
        }
        else {
            console.error('Motor not calibrated')
        }
    }

    async gotoRight() {
        if (this.calibrated) {
            await this.gotoAngle(this.minAngle, 10, true)
        }
        else {
            console.error('Motor not calibrated')
        }
    }

    async calibrate3(power = 30) {
        console.log('calibrate')
        await this.setPower(-power)

        const minAngle = await this.waitTestValue(
            DeviceMode.ROTATION,
            makeStallDetector()
        )


        await this.setPower(0)
        console.log({ minAngle })


        await this.setPower(power)

        const maxAngle = await this.waitTestValue(
            DeviceMode.ROTATION,
            makeStallDetector()
        )

        await this.setPower(0)
        console.log({ minAngle, maxAngle })

    }

    async calibrate2() {

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

}

module.exports = TachoMotor