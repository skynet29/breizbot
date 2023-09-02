(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
class CallbackEmitter {
    constructor() {
        this.callbacks = []
    }

    /**
     * 
     * @param {(data) => boolean} callback 
     */
    on(callback) {
        this.callbacks.push(callback)
    }

    emit(data) {
        console.log('emit', data)
        let i = this.callbacks.length

        while (i--) {
            const callback = this.callbacks[i]
            if (callback(data)) {
                this.callbacks.splice(i, 1)
            }
        }
    }
}

module.exports = CallbackEmitter
},{}],2:[function(require,module,exports){
//@ts-check

const { getEnumName } = $$.util

const Event = {
    DETACHED_IO: 0x00,
    ATTACHED_IO: 0x01,
    ATTACHED_VIRTUAL_IO: 0x02,
}
const EventNames = getEnumName(Event)

const HubAlertType = {
    LOW_VOLTAGE: 0x01,
    HIGH_CURRENT: 0x02,
    LOW_SIGNAL_STRENGTH: 0x03,
    OVER_POWER_CONDITION: 0x04
}

const MessageType = {
    HUB_PROPERTIES: 0x01,
    HUB_ACTIONS: 0x02,
    HUB_ALERTS: 0x03,
    HUB_ATTACHED_IO: 0x04,
    GENERIC_ERROR_MESSAGES: 0x05,
    HW_NETWORK_COMMANDS: 0x08,
    FW_UPDATE_GO_INTO_BOOT_MODE: 0x10,
    FW_UPDATE_LOCK_MEMORY: 0x11,
    FW_UPDATE_LOCK_STATUS_REQUEST: 0x12,
    FW_LOCK_STATUS: 0x13,
    PORT_INFORMATION_REQUEST: 0x21,
    PORT_MODE_INFORMATION_REQUEST: 0x22,
    PORT_INPUT_FORMAT_SETUP_SINGLE: 0x41,
    PORT_INPUT_FORMAT_SETUP_COMBINEDMODE: 0x42,
    PORT_INFORMATION: 0x43,
    PORT_MODE_INFORMATION: 0x44,
    PORT_VALUE_SINGLE: 0x45,
    PORT_VALUE_COMBINEDMODE: 0x46,
    PORT_INPUT_FORMAT_SINGLE: 0x47,
    PORT_INPUT_FORMAT_COMBINEDMODE: 0x48,
    VIRTUAL_PORT_SETUP: 0x61,
    PORT_OUTPUT_COMMAND: 0x81,
    PORT_OUTPUT_COMMAND_FEEDBACK: 0x82,
}



const MessageTypeNames = getEnumName(MessageType)

const DeviceType = {
    UNKNOWN: 0,
    SIMPLE_MEDIUM_LINEAR_MOTOR: 1,
    TRAIN_MOTOR: 2,
    LIGHT: 8,
    VOLTAGE_SENSOR: 20,
    CURRENT_SENSOR: 21,
    PIEZO_BUZZER: 22,
    HUB_LED: 23,
    TILT_SENSOR: 34,
    MOTION_SENSOR: 35,
    COLOR_DISTANCE_SENSOR: 37,
    MEDIUM_LINEAR_MOTOR: 38,
    MOVE_HUB_MEDIUM_LINEAR_MOTOR: 39,
    MOVE_HUB_TILT_SENSOR: 40,
    DUPLO_TRAIN_BASE_MOTOR: 41,
    DUPLO_TRAIN_BASE_SPEAKER: 42,
    DUPLO_TRAIN_BASE_COLOR_SENSOR: 43,
    DUPLO_TRAIN_BASE_SPEEDOMETER: 44,
    TECHNIC_LARGE_LINEAR_MOTOR: 46, // Technic Control+
    TECHNIC_XLARGE_LINEAR_MOTOR: 47, // Technic Control+
    TECHNIC_MEDIUM_ANGULAR_MOTOR: 48, // Spike Prime
    TECHNIC_LARGE_ANGULAR_MOTOR: 49, // Spike Prime
    TECHNIC_MEDIUM_HUB_GEST_SENSOR: 54,
    REMOTE_CONTROL_BUTTON: 55,
    REMOTE_CONTROL_RSSI: 56,
    TECHNIC_MEDIUM_HUB_ACCELEROMETER: 57,
    TECHNIC_MEDIUM_HUB_GYRO_SENSOR: 58,
    TECHNIC_MEDIUM_HUB_TILT_SENSOR: 59,
    TECHNIC_MEDIUM_HUB_TEMPERATURE_SENSOR: 60,
    TECHNIC_COLOR_SENSOR: 61, // Spike Prime
    TECHNIC_DISTANCE_SENSOR: 62, // Spike Prime
    TECHNIC_FORCE_SENSOR: 63, // Spike Prime
    TECHNIC_3X3_COLOR_LIGHT_MATRIX: 64, // Spike Essential
    TECHNIC_SMALL_ANGULAR_MOTOR: 65, // Spike Essential
    MARIO_ACCELEROMETER: 71,
    MARIO_BARCODE_SENSOR: 73,
    MARIO_PANTS_SENSOR: 74,
    TECHNIC_MEDIUM_ANGULAR_MOTOR_GREY: 75, // Mindstorms
    TECHNIC_LARGE_ANGULAR_MOTOR_GREY: 76, // Technic Control+
    VIRTUAL_DEVICE: 100
}

const DeviceTypeNames = getEnumName(DeviceType)

const ErrorCode = {
    ACK: 0x01,
    MACK: 0x02,
    BUFFER_OVERFLOW: 0x03,
    TIMEOUT: 0x04,
    COMMAND_NOT_RECOGNIZED: 0x05,
    INVALID_USE: 0x06,
    OVERCURRENT: 0x07,
    INTERNAL_ERROR: 0x08,
}

const ErrorCodeNames = getEnumName(ErrorCode)


const HubPropertyPayload = {
    ADVERTISING_NAME: 0x01,
    BUTTON_STATE: 0x02,
    FW_VERSION: 0x03,
    HW_VERSION: 0x04,
    RSSI: 0x05,
    BATTERY_VOLTAGE: 0x06,
    BATTERY_TYPE: 0x07,
    MANUFACTURER_NAME: 0x08,
    RADIO_FIRMWARE_VERSION: 0x09,
    LWP_PROTOCOL_VERSION: 0x0A,
    SYSTEM_TYPE_ID: 0x0B,
    HW_NETWORK_ID: 0x0C,
    PRIMARY_MAC_ADDRESS: 0x0D,
    SECONDARY_MAC_ADDRESS: 0x0E,
    HW_NETWORK_FAMILY: 0x0F
}

const HubPropertyPayloadNames = getEnumName(HubPropertyPayload)

const ModeInformationType = {
    NAME: 0x00,
    RAW: 0x01,
    PCT: 0x02,
    SI: 0x03,
    SYMBOL: 0x04,
    MAPPING: 0x05,
    USED_INTERNALLY: 0x06,
    MOTOR_BIAS: 0x07,
    CAPABILITY_BITS: 0x08,
    VALUE_FORMAT: 0x80,
}

const ModeInformationTypeNames = getEnumName(ModeInformationType)

const PortMap = {
    "A": 0,
    "B": 1,
    "C": 2,
    "D": 3,
    "HUB_LED": 50,
    "CURRENT_SENSOR": 59,
    "VOLTAGE_SENSOR": 60,
    "ACCELEROMETER": 97,
    "GYRO_SENSOR": 98,
    "TILT_SENSOR": 99
}

const DeviceMode = {
    POWER: 0x00,
    SPEED: 0x01,
    ROTATION: 0x02,
    ABSOLUTE: 0x03,
    COLOR: 0x00,
    RGB: 0x01,
    TILT_POS: 0x00
}

const BrakingStyle = {
    FLOAT: 0,
    HOLD: 126,
    BRAKE: 127
}

const PortMapNames = getEnumName(PortMap)

module.exports = {
    MessageType,
    MessageTypeNames,
    Event,
    EventNames,
    BrakingStyle,
    DeviceMode,
    DeviceType,
    DeviceTypeNames,
    ModeInformationType,
    ModeInformationTypeNames,
    PortMap,
    PortMapNames,
    HubPropertyPayload,
    HubPropertyPayloadNames,
    ErrorCodeNames
}
},{}],3:[function(require,module,exports){
//@ts-check

const CallbackEmitter = require('./CallbackEmitter')
const { MessageType, PortMapNames } = require('./Const')
const { log, toUint32 } = require('./Util')

const deviceInfo = {}

class Device {
    /**
     * 
     * @param {HUB.HubDevice} hubDevice 
     * @param {number} portId 
     * @param {string} type 
     */
    constructor(hubDevice, portId, type) {
        this.hubDevice = hubDevice
        this.portId = portId
        this.type = type
        this.name = PortMapNames[portId]
        this.feedbackCallback = null
        this.valueCallback = undefined
        this.mode = undefined
        this.waitEnd = false
        this.notificationEnabled = false

    }

    /**
     * 
     * @param {boolean} waitEnd 
     * @param  {...any} data 
     * @returns 
     */
    async writePortCommand(waitEnd, ...data) {
        this.waitEnd = waitEnd
        return new Promise(async (resolve) => {
            this.feedbackCallback = resolve
            await this.hubDevice.writePortCommand(this.portId, data)
        })  

    }

    handleFeedback(feedback) {
        if (typeof this.feedbackCallback == 'function') {
            if (feedback == 1 && !this.waitEnd) {
                this.feedbackCallback()
            }
            else if (feedback == 10 && this.waitEnd) {
                this.feedbackCallback()
            }
            
        }
    }

    /**
     * 
     * @param {number} mode
     * @param  {...any} data 
     * @returns 
     */
    writeDirectMode(mode, ...data) {
        log('writeDirectMode', this.portId, { mode })
        return this.writePortCommand(true, 0x51, mode, data)
    }

    /**
     * 
     * @param {number} mode 
     * @param {boolean} notificationEnabled 
     * @param {number} deltaInterval 
     * @returns 
     */
    setMode(mode, notificationEnabled, deltaInterval = 1) {
        console.log('setMode', this.portId, { mode, notificationEnabled })

        this.mode = mode
        this.notificationEnabled = notificationEnabled

        return this.hubDevice.sendMsg(MessageType.PORT_INPUT_FORMAT_SETUP_SINGLE,
            this.portId, mode, toUint32(deltaInterval), notificationEnabled ? 0x01 : 0)
    }

    async readInfo() {
        let info = deviceInfo[this.type]
        if (info == undefined) {
            info = await this.hubDevice.getPortInformation(this.portId)
            deviceInfo[this.type] = info
        }
        return info
    }

    /**
     * 
     * @param {DataView} msg 
     */
    decodeValue(msg) {
        const info = deviceInfo[this.type]
        if (info != undefined) {
            const { VALUE_FORMAT, RAW, SI } = info.modes[this.mode]
            const range = $$.util.mapRange(RAW.min, RAW.max, SI.min, SI.max)
            const { dataType, numValues } = VALUE_FORMAT
            const ret = []
            let offset = 4
            let val
            for (let idx = 0; idx < numValues; idx++) {
                switch (dataType) {
                    case '16bit':
                        val = msg.getInt16(offset, true)
                        offset += 2
                        break;
                    case '8bit':
                        val = msg.getInt8(offset)
                        offset += 1
                        break;
                    case '32bit':
                        val = msg.getInt32(offset, true)
                        offset += 4
                        break;
                    case 'float':
                        val = msg.getFloat32(offset, true)
                        offset += 4
                        break;

                }
                log('val', val)
                ret.push(Math.trunc(range(val)))
            }
            return ret

        }
    }
    /**
     * 
     * @param {DataView} msg 
     */
    handleValue(msg) {
        log('handleValue', this.portId, msg)
        let value = this.decodeValue(msg)

        if (value != undefined && typeof this.valueCallback == 'function') {
            this.valueCallback(value)
        }
    }


    /**
     * 
     * @param {number} mode 
     * @returns 
    */
    async getValue(mode) {
        console.log('getValue', this.portId, { mode })

        await this.setMode(mode, false)
        return new Promise(async (resolve) => {
            this.valueCallback = (data) => {
                console.log('value', data)
                resolve(data)
                return true
            }
            await this.hubDevice.sendMsg(MessageType.PORT_INFORMATION_REQUEST, this.portId, 0x00)

        })
    }

    /**
     * 
     * @param {number} mode 
     * @param {(data) => Promise<boolean>} testFn 
     * @returns 
     */
    async waitTestValue(mode, testFn) {
        await this.setMode(mode, true)

        await new Promise(async (resolve) => {
            this.valueCallback = async (value) => {
                log('waitTestValue', value)
                const ret = await testFn(value)
                if (ret) {
                    log('waitTestValue OK')
                    //await this.setMode(mode, false)
                    resolve()
                }
            }

        })
        return this.setMode(mode, false)
    }

    async subscribe(mode, cbk, deltaInterval = 1) {
        await this.setMode(mode, true, deltaInterval)
        this.valueCallback = async (data) => {
            await cbk(data)
        }
    }

    async unsubscribe() {
        if (this.notificationEnabled) {
            this.setMode(this.mode, false)
        }
    }

}

module.exports = Device
},{"./CallbackEmitter":1,"./Const":2,"./Util":10}],4:[function(require,module,exports){
//@ts-check

const Motor = require('./Motor')
const {BrakingStyle} = require('./Const')
const {toInt16, toInt32} = require('./Util')

const maxPower = 100

class DoubleMotor extends Motor {


    constructor(hubDevice, portId, name) {
        super(hubDevice, portId, 'Virtual Device')
        this.name = name

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
},{"./Const":2,"./Motor":6,"./Util":10}],5:[function(require,module,exports){
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
        super(hubDevice, portId, type)

    }

    setBrightness(brightness) {
        console.log('setBrightness', this.portId, { brightness })
        return this.writeDirectMode(DeviceMode.POWER, brightness)
    }


}

module.exports = Led
},{"./Const":2,"./Device":3}],6:[function(require,module,exports){
//@ts-check

const Device = require('./Device')
const {PortMapNames, DeviceMode} = require('./Const')

const maxPower = 100

class Motor extends Device {

    /**
     * 
     * @param {HubDevice} hubDevice 
     * @param {number} portId 
     */
    constructor(hubDevice, portId, type) {
        super(hubDevice, portId, type)
    }

    setPower(power) {
        console.log('setPower', this.portId, { power })
        return this.writeDirectMode(DeviceMode.POWER, power)
    }


}

module.exports = Motor
},{"./Const":2,"./Device":3}],7:[function(require,module,exports){
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
},{"./Const":2,"./Device":3}],8:[function(require,module,exports){
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

        if (this.calibrationValue) {
            angle *= this.calibrationValue
        }

        return this.writePortCommand(waitEnd, 0x0D, toInt32(angle), speed, maxPower, brakingStyle)
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
},{"./Const":2,"./Motor":6,"./Util":10}],9:[function(require,module,exports){
//@ts-check

const Device = require('./Device')
const {PortMapNames, DeviceMode} = require('./Const')

class TiltSensor extends Device {
    constructor(hubDevice, portId, type) {
        super(hubDevice, portId, type)
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
            default:
                value = super.decodeValue(msg)
                break
        }
        return value
    }
}

module.exports = TiltSensor

},{"./Const":2,"./Device":3}],10:[function(require,module,exports){
//@ts-check

/**
  * 
  * @param {number} val 
  * @returns {Array}
  */
function toInt16(val) {
    const buff = new Uint8Array(2)
    const view = new DataView(buff.buffer)
    view.setInt16(0, val, true)
    return Array.from(buff)
}

/**
 * 
 * @param {number} val 
 * @returns {Array}
 */
function toInt32(val) {
    const buff = new Uint8Array(4)
    const view = new DataView(buff.buffer)
    view.setInt32(0, val, true)
    return Array.from(buff)
}

function toUint32(val) {
    const buff = new Uint8Array(4)
    const view = new DataView(buff.buffer)
    view.setUint32(0, val, true)
    return Array.from(buff)
}

const debug = false

const log = function (...data) {
    if (debug) {
        console.log.apply(console, data)
    }
}

module.exports = {
    toInt16,
    toInt32,
    toUint32,
    log
}
},{}],11:[function(require,module,exports){
//@ts-check


(function () {

    const CallbackEmitter = require('./CallbackEmitter')
    const { EventNames, DeviceMode, DeviceTypeNames, BrakingStyle, PortMap, HubPropertyPayloadNames, ModeInformationTypeNames, Event, DeviceType, PortMapNames, MessageType, HubPropertyPayload, ModeInformationType, ErrorCodeNames, MessageTypeNames } = require('./Const')
    const Motor = require('./Motor')
    const DoubleMotor = require('./DoubleMotor')
    const TachoMotor = require('./TachoMotor');
    const Device = require('./Device')
    const RgbLed = require('./RgbLed')
    const Led = require('./Led')
    const TiltSensor = require('./TiltSensor')
    const { log } = require('./Util')

    const Color = {
        BLACK: 0,
        PINK: 1,
        PURPLE: 2,
        BLUE: 3,
        LIGHT_BLUE: 4,
        CYAN: 5,
        GREEN: 6,
        YELLOW: 7,
        ORANGE: 8,
        RED: 9,
        WHITE: 10,
        NONE: 255
    }

    const LPF2_SERVICE_UUID = '00001623-1212-efde-1623-785feabcd123'
    const LPF2_CHARAC_UUID = '00001624-1212-efde-1623-785feabcd123'


    /**
     * 
     * @param {ArrayBuffer} buf 
     */
    function abToString(buf) {
        const uint8buff = new Uint8Array(buf)
        let ret = ""
        for (let i = 0; i < uint8buff.byteLength && uint8buff[i] != 0; i++) {
            ret += String.fromCharCode(uint8buff[i])
        }
        return ret
    }


    /**
     * 
     * @param  {...any} data 
     * @returns {ArrayBuffer}
     */
    function formatMsg(msgType, ...data) {
        const buff = data.flat(4)
        const msgLen = buff.length + 3
        const buffer = new ArrayBuffer(msgLen)
        const uint8Buffer = new Uint8Array(buffer)
        uint8Buffer[0] = msgLen
        uint8Buffer[1] = 0
        uint8Buffer[2] = msgType
        uint8Buffer.set(buff, 3)
        return buffer
    }


    function getVirtualPortName(portId1, portId2) {
        const portIdA = PortMapNames[portId1]
        const portIdB = PortMapNames[portId2]
        return `${portIdA}_${portIdB}`
    }

    const constructorMap = {
        [DeviceType.TECHNIC_LARGE_LINEAR_MOTOR]: TachoMotor,
        [DeviceType.TECHNIC_LARGE_ANGULAR_MOTOR_GREY]: TachoMotor,
        [DeviceType.TECHNIC_XLARGE_LINEAR_MOTOR]: TachoMotor,
        [DeviceType.TECHNIC_MEDIUM_HUB_TILT_SENSOR]: TiltSensor,
        [DeviceType.HUB_LED]: RgbLed,
        [DeviceType.LIGHT]: Led
    }

    /**@implements HUB.HubDevice */
    class HubDevice extends EventEmitter2 {

        constructor() {
            super()
            this.charac = null
            this.portCmdQueue = {}
            this.portCmdCallback = {}
            /**@type {{[portId: string]: Device}} */
            this.hubDevices = {}
            this.busy = false
            this.attachCallbacks = new CallbackEmitter()
            this.portCmdQueue = []

        }

        async writePortCommand(portId, ...data) {

            console.log('#writePortCommand', { portId, data })

            const buffer = formatMsg(MessageType.PORT_OUTPUT_COMMAND, portId, 0x11, data)

            if (!this.busy)  {
                this.busy = true
                await this.sendBuffer(buffer)
            }
            else {
                this.portCmdQueue.push(buffer)
                console.log('# Busy ! wait feedback')
                
            }

        }



        /**
         * 
         * @param {BluetoothDevice} device 
         */
        async init(device) {

            const server = await device.gatt.connect()
            log('Connected')
            const service = await server.getPrimaryService(LPF2_SERVICE_UUID)
            this.charac = await service.getCharacteristic(LPF2_CHARAC_UUID)

            const onCharacteristicvaluechanged = (event) => {
                this.decodeMsg(event.target.value)
            }

            device.addEventListener('gattserverdisconnected', () => {
                console.log('onGattServerDisconnected', this)
                this.charac.removeEventListener('characteristicvaluechanged', onCharacteristicvaluechanged)

                this.charac = null
                this.emit('disconnected')
            })

            this.charac.addEventListener('characteristicvaluechanged', onCharacteristicvaluechanged)
            await this.charac.startNotifications()
            await $$.util.wait(100)
        }

        async startNotification() {
            await this.sendMsg(MessageType.HUB_PROPERTIES, HubPropertyPayload.BATTERY_VOLTAGE, 0x02)
            await this.sendMsg(MessageType.HUB_PROPERTIES, HubPropertyPayload.SYSTEM_TYPE_ID, 0x05)
            await this.sendMsg(MessageType.HUB_PROPERTIES, HubPropertyPayload.PRIMARY_MAC_ADDRESS, 0x05)
            await this.sendMsg(MessageType.HUB_ALERTS, 0x01, 0x01)
            // await this.sendMsg(MessageType.HUB_ALERTS, 0x02, 0x01)
            // await this.sendMsg(MessageType.HUB_ALERTS, 0x03, 0x01)
            // await this.sendMsg(MessageType.HUB_ALERTS, 0x04, 0x01)

        }


        /**
         * 
         * @param {number} portId 
         * @returns {Promise<Motor>}
         */
        getMotor(portId) {
            return new Promise((resolve, reject) => {
                const device = this.hubDevices[portId]
                if (device) {
                    if (device instanceof Motor) {
                        resolve(device)
                    }
                    else {
                        reject()
                    }
                }
                else {
                    this.attachCallbacks.on((device) => {
                        if (device.portId == portId) {
                            log(`device on portId ${portId} is ready`)
                            resolve(device)
                            return true
                        }
                        return false
                    })
                }
            })
        }


        /**
         * 
         * @param {number} portId 
         * @returns {Promise<Motor>}
         */
        getTachoMotor(portId) {
            return new Promise((resolve, reject) => {
                const device = this.hubDevices[portId]
                if (device) {
                    if (device instanceof TachoMotor) {
                        resolve(device)
                    }
                    else {
                        reject()
                    }
                }
                else {
                    this.attachCallbacks.on((device) => {
                        if (device.portId == portId) {
                            log(`device on portId ${portId} is ready`)
                            resolve(device)
                            return true
                        }
                        return false
                    })
                }
            })
        }



        /**
         * 
         * @param {number} portId 
         * @returns {Promise<TiltSensor>}
         */
        getTiltSensor(portId) {
            return new Promise((resolve, reject) => {
                const device = this.hubDevices[portId]
                if (device) {
                    if (device instanceof TiltSensor) {
                        resolve(device)
                    }
                    else {
                        reject()
                    }
                }
                else {
                    this.attachCallbacks.on((device) => {
                        if (device.portId == portId) {
                            log(`device on portId ${portId} is ready`)
                            resolve(device)
                            return true
                        }
                        return false
                    })
                }
            })

        }

        getRgbLed(portId) {
            return new Promise((resolve, reject) => {
                const device = this.hubDevices[portId]
                if (device) {
                    if (device instanceof RgbLed) {
                        resolve(device)
                    }
                    else {
                        reject()
                    }
                }
                else {
                    this.attachCallbacks.on((device) => {
                        if (device.portId == portId) {
                            log(`device on portId ${portId} is ready`)
                            resolve(device)
                            return true
                        }
                        return false
                    })
                }
            })
        }

        getLed(portId) {
            return new Promise((resolve, reject) => {
                const device = this.hubDevices[portId]
                if (device) {
                    if (device instanceof Led) {
                        resolve(device)
                    }
                    else {
                        reject()
                    }
                }
                else {
                    this.attachCallbacks.on((device) => {
                        if (device.portId == portId) {
                            log(`device on portId ${portId} is ready`)
                            resolve(device)
                            return true
                        }
                        return false
                    })
                }
            })
        }
        async getDblMotor(portId1, portId2) {
            return new Promise(async (resolve) => {
                const name = getVirtualPortName(portId1, portId2)
                const device = Object.values(this.hubDevices).find((d) => d.name == name)
                if (device) {
                    resolve(device)

                }
                else {
                    this.attachCallbacks.on((device) => {
                        if (device.name == name) {
                            console.log(`device on portId ${device.portId} is ready`)
                            resolve(device)
                            return true
                        }
                        return false
                    })

                    await this.createVirtualPort(portId1, portId2)
                }
            })
        }

        /**
         * 
         * @param  {ArrayBuffer} buffer 
         */
        async sendBuffer(buffer) {
            console.log('# sendBuffer', buffer)
            await this.charac.writeValueWithoutResponse(buffer)
            // console.log('OK')
            // if (!this.busy) {
            //     this.busy = true
            //     await this.charac.writeValueWithoutResponse(buffer)
            //     this.busy = false
            //     if (this.cmdQueue.length > 0) {
            //         console.log('process queued cmd')
            //         await this.charac.writeValueWithoutResponse(this.cmdQueue.shift())
            //     }

            // }
            // else {
            //     console.log('busy! push in queue')
            //     this.cmdQueue.push(buffer)
            // }

        }

        /**
         * 
         * @param {number} msgType
         * @param  {...any} data 
         */
        sendMsg(msgType, ...data) {
            log('sendMsg', MessageTypeNames[msgType], data)
            return this.sendBuffer(formatMsg(msgType, data))
        }

        /**
         * 
         * @param {string} name 
         * @returns {number}
         */
        getPortIdFromName(name) {
            for (const info of Object.values(this.hubDevices)) {
                if (info.name == name) {
                    return info.portId
                }
            }
        }

        /**
         * @param {number} portId1
         * @param {number} portId2
         */
        createVirtualPort(portId1, portId2) {

            return this.sendMsg(MessageType.VIRTUAL_PORT_SETUP, 0x01, portId1, portId2)
        }

        shutdown() {
            return this.sendMsg(MessageType.HUB_ACTIONS, 0x01)
        }


        getHubDevices() {
            return Object.values(this.hubDevices)
        }

        async readDeviceInfo() {
            for (const device of this.getHubDevices()) {
                await device.readInfo()
            }
        }

        getDevice(portId) {
            return this.hubDevices[portId]
        }

        /**
         * 
         * @param {number} portId 
         * @returns {Promise<HUB.PortInformation>}
         */
        async getPortInformation(portId) {

            const portInfo = await this.getPortInformationRequest(portId)
            const { count, output, input, capabilities } = portInfo
            const modes = []
            for (let mode = 0; mode < count; mode++) {
                const data = {}
                let ret
                data.mode = 0
                ret = await this.getPortModeInformationRequest(portId, mode, ModeInformationType.NAME)
                data.name = ret.name
                ret = await this.getPortModeInformationRequest(portId, mode, ModeInformationType.RAW)
                data[ret.type] = { min: ret.min, max: ret.max }
                ret = await this.getPortModeInformationRequest(portId, mode, ModeInformationType.SI)
                data[ret.type] = { min: ret.min, max: ret.max }
                ret = await this.getPortModeInformationRequest(portId, mode, ModeInformationType.SYMBOL)
                data.unit = ret.symbol
                ret = await this.getPortModeInformationRequest(portId, mode, ModeInformationType.VALUE_FORMAT)
                const { numValues, dataType, totalFigures, decimals } = ret
                data[ret.type] = { numValues, dataType, totalFigures, decimals }
                if ((input >> mode) & 0x1) {
                    data.mode |= 1
                }
                if ((output >> mode) & 0x1) {
                    data.mode |= 2
                }
                modes.push(data)
            }

            return { modes, capabilities }
        }


        getPortInformationRequest(portId) {
            return new Promise(async (resolve) => {
                await this.sendMsg(MessageType.PORT_INFORMATION_REQUEST, portId, 0x01)
                this.portCmdCallback[portId] = resolve
            })
        }



        getPortModeInformationRequest(portId, mode, type) {
            return new Promise(async (resolve) => {
                await this.sendMsg(MessageType.PORT_MODE_INFORMATION_REQUEST, portId, mode, type)
                this.portCmdCallback[portId] = resolve
            })
        }

        /**
         * 
         * @param {DataView} msg 
         */
        decodeMsg(msg) {
            const bufferLen = msg.byteLength
            const msgLen = msg.getUint8(0)
            const msgType = msg.getUint8(2)
            log('decodeMsg', { msgType: MessageTypeNames[msgType] })
            switch (msgType) {
                case MessageType.HUB_ATTACHED_IO:
                    this.handlePortMsg(msg)
                    break;
                case MessageType.GENERIC_ERROR_MESSAGES:
                    this.handleGenericErrorMsg(msg)
                    break;
                case MessageType.HUB_PROPERTIES:
                    this.handleHubPropertyResponse(msg)
                    break
                case MessageType.HUB_ALERTS:
                    this.handleHubAlerts(msg);
                    break
                case MessageType.PORT_OUTPUT_COMMAND_FEEDBACK:
                    this.handlePortCommandFeedback(msg)
                    break;
                case MessageType.PORT_MODE_INFORMATION:
                    this.handlePortModeInformation(msg)
                    break;
                case MessageType.PORT_INFORMATION:
                    this.handlePortInformation(msg)
                    break;
                case MessageType.PORT_VALUE_SINGLE:
                    this.handlePortValueSingle(msg)
                    break;
            }
        }


        /**
          * 
          * @param {DataView} msg 
          */
        handlePortValueSingle(msg) {
            //log('msg', msg)
            const portId = msg.getUint8(3)
            const msgLen = msg.getUint8(0)
            const device = this.hubDevices[portId]
            log('handlePortValueSingle', { msgLen, portId })
            device.handleValue(msg)
        }


        /**
         * 
         * @param {DataView} msg 
         */
        handlePortModeInformation(msg) {
            const portId = msg.getUint8(3)
            const mode = msg.getUint8(4)
            const type = msg.getUint8(5)
            const data = { portId, mode, type: ModeInformationTypeNames[type] }
            switch (type) {
                case ModeInformationType.NAME:
                    data.name = abToString(msg.buffer.slice(6, msg.byteLength))
                    break
                case ModeInformationType.RAW:
                case ModeInformationType.PCT:
                case ModeInformationType.SI:
                    data.min = msg.getFloat32(6, true)
                    data.max = msg.getFloat32(10, true)
                    break
                case ModeInformationType.SYMBOL:
                    data.symbol = abToString(msg.buffer.slice(6, msg.byteLength))
                    break
                case ModeInformationType.VALUE_FORMAT:
                    data.numValues = msg.getUint8(6)
                    data.dataType = ["8bit", "16bit", "32bit", "float"][msg.getUint8(7)]
                    data.totalFigures = msg.getUint8(8)
                    data.decimals = msg.getUint8(9)
                    break
            }
            log('portModeInformation', data)
            const cb = this.portCmdCallback[portId]
            if (typeof cb == 'function') {
                cb(data)
                delete this.portCmdCallback[portId]
            }
        }
        /**
         * 
         * @param {DataView} msg 
         */
        handlePortInformation(msg) {
            const portId = msg.getUint8(3)
            let capabilities = msg.getUint8(5)
            const count = msg.getUint8(6)
            const input = msg.getUint16(7, true)
            const output = msg.getUint16(9, true)
            log(`Port ${portId}, capabilities ${capabilities}, total modes ${count}, 
                    input modes ${input}, output modes ${output}`)
            const availableCaps = 'output,input,logical combinable, logical synchronisable'.split(',')
            let cap = []
            for (let i = 0; i < 4; i++) {
                if ((capabilities >> i) & 1) {
                    cap.push(availableCaps[i])
                }
            }
            const data = { portId, capabilities: cap.join(', '), count, input, output }
            const cb = this.portCmdCallback[portId]
            if (typeof cb == 'function') {
                cb(data)
            }
        }


        /**
         * 
         * @param {DataView} msg 
         * @returns 
         */
        handleHubPropertyResponse(msg) {
            const property = msg.getUint8(3)
            log({ property: HubPropertyPayloadNames[property] })
            if (property == HubPropertyPayload.BATTERY_VOLTAGE) {
                const batteryLevel = msg.getUint8(5)
                log({ batteryLevel })
                this.emit('batteryLevel', { batteryLevel })
            }
            else if (property == HubPropertyPayload.BUTTON_STATE) {
                const buttonState = msg.getUint8(5)
                log({ buttonState })
                this.emit('buttonState', { buttonState })
            }
            else if (property == HubPropertyPayload.SYSTEM_TYPE_ID) {
                const systemType = msg.getUint8(5)
                log({ systemType })
                //this.emit('buttonState', { buttonState })
            }
            else if (property == HubPropertyPayload.PRIMARY_MAC_ADDRESS) {
                const bytes = []
                for (let i = 0; i < 6; i++) {
                    bytes.push(msg.getUint8(5 + i).toString(16).toLocaleUpperCase().padStart(2, '0'))
                }
                log({ bytes })
                this.emit('address', { address: bytes.join(':') })
            }
        }
        /**
         * 
         * @param {DataView} msg 
         */
        handleGenericErrorMsg(msg) {
            const cmdType = msg.getUint8(3)
            const errorCode = msg.getUint8(4)
            log({ cmdType, errorCode: ErrorCodeNames[errorCode] })
            this.emit('error', { cmdType, errorCode: ErrorCodeNames[errorCode] })
        }

        /**
         * 
         * @param {DataView} msg 
         */
        handleHubAlerts(msg) {
            const bufferLen = msg.byteLength
            const msgLen = msg.getUint8(0)
            const type = msg.getUint8(3)
            const operation = msg.getUint8(4)
            const payload = msg.getUint8(5)

            log('handleHubAlerts', { bufferLen, msgLen, type, operation, payload })
            this.emit('hubAlerts', { type, payload })
        }

        /**
         * 
         * @param {DataView} msg 
         */
        handlePortCommandFeedback(msg) {
            for (let offset = 3; offset < msg.byteLength; offset += 2) {
                const portId = msg.getUint8(offset)
                const feedback = msg.getUint8(offset + 1)
                const device = this.hubDevices[portId]
                console.log('#handlePortCommandFeedback', { portId, feedback })
                this.busy = false
                if (device != undefined) {
                    device.handleFeedback(feedback)
                }
                
                const buffer = this.portCmdQueue.shift()
                if (buffer) {
                    console.log('# process queued cmd')
                    this.busy = true
                    this.sendBuffer(buffer)
                }

            }
        }
        /**
         * 
         * @param {DataView} msg 
         */
        handlePortMsg(msg) {

            const portId = msg.getUint8(3)
            const eventType = msg.getUint8(4)
            const type = eventType ? msg.getUint16(5, true) : 0
            const deviceTypeName = DeviceTypeNames[type] || "Unknown"
            const eventName = EventNames[eventType]

            console.log('handlePortMsg', { portId, eventName, deviceTypeName })
            if (eventType == Event.ATTACHED_IO) {

                let constructor = constructorMap[type]
                if (!constructor) {
                    constructor = Device
                }
                const device = new constructor(this, portId, deviceTypeName)
                this.hubDevices[portId] = device
                this.attachCallbacks.emit(device)

                this.emit('attach', device)
            }
            else if (eventType == Event.DETACHED_IO) {
                delete this.hubDevices[portId]
                this.emit('detach', { portId })
            }
            else if (eventType == Event.ATTACHED_VIRTUAL_IO) {
                const portId1 = msg.getUint8(7)
                const portId2 = msg.getUint8(8)

                const device = new DoubleMotor(this, portId, getVirtualPortName(portId1, portId2))
                this.hubDevices[portId] = device
                this.attachCallbacks.emit(device)

                this.emit('attach', device)
            }
        }
    }

    $$.service.registerService('hub', {

        init: function () {

            /**
             * 
             * @param {Device} device 
             * @returns {boolean}
             */
            function isMotor(device) {
                return device instanceof Motor
            }

            /**
             * 
             * @param {Device} device 
             * @returns {boolean}
             */
            function isDoubleMotor(device) {
                return device instanceof DoubleMotor
            }

            /**
             * 
             * @param {Device} device 
             * @returns {boolean}
             */
            function isLed(device) {
                return device instanceof Led
            }

            /**
             * 
             * @param {Device} device 
             * @returns {boolean}
             */
            function isTachoMotor(device) {
                return device instanceof TachoMotor
            }


            /**
             * 
             * @returns {Promise<HubDevice>}
             */
            async function connect() {
                log('connect')

                const device = await navigator.bluetooth.requestDevice({
                    acceptAllDevices: true,
                    optionalServices: [LPF2_SERVICE_UUID]
                })

                const hubDevice = new HubDevice()
                await hubDevice.init(device)

                return hubDevice

                //await sendMsg(MessageType.HUB_PROPERTIES, HubPropertyPayload.BATTERY_TYPE, 0x05)
                //await sendMsg(formatMsg(MessageType.HUB_PROPERTIES, HubPropertyPayload.BATTERY_VOLTAGE, 0x02))
                //await sendMsg(MessageType.HUB_PROPERTIES, HubPropertyPayload.BUTTON_STATE, 0x02)
            }

            return {
                connect,
                Color,
                PortMap,
                PortMapNames,
                DeviceMode,
                BrakingStyle,
                DeviceTypeNames,
                isMotor,
                isTachoMotor,
                isLed,
                isDoubleMotor
            }
        }
    });

})();



},{"./CallbackEmitter":1,"./Const":2,"./Device":3,"./DoubleMotor":4,"./Led":5,"./Motor":6,"./RgbLed":7,"./TachoMotor":8,"./TiltSensor":9,"./Util":10}]},{},[11])

//# sourceMappingURL=hub.js.map
