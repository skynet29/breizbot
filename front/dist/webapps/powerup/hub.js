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
const {MessageType} = require('./Const')
const {log, toUint32} = require('./Util')

class Device {
    /**
     * 
     * @param {HubDevice} hubDevice 
     * @param {number} portId 
     * @param {string} type 
     * @param {string} [name] 
     */
    constructor(hubDevice, portId, type, name) {
        this.hubDevice = hubDevice
        this.portId = portId
        this.type = type
        this.name = name
        this.feedbackCallback = null
        this.valueCallbacks = new CallbackEmitter()
        this.mode = undefined
    }

    async writePortCommand(waitFeedback, ...data) {

        log('writePortCommand', this.portId, { waitFeedback, data })

        if (waitFeedback) {

            return new Promise(async (resolve) => {

                await this.hubDevice.sendMsg(MessageType.PORT_OUTPUT_COMMAND, this.portId, 0x11, data)

                this.feedbackCallback = resolve
            })
        }
        else {
            return this.hubDevice.sendMsg(MessageType.PORT_OUTPUT_COMMAND, this.portId, 0x10, data)
        }

    }

    /**
     * 
     * @param {number} mode
     * @param {boolean} waitFeedback 
     * @param  {...any} data 
     * @returns 
     */
    writeDirectMode(mode, waitFeedback, ...data) {
        log('writeDirectMode', this.portId, {mode, waitFeedback })
        return this.writePortCommand(waitFeedback, 0x51, mode, data)
    }

    /**
     * 
     * @param {number} mode 
     * @param {boolean} notificationEnabled 
     * @param {number} deltaInterval 
     * @returns 
     */
    setMode(mode, notificationEnabled, deltaInterval = 1) {
        log('setMode', this.portId, { mode, notificationEnabled })

        this.mode = mode

        return this.hubDevice.sendMsg(MessageType.PORT_INPUT_FORMAT_SETUP_SINGLE,
            this.portId, mode, toUint32(deltaInterval), notificationEnabled ? 0x01 : 0)
    }

    /**
     * 
     * @param {DataView} msg 
     */
    decodeValue(msg) {

    }
    /**
     * 
     * @param {DataView} msg 
     */
    handleValue(msg) {
        let value = this.decodeValue(msg)

        if (value != undefined) {
            this.valueCallbacks.emit(value)
        }
    }

    handleFeedback() {
        if (typeof this.feedbackCallback == 'function') {
            this.feedbackCallback()
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
            this.valueCallbacks.on((data) => {
                resolve(data)
                return true
            })
            await this.hubDevice.sendMsg(MessageType.PORT_INFORMATION_REQUEST, this.portId, 0x00)

        })
    }

    /**
     * 
     * @param {number} mode 
     * @param {(data) => boolean} testFn 
     * @returns 
     */
    async waitTestValue(mode, testFn) {
        return new Promise(async (resolve) => {
            await this.setMode(mode, true)
            this.valueCallbacks.on(async (value) => {
                log('waitTestValue', value)
                if (testFn(value)) {
                    log('waitTestValue OK')
                    await this.setMode(mode, false)
                    resolve()
                    return true
                }
                return false
            })
                
        })
    }

    async subscribe(mode, cbk, deltaInterval = 1) {
        await this.setMode(mode, true, deltaInterval)
        this.valueCallbacks.on((data) => {
            cbk(data)
            return false
        })
    }
}

module.exports = Device
},{"./CallbackEmitter":1,"./Const":2,"./Util":8}],4:[function(require,module,exports){
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
},{"./Const":2,"./Device":3,"./Util":8}],5:[function(require,module,exports){
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

module.exports = Led
},{"./Const":2,"./Device":3}],6:[function(require,module,exports){
//@ts-check

const Device = require('./Device')
const {PortMapNames, DeviceMode, BrakingStyle} = require('./Const')
const {toInt32, toInt16} = require('./Util')

const maxPower = 100

class Motor extends Device {

    /**
     * 
     * @param {HubDevice} hubDevice 
     * @param {number} portId 
     */
    constructor(hubDevice, portId, type) {
        super(hubDevice, portId, type, PortMapNames[portId])
    }

    setPower(power) {
        console.log('setPower', this.portId, { power })
        return this.writeDirectMode(DeviceMode.POWER, false, power)
    }

    setSpeed(speed) {
        console.log('setSpeed', this.portId, { speed })
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

module.exports = Motor
},{"./Const":2,"./Device":3,"./Util":8}],7:[function(require,module,exports){
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

},{"./Const":2,"./Device":3}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
//@ts-check

(function () {

    const CallbackEmitter = require('./CallbackEmitter')
    const {EventNames, DeviceMode, DeviceTypeNames, BrakingStyle, PortMap, HubPropertyPayloadNames, ModeInformationTypeNames, Event, DeviceType, PortMapNames, MessageType, HubPropertyPayload, ModeInformationType, ErrorCodeNames, MessageTypeNames} = require('./Const')
    const Motor = require('./Motor')
    const DoubleMotor = require('./DoubleMotor')
    const Device = require('./Device')
    const Led = require('./Led')
    const TiltSensor = require('./TiltSensor')
    const {log} = require('./Util')

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
        const buff = data.flat(3)
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
        [DeviceType.TECHNIC_LARGE_LINEAR_MOTOR]: Motor,
        [DeviceType.TECHNIC_LARGE_ANGULAR_MOTOR_GREY]: Motor,
        [DeviceType.TECHNIC_XLARGE_LINEAR_MOTOR]: Motor,
        [DeviceType.TECHNIC_MEDIUM_HUB_TILT_SENSOR]: TiltSensor,
        [DeviceType.HUB_LED]: Led
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
            this.cmdQueue = []
            this.attachCallbacks = new CallbackEmitter()
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
            log('sendBuffer', buffer)
            if (!this.busy) {
                this.busy = true
                await this.charac.writeValueWithoutResponse(buffer)
                this.busy = false
                if (this.cmdQueue.length > 0) {
                    await this.sendBuffer(this.cmdQueue.shift())
                }

            }
            else {
                log('busy push in queue')
                this.cmdQueue.push(buffer)
            }

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

        getDeviceType(portId) {
            return this.hubDevices[portId].type
        }

        /**
         * 
         * @param {number} portId 
         * @returns {Promise<HUB.PortInformation>}
         */
        async getPortInformation(portId) {
            const portInfo = await this.getPortInformationRequest(portId)
            const { capabilities, count, output, input } = portInfo
            const bitSet = Math.max(input, output)
            const modes = []
            for (let mode = 0; mode < count; mode++) {
                const data = {}
                if (bitSet >> mode) {
                    let ret
                    ret = await this.getPortModeInformationRequest(portId, mode, ModeInformationType.NAME)
                    data.name = ret.name
                    ret = await this.getPortModeInformationRequest(portId, mode, ModeInformationType.RAW)
                    data[ret.type] = { min: ret.min, max: ret.max }
                    ret = await this.getPortModeInformationRequest(portId, mode, ModeInformationType.PCT)
                    data[ret.type] = { min: ret.min, max: ret.max }
                    ret = await this.getPortModeInformationRequest(portId, mode, ModeInformationType.SI)
                    data[ret.type] = { min: ret.min, max: ret.max }
                    ret = await this.getPortModeInformationRequest(portId, mode, ModeInformationType.SYMBOL)
                    data.unit = ret.symbol
                    ret = await this.getPortModeInformationRequest(portId, mode, ModeInformationType.VALUE_FORMAT)
                    const { numValues, dataType, totalFigures, decimals } = ret
                    data[ret.type] = { numValues, dataType, totalFigures, decimals }
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
                log('handlePortCommandFeedback', { portId, feedback })
                if (feedback == 10 && device != undefined) {
                    device.handleFeedback()
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

            log('handlePortMsg', { portId, eventName, deviceTypeName })
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
                DeviceTypeNames
            }
        }
    });

})();



},{"./CallbackEmitter":1,"./Const":2,"./Device":3,"./DoubleMotor":4,"./Led":5,"./Motor":6,"./TiltSensor":7,"./Util":8}]},{},[9])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvQ2FsbGJhY2tFbWl0dGVyLmpzIiwibGliL0NvbnN0LmpzIiwibGliL0RldmljZS5qcyIsImxpYi9Eb3VibGVNb3Rvci5qcyIsImxpYi9MZWQuanMiLCJsaWIvTW90b3IuanMiLCJsaWIvVGlsdFNlbnNvci5qcyIsImxpYi9VdGlsLmpzIiwibGliL2h1Yi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJjbGFzcyBDYWxsYmFja0VtaXR0ZXIge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLmNhbGxiYWNrcyA9IFtdXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHsoZGF0YSkgPT4gYm9vbGVhbn0gY2FsbGJhY2sgXG4gICAgICovXG4gICAgb24oY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5jYWxsYmFja3MucHVzaChjYWxsYmFjaylcbiAgICB9XG5cbiAgICBlbWl0KGRhdGEpIHtcbiAgICAgICAgbGV0IGkgPSB0aGlzLmNhbGxiYWNrcy5sZW5ndGhcblxuICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICBjb25zdCBjYWxsYmFjayA9IHRoaXMuY2FsbGJhY2tzW2ldXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2soZGF0YSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhbGxiYWNrcy5zcGxpY2UoaSwgMSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDYWxsYmFja0VtaXR0ZXIiLCIvL0B0cy1jaGVja1xuXG5jb25zdCB7IGdldEVudW1OYW1lIH0gPSAkJC51dGlsXG5cbmNvbnN0IEV2ZW50ID0ge1xuICAgIERFVEFDSEVEX0lPOiAweDAwLFxuICAgIEFUVEFDSEVEX0lPOiAweDAxLFxuICAgIEFUVEFDSEVEX1ZJUlRVQUxfSU86IDB4MDIsXG59XG5jb25zdCBFdmVudE5hbWVzID0gZ2V0RW51bU5hbWUoRXZlbnQpXG5cbmNvbnN0IEh1YkFsZXJ0VHlwZSA9IHtcbiAgICBMT1dfVk9MVEFHRTogMHgwMSxcbiAgICBISUdIX0NVUlJFTlQ6IDB4MDIsXG4gICAgTE9XX1NJR05BTF9TVFJFTkdUSDogMHgwMyxcbiAgICBPVkVSX1BPV0VSX0NPTkRJVElPTjogMHgwNFxufVxuXG5jb25zdCBNZXNzYWdlVHlwZSA9IHtcbiAgICBIVUJfUFJPUEVSVElFUzogMHgwMSxcbiAgICBIVUJfQUNUSU9OUzogMHgwMixcbiAgICBIVUJfQUxFUlRTOiAweDAzLFxuICAgIEhVQl9BVFRBQ0hFRF9JTzogMHgwNCxcbiAgICBHRU5FUklDX0VSUk9SX01FU1NBR0VTOiAweDA1LFxuICAgIEhXX05FVFdPUktfQ09NTUFORFM6IDB4MDgsXG4gICAgRldfVVBEQVRFX0dPX0lOVE9fQk9PVF9NT0RFOiAweDEwLFxuICAgIEZXX1VQREFURV9MT0NLX01FTU9SWTogMHgxMSxcbiAgICBGV19VUERBVEVfTE9DS19TVEFUVVNfUkVRVUVTVDogMHgxMixcbiAgICBGV19MT0NLX1NUQVRVUzogMHgxMyxcbiAgICBQT1JUX0lORk9STUFUSU9OX1JFUVVFU1Q6IDB4MjEsXG4gICAgUE9SVF9NT0RFX0lORk9STUFUSU9OX1JFUVVFU1Q6IDB4MjIsXG4gICAgUE9SVF9JTlBVVF9GT1JNQVRfU0VUVVBfU0lOR0xFOiAweDQxLFxuICAgIFBPUlRfSU5QVVRfRk9STUFUX1NFVFVQX0NPTUJJTkVETU9ERTogMHg0MixcbiAgICBQT1JUX0lORk9STUFUSU9OOiAweDQzLFxuICAgIFBPUlRfTU9ERV9JTkZPUk1BVElPTjogMHg0NCxcbiAgICBQT1JUX1ZBTFVFX1NJTkdMRTogMHg0NSxcbiAgICBQT1JUX1ZBTFVFX0NPTUJJTkVETU9ERTogMHg0NixcbiAgICBQT1JUX0lOUFVUX0ZPUk1BVF9TSU5HTEU6IDB4NDcsXG4gICAgUE9SVF9JTlBVVF9GT1JNQVRfQ09NQklORURNT0RFOiAweDQ4LFxuICAgIFZJUlRVQUxfUE9SVF9TRVRVUDogMHg2MSxcbiAgICBQT1JUX09VVFBVVF9DT01NQU5EOiAweDgxLFxuICAgIFBPUlRfT1VUUFVUX0NPTU1BTkRfRkVFREJBQ0s6IDB4ODIsXG59XG5cblxuXG5jb25zdCBNZXNzYWdlVHlwZU5hbWVzID0gZ2V0RW51bU5hbWUoTWVzc2FnZVR5cGUpXG5cbmNvbnN0IERldmljZVR5cGUgPSB7XG4gICAgVU5LTk9XTjogMCxcbiAgICBTSU1QTEVfTUVESVVNX0xJTkVBUl9NT1RPUjogMSxcbiAgICBUUkFJTl9NT1RPUjogMixcbiAgICBMSUdIVDogOCxcbiAgICBWT0xUQUdFX1NFTlNPUjogMjAsXG4gICAgQ1VSUkVOVF9TRU5TT1I6IDIxLFxuICAgIFBJRVpPX0JVWlpFUjogMjIsXG4gICAgSFVCX0xFRDogMjMsXG4gICAgVElMVF9TRU5TT1I6IDM0LFxuICAgIE1PVElPTl9TRU5TT1I6IDM1LFxuICAgIENPTE9SX0RJU1RBTkNFX1NFTlNPUjogMzcsXG4gICAgTUVESVVNX0xJTkVBUl9NT1RPUjogMzgsXG4gICAgTU9WRV9IVUJfTUVESVVNX0xJTkVBUl9NT1RPUjogMzksXG4gICAgTU9WRV9IVUJfVElMVF9TRU5TT1I6IDQwLFxuICAgIERVUExPX1RSQUlOX0JBU0VfTU9UT1I6IDQxLFxuICAgIERVUExPX1RSQUlOX0JBU0VfU1BFQUtFUjogNDIsXG4gICAgRFVQTE9fVFJBSU5fQkFTRV9DT0xPUl9TRU5TT1I6IDQzLFxuICAgIERVUExPX1RSQUlOX0JBU0VfU1BFRURPTUVURVI6IDQ0LFxuICAgIFRFQ0hOSUNfTEFSR0VfTElORUFSX01PVE9SOiA0NiwgLy8gVGVjaG5pYyBDb250cm9sK1xuICAgIFRFQ0hOSUNfWExBUkdFX0xJTkVBUl9NT1RPUjogNDcsIC8vIFRlY2huaWMgQ29udHJvbCtcbiAgICBURUNITklDX01FRElVTV9BTkdVTEFSX01PVE9SOiA0OCwgLy8gU3Bpa2UgUHJpbWVcbiAgICBURUNITklDX0xBUkdFX0FOR1VMQVJfTU9UT1I6IDQ5LCAvLyBTcGlrZSBQcmltZVxuICAgIFRFQ0hOSUNfTUVESVVNX0hVQl9HRVNUX1NFTlNPUjogNTQsXG4gICAgUkVNT1RFX0NPTlRST0xfQlVUVE9OOiA1NSxcbiAgICBSRU1PVEVfQ09OVFJPTF9SU1NJOiA1NixcbiAgICBURUNITklDX01FRElVTV9IVUJfQUNDRUxFUk9NRVRFUjogNTcsXG4gICAgVEVDSE5JQ19NRURJVU1fSFVCX0dZUk9fU0VOU09SOiA1OCxcbiAgICBURUNITklDX01FRElVTV9IVUJfVElMVF9TRU5TT1I6IDU5LFxuICAgIFRFQ0hOSUNfTUVESVVNX0hVQl9URU1QRVJBVFVSRV9TRU5TT1I6IDYwLFxuICAgIFRFQ0hOSUNfQ09MT1JfU0VOU09SOiA2MSwgLy8gU3Bpa2UgUHJpbWVcbiAgICBURUNITklDX0RJU1RBTkNFX1NFTlNPUjogNjIsIC8vIFNwaWtlIFByaW1lXG4gICAgVEVDSE5JQ19GT1JDRV9TRU5TT1I6IDYzLCAvLyBTcGlrZSBQcmltZVxuICAgIFRFQ0hOSUNfM1gzX0NPTE9SX0xJR0hUX01BVFJJWDogNjQsIC8vIFNwaWtlIEVzc2VudGlhbFxuICAgIFRFQ0hOSUNfU01BTExfQU5HVUxBUl9NT1RPUjogNjUsIC8vIFNwaWtlIEVzc2VudGlhbFxuICAgIE1BUklPX0FDQ0VMRVJPTUVURVI6IDcxLFxuICAgIE1BUklPX0JBUkNPREVfU0VOU09SOiA3MyxcbiAgICBNQVJJT19QQU5UU19TRU5TT1I6IDc0LFxuICAgIFRFQ0hOSUNfTUVESVVNX0FOR1VMQVJfTU9UT1JfR1JFWTogNzUsIC8vIE1pbmRzdG9ybXNcbiAgICBURUNITklDX0xBUkdFX0FOR1VMQVJfTU9UT1JfR1JFWTogNzYsIC8vIFRlY2huaWMgQ29udHJvbCtcbiAgICBWSVJUVUFMX0RFVklDRTogMTAwXG59XG5cbmNvbnN0IERldmljZVR5cGVOYW1lcyA9IGdldEVudW1OYW1lKERldmljZVR5cGUpXG5cbmNvbnN0IEVycm9yQ29kZSA9IHtcbiAgICBBQ0s6IDB4MDEsXG4gICAgTUFDSzogMHgwMixcbiAgICBCVUZGRVJfT1ZFUkZMT1c6IDB4MDMsXG4gICAgVElNRU9VVDogMHgwNCxcbiAgICBDT01NQU5EX05PVF9SRUNPR05JWkVEOiAweDA1LFxuICAgIElOVkFMSURfVVNFOiAweDA2LFxuICAgIE9WRVJDVVJSRU5UOiAweDA3LFxuICAgIElOVEVSTkFMX0VSUk9SOiAweDA4LFxufVxuXG5jb25zdCBFcnJvckNvZGVOYW1lcyA9IGdldEVudW1OYW1lKEVycm9yQ29kZSlcblxuXG5jb25zdCBIdWJQcm9wZXJ0eVBheWxvYWQgPSB7XG4gICAgQURWRVJUSVNJTkdfTkFNRTogMHgwMSxcbiAgICBCVVRUT05fU1RBVEU6IDB4MDIsXG4gICAgRldfVkVSU0lPTjogMHgwMyxcbiAgICBIV19WRVJTSU9OOiAweDA0LFxuICAgIFJTU0k6IDB4MDUsXG4gICAgQkFUVEVSWV9WT0xUQUdFOiAweDA2LFxuICAgIEJBVFRFUllfVFlQRTogMHgwNyxcbiAgICBNQU5VRkFDVFVSRVJfTkFNRTogMHgwOCxcbiAgICBSQURJT19GSVJNV0FSRV9WRVJTSU9OOiAweDA5LFxuICAgIExXUF9QUk9UT0NPTF9WRVJTSU9OOiAweDBBLFxuICAgIFNZU1RFTV9UWVBFX0lEOiAweDBCLFxuICAgIEhXX05FVFdPUktfSUQ6IDB4MEMsXG4gICAgUFJJTUFSWV9NQUNfQUREUkVTUzogMHgwRCxcbiAgICBTRUNPTkRBUllfTUFDX0FERFJFU1M6IDB4MEUsXG4gICAgSFdfTkVUV09SS19GQU1JTFk6IDB4MEZcbn1cblxuY29uc3QgSHViUHJvcGVydHlQYXlsb2FkTmFtZXMgPSBnZXRFbnVtTmFtZShIdWJQcm9wZXJ0eVBheWxvYWQpXG5cbmNvbnN0IE1vZGVJbmZvcm1hdGlvblR5cGUgPSB7XG4gICAgTkFNRTogMHgwMCxcbiAgICBSQVc6IDB4MDEsXG4gICAgUENUOiAweDAyLFxuICAgIFNJOiAweDAzLFxuICAgIFNZTUJPTDogMHgwNCxcbiAgICBNQVBQSU5HOiAweDA1LFxuICAgIFVTRURfSU5URVJOQUxMWTogMHgwNixcbiAgICBNT1RPUl9CSUFTOiAweDA3LFxuICAgIENBUEFCSUxJVFlfQklUUzogMHgwOCxcbiAgICBWQUxVRV9GT1JNQVQ6IDB4ODAsXG59XG5cbmNvbnN0IE1vZGVJbmZvcm1hdGlvblR5cGVOYW1lcyA9IGdldEVudW1OYW1lKE1vZGVJbmZvcm1hdGlvblR5cGUpXG5cbmNvbnN0IFBvcnRNYXAgPSB7XG4gICAgXCJBXCI6IDAsXG4gICAgXCJCXCI6IDEsXG4gICAgXCJDXCI6IDIsXG4gICAgXCJEXCI6IDMsXG4gICAgXCJIVUJfTEVEXCI6IDUwLFxuICAgIFwiQ1VSUkVOVF9TRU5TT1JcIjogNTksXG4gICAgXCJWT0xUQUdFX1NFTlNPUlwiOiA2MCxcbiAgICBcIkFDQ0VMRVJPTUVURVJcIjogOTcsXG4gICAgXCJHWVJPX1NFTlNPUlwiOiA5OCxcbiAgICBcIlRJTFRfU0VOU09SXCI6IDk5XG59XG5cbmNvbnN0IERldmljZU1vZGUgPSB7XG4gICAgUE9XRVI6IDB4MDAsXG4gICAgU1BFRUQ6IDB4MDEsXG4gICAgUk9UQVRJT046IDB4MDIsXG4gICAgQUJTT0xVVEU6IDB4MDMsXG4gICAgQ09MT1I6IDB4MDAsXG4gICAgUkdCOiAweDAxLFxuICAgIFRJTFRfUE9TOiAweDAwXG59XG5cbmNvbnN0IEJyYWtpbmdTdHlsZSA9IHtcbiAgICBGTE9BVDogMCxcbiAgICBIT0xEOiAxMjYsXG4gICAgQlJBS0U6IDEyN1xufVxuXG5jb25zdCBQb3J0TWFwTmFtZXMgPSBnZXRFbnVtTmFtZShQb3J0TWFwKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBNZXNzYWdlVHlwZSxcbiAgICBNZXNzYWdlVHlwZU5hbWVzLFxuICAgIEV2ZW50LFxuICAgIEV2ZW50TmFtZXMsXG4gICAgQnJha2luZ1N0eWxlLFxuICAgIERldmljZU1vZGUsXG4gICAgRGV2aWNlVHlwZSxcbiAgICBEZXZpY2VUeXBlTmFtZXMsXG4gICAgTW9kZUluZm9ybWF0aW9uVHlwZSxcbiAgICBNb2RlSW5mb3JtYXRpb25UeXBlTmFtZXMsXG4gICAgUG9ydE1hcCxcbiAgICBQb3J0TWFwTmFtZXMsXG4gICAgSHViUHJvcGVydHlQYXlsb2FkLFxuICAgIEh1YlByb3BlcnR5UGF5bG9hZE5hbWVzLFxuICAgIEVycm9yQ29kZU5hbWVzXG59IiwiLy9AdHMtY2hlY2tcblxuY29uc3QgQ2FsbGJhY2tFbWl0dGVyID0gcmVxdWlyZSgnLi9DYWxsYmFja0VtaXR0ZXInKVxuY29uc3Qge01lc3NhZ2VUeXBlfSA9IHJlcXVpcmUoJy4vQ29uc3QnKVxuY29uc3Qge2xvZywgdG9VaW50MzJ9ID0gcmVxdWlyZSgnLi9VdGlsJylcblxuY2xhc3MgRGV2aWNlIHtcbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0h1YkRldmljZX0gaHViRGV2aWNlIFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwb3J0SWQgXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtuYW1lXSBcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihodWJEZXZpY2UsIHBvcnRJZCwgdHlwZSwgbmFtZSkge1xuICAgICAgICB0aGlzLmh1YkRldmljZSA9IGh1YkRldmljZVxuICAgICAgICB0aGlzLnBvcnRJZCA9IHBvcnRJZFxuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlXG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWVcbiAgICAgICAgdGhpcy5mZWVkYmFja0NhbGxiYWNrID0gbnVsbFxuICAgICAgICB0aGlzLnZhbHVlQ2FsbGJhY2tzID0gbmV3IENhbGxiYWNrRW1pdHRlcigpXG4gICAgICAgIHRoaXMubW9kZSA9IHVuZGVmaW5lZFxuICAgIH1cblxuICAgIGFzeW5jIHdyaXRlUG9ydENvbW1hbmQod2FpdEZlZWRiYWNrLCAuLi5kYXRhKSB7XG5cbiAgICAgICAgbG9nKCd3cml0ZVBvcnRDb21tYW5kJywgdGhpcy5wb3J0SWQsIHsgd2FpdEZlZWRiYWNrLCBkYXRhIH0pXG5cbiAgICAgICAgaWYgKHdhaXRGZWVkYmFjaykge1xuXG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcblxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuaHViRGV2aWNlLnNlbmRNc2coTWVzc2FnZVR5cGUuUE9SVF9PVVRQVVRfQ09NTUFORCwgdGhpcy5wb3J0SWQsIDB4MTEsIGRhdGEpXG5cbiAgICAgICAgICAgICAgICB0aGlzLmZlZWRiYWNrQ2FsbGJhY2sgPSByZXNvbHZlXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaHViRGV2aWNlLnNlbmRNc2coTWVzc2FnZVR5cGUuUE9SVF9PVVRQVVRfQ09NTUFORCwgdGhpcy5wb3J0SWQsIDB4MTAsIGRhdGEpXG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBtb2RlXG4gICAgICogQHBhcmFtIHtib29sZWFufSB3YWl0RmVlZGJhY2sgXG4gICAgICogQHBhcmFtICB7Li4uYW55fSBkYXRhIFxuICAgICAqIEByZXR1cm5zIFxuICAgICAqL1xuICAgIHdyaXRlRGlyZWN0TW9kZShtb2RlLCB3YWl0RmVlZGJhY2ssIC4uLmRhdGEpIHtcbiAgICAgICAgbG9nKCd3cml0ZURpcmVjdE1vZGUnLCB0aGlzLnBvcnRJZCwge21vZGUsIHdhaXRGZWVkYmFjayB9KVxuICAgICAgICByZXR1cm4gdGhpcy53cml0ZVBvcnRDb21tYW5kKHdhaXRGZWVkYmFjaywgMHg1MSwgbW9kZSwgZGF0YSlcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbW9kZSBcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IG5vdGlmaWNhdGlvbkVuYWJsZWQgXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlbHRhSW50ZXJ2YWwgXG4gICAgICogQHJldHVybnMgXG4gICAgICovXG4gICAgc2V0TW9kZShtb2RlLCBub3RpZmljYXRpb25FbmFibGVkLCBkZWx0YUludGVydmFsID0gMSkge1xuICAgICAgICBsb2coJ3NldE1vZGUnLCB0aGlzLnBvcnRJZCwgeyBtb2RlLCBub3RpZmljYXRpb25FbmFibGVkIH0pXG5cbiAgICAgICAgdGhpcy5tb2RlID0gbW9kZVxuXG4gICAgICAgIHJldHVybiB0aGlzLmh1YkRldmljZS5zZW5kTXNnKE1lc3NhZ2VUeXBlLlBPUlRfSU5QVVRfRk9STUFUX1NFVFVQX1NJTkdMRSxcbiAgICAgICAgICAgIHRoaXMucG9ydElkLCBtb2RlLCB0b1VpbnQzMihkZWx0YUludGVydmFsKSwgbm90aWZpY2F0aW9uRW5hYmxlZCA/IDB4MDEgOiAwKVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RGF0YVZpZXd9IG1zZyBcbiAgICAgKi9cbiAgICBkZWNvZGVWYWx1ZShtc2cpIHtcblxuICAgIH1cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0RhdGFWaWV3fSBtc2cgXG4gICAgICovXG4gICAgaGFuZGxlVmFsdWUobXNnKSB7XG4gICAgICAgIGxldCB2YWx1ZSA9IHRoaXMuZGVjb2RlVmFsdWUobXNnKVxuXG4gICAgICAgIGlmICh2YWx1ZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMudmFsdWVDYWxsYmFja3MuZW1pdCh2YWx1ZSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGhhbmRsZUZlZWRiYWNrKCkge1xuICAgICAgICBpZiAodHlwZW9mIHRoaXMuZmVlZGJhY2tDYWxsYmFjayA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aGlzLmZlZWRiYWNrQ2FsbGJhY2soKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG1vZGUgXG4gICAgICogQHJldHVybnMgXG4gICAgKi9cbiAgICBhc3luYyBnZXRWYWx1ZShtb2RlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdnZXRWYWx1ZScsIHRoaXMucG9ydElkLCB7IG1vZGUgfSlcbiAgICAgICAgYXdhaXQgdGhpcy5zZXRNb2RlKG1vZGUsIGZhbHNlKVxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIHRoaXMudmFsdWVDYWxsYmFja3Mub24oKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmh1YkRldmljZS5zZW5kTXNnKE1lc3NhZ2VUeXBlLlBPUlRfSU5GT1JNQVRJT05fUkVRVUVTVCwgdGhpcy5wb3J0SWQsIDB4MDApXG5cbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbW9kZSBcbiAgICAgKiBAcGFyYW0geyhkYXRhKSA9PiBib29sZWFufSB0ZXN0Rm4gXG4gICAgICogQHJldHVybnMgXG4gICAgICovXG4gICAgYXN5bmMgd2FpdFRlc3RWYWx1ZShtb2RlLCB0ZXN0Rm4pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldE1vZGUobW9kZSwgdHJ1ZSlcbiAgICAgICAgICAgIHRoaXMudmFsdWVDYWxsYmFja3Mub24oYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgbG9nKCd3YWl0VGVzdFZhbHVlJywgdmFsdWUpXG4gICAgICAgICAgICAgICAgaWYgKHRlc3RGbih2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nKCd3YWl0VGVzdFZhbHVlIE9LJylcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRNb2RlKG1vZGUsIGZhbHNlKVxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIFxuICAgICAgICB9KVxuICAgIH1cblxuICAgIGFzeW5jIHN1YnNjcmliZShtb2RlLCBjYmssIGRlbHRhSW50ZXJ2YWwgPSAxKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0TW9kZShtb2RlLCB0cnVlLCBkZWx0YUludGVydmFsKVxuICAgICAgICB0aGlzLnZhbHVlQ2FsbGJhY2tzLm9uKChkYXRhKSA9PiB7XG4gICAgICAgICAgICBjYmsoZGF0YSlcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9KVxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBEZXZpY2UiLCIvL0B0cy1jaGVja1xuXG5jb25zdCBEZXZpY2UgPSByZXF1aXJlKCcuL0RldmljZScpXG5jb25zdCB7QnJha2luZ1N0eWxlfSA9IHJlcXVpcmUoJy4vQ29uc3QnKVxuY29uc3Qge3RvSW50MTYsIHRvSW50MzJ9ID0gcmVxdWlyZSgnLi9VdGlsJylcblxuY29uc3QgbWF4UG93ZXIgPSAxMDBcblxuY2xhc3MgRG91YmxlTW90b3IgZXh0ZW5kcyBEZXZpY2Uge1xuXG5cbiAgICBjb25zdHJ1Y3RvcihodWJEZXZpY2UsIHBvcnRJZCwgbmFtZSkge1xuICAgICAgICBzdXBlcihodWJEZXZpY2UsIHBvcnRJZCwgJ1ZpcnR1YWwgRGV2aWNlJywgbmFtZSlcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzcGVlZDEgXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNwZWVkMiBcbiAgICAgKiBAcmV0dXJucyBcbiAgICAgKi9cbiAgICBzZXRTcGVlZChzcGVlZDEsIHNwZWVkMikge1xuICAgICAgICByZXR1cm4gdGhpcy53cml0ZVBvcnRDb21tYW5kKGZhbHNlLCAweDA4LCBzcGVlZDEsIHNwZWVkMiwgbWF4UG93ZXIsIDApXG4gICAgfVxuXG4gICAgc2V0U3BlZWRGb3JUaW1lKHNwZWVkMSwgc3BlZWQyLCB0aW1lLCB3YWl0RmVlZGJhY2sgPSBmYWxzZSwgYnJha2luZ1N0eWxlID0gQnJha2luZ1N0eWxlLkJSQUtFKSB7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ3NldFNwZWVkRm9yVGltZScsIHRoaXMucG9ydElkLCB7IHNwZWVkMSwgc3BlZWQyLCB0aW1lLCB3YWl0RmVlZGJhY2ssIGJyYWtpbmdTdHlsZSB9KVxuICAgICAgICByZXR1cm4gdGhpcy53cml0ZVBvcnRDb21tYW5kKHRoaXMucG9ydElkLCB3YWl0RmVlZGJhY2ssIDB4MEEsIHRvSW50MTYodGltZSksIHNwZWVkMSwgc3BlZWQyLCBtYXhQb3dlciwgYnJha2luZ1N0eWxlKVxuICAgIH1cblxuICAgIHJvdGF0ZURlZ3JlZXMoZGVncmVlcywgc3BlZWQxLCBzcGVlZDIsIHdhaXRGZWVkYmFjaywgYnJha2luZ1N0eWxlID0gQnJha2luZ1N0eWxlLkJSQUtFKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdyb3RhdGVEZWdyZWVzJywgdGhpcy5wb3J0SWQsIHsgZGVncmVlcywgc3BlZWQxLCBzcGVlZDIsIHdhaXRGZWVkYmFjaywgYnJha2luZ1N0eWxlIH0pXG4gICAgICAgIHJldHVybiB0aGlzLndyaXRlUG9ydENvbW1hbmQod2FpdEZlZWRiYWNrLCAweDBDLCB0b0ludDMyKGRlZ3JlZXMpLCBzcGVlZDEsIHNwZWVkMiwgbWF4UG93ZXIsIGJyYWtpbmdTdHlsZSlcbiAgICB9XG5cbiAgICBnb3RvQW5nbGUoYW5nbGUxLCBhbmdsZTIsIHNwZWVkLCB3YWl0RmVlZGJhY2ssIGJyYWtpbmdTdHlsZSA9IEJyYWtpbmdTdHlsZS5CUkFLRSkge1xuICAgICAgICBjb25zb2xlLmxvZygnZ290b0FuZ2xlJywgdGhpcy5wb3J0SWQsIHsgYW5nbGUxLCBhbmdsZTIsIHNwZWVkLCB3YWl0RmVlZGJhY2ssIGJyYWtpbmdTdHlsZSB9KVxuXG4gICAgICAgIHJldHVybiB0aGlzLndyaXRlUG9ydENvbW1hbmQod2FpdEZlZWRiYWNrLCAweDBFLCB0b0ludDMyKGFuZ2xlMSksIHRvSW50MzIoYW5nbGUyKSwgc3BlZWQsIG1heFBvd2VyLCBicmFraW5nU3R5bGUpXG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IERvdWJsZU1vdG9yIiwiLy9AdHMtY2hlY2tcblxuY29uc3QgRGV2aWNlID0gcmVxdWlyZSgnLi9EZXZpY2UnKVxuY29uc3Qge1BvcnRNYXBOYW1lcywgRGV2aWNlTW9kZX0gPSByZXF1aXJlKCcuL0NvbnN0JylcblxuY2xhc3MgTGVkIGV4dGVuZHMgRGV2aWNlIHtcblxuICAgIC8qKlxuICAgICogXG4gICAgKiBAcGFyYW0ge0h1YkRldmljZX0gaHViRGV2aWNlIFxuICAgICogQHBhcmFtIHtudW1iZXJ9IHBvcnRJZCBcbiAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGh1YkRldmljZSwgcG9ydElkLCB0eXBlKSB7XG4gICAgICAgIHN1cGVyKGh1YkRldmljZSwgcG9ydElkLCB0eXBlLCBQb3J0TWFwTmFtZXNbcG9ydElkXSlcblxuICAgIH1cblxuICAgIGFzeW5jIHNldENvbG9yKGNvbG9yKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdzZXRDb2xvcicsIHRoaXMucG9ydElkLCB7IGNvbG9yIH0pXG4gICAgICAgIGF3YWl0IHRoaXMuc2V0TW9kZShEZXZpY2VNb2RlLkNPTE9SLCBmYWxzZSlcbiAgICAgICAgcmV0dXJuIHRoaXMud3JpdGVEaXJlY3RNb2RlKERldmljZU1vZGUuQ09MT1IsIGZhbHNlLCBjb2xvcilcbiAgICB9XG5cbiAgICBhc3luYyBzZXRSR0JDb2xvcihyLCBnLCBiKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdzZXRDb2xvcicsIHRoaXMucG9ydElkLCB7IHIsIGcsIGIgfSlcbiAgICAgICAgYXdhaXQgdGhpcy5zZXRNb2RlKERldmljZU1vZGUuUkdCLCBmYWxzZSlcbiAgICAgICAgcmV0dXJuIHRoaXMud3JpdGVEaXJlY3RNb2RlKERldmljZU1vZGUuUkdCLCBmYWxzZSwgciwgZywgYilcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTGVkIiwiLy9AdHMtY2hlY2tcblxuY29uc3QgRGV2aWNlID0gcmVxdWlyZSgnLi9EZXZpY2UnKVxuY29uc3Qge1BvcnRNYXBOYW1lcywgRGV2aWNlTW9kZSwgQnJha2luZ1N0eWxlfSA9IHJlcXVpcmUoJy4vQ29uc3QnKVxuY29uc3Qge3RvSW50MzIsIHRvSW50MTZ9ID0gcmVxdWlyZSgnLi9VdGlsJylcblxuY29uc3QgbWF4UG93ZXIgPSAxMDBcblxuY2xhc3MgTW90b3IgZXh0ZW5kcyBEZXZpY2Uge1xuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtIdWJEZXZpY2V9IGh1YkRldmljZSBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcG9ydElkIFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGh1YkRldmljZSwgcG9ydElkLCB0eXBlKSB7XG4gICAgICAgIHN1cGVyKGh1YkRldmljZSwgcG9ydElkLCB0eXBlLCBQb3J0TWFwTmFtZXNbcG9ydElkXSlcbiAgICB9XG5cbiAgICBzZXRQb3dlcihwb3dlcikge1xuICAgICAgICBjb25zb2xlLmxvZygnc2V0UG93ZXInLCB0aGlzLnBvcnRJZCwgeyBwb3dlciB9KVxuICAgICAgICByZXR1cm4gdGhpcy53cml0ZURpcmVjdE1vZGUoRGV2aWNlTW9kZS5QT1dFUiwgZmFsc2UsIHBvd2VyKVxuICAgIH1cblxuICAgIHNldFNwZWVkKHNwZWVkKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdzZXRTcGVlZCcsIHRoaXMucG9ydElkLCB7IHNwZWVkIH0pXG4gICAgICAgIHJldHVybiB0aGlzLndyaXRlUG9ydENvbW1hbmQoZmFsc2UsIDB4MDcsIHNwZWVkLCBtYXhQb3dlciwgMClcbiAgICB9XG5cbiAgICByb3RhdGVEZWdyZWVzKGRlZ3JlZXMsIHNwZWVkLCB3YWl0RmVlZGJhY2ssIGJyYWtpbmdTdHlsZSA9IEJyYWtpbmdTdHlsZS5CUkFLRSkge1xuICAgICAgICBjb25zb2xlLmxvZygncm90YXRlRGVncmVlcycsIHRoaXMucG9ydElkLCB7IGRlZ3JlZXMsIHNwZWVkLCB3YWl0RmVlZGJhY2ssIGJyYWtpbmdTdHlsZSB9KVxuICAgICAgICByZXR1cm4gdGhpcy53cml0ZVBvcnRDb21tYW5kKHdhaXRGZWVkYmFjaywgMHgwQiwgdG9JbnQzMihkZWdyZWVzKSwgc3BlZWQsIG1heFBvd2VyLCBicmFraW5nU3R5bGUpXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGFuZ2xlIFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzcGVlZCBcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHdhaXRGZWVkYmFjayBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYnJha2luZ1N0eWxlIFxuICAgICAqIEByZXR1cm5zIFxuICAgICAqL1xuICAgIGdvdG9BbmdsZShhbmdsZSwgc3BlZWQsIHdhaXRGZWVkYmFjaywgYnJha2luZ1N0eWxlID0gQnJha2luZ1N0eWxlLkJSQUtFKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdnb3RvQW5nbGUnLCB0aGlzLnBvcnRJZCwgeyBhbmdsZSwgc3BlZWQsIHdhaXRGZWVkYmFjaywgYnJha2luZ1N0eWxlIH0pXG5cbiAgICAgICAgaWYgKHRoaXMuY2FsaWJyYXRpb25WYWx1ZSkge1xuICAgICAgICAgICAgYW5nbGUgKj0gdGhpcy5jYWxpYnJhdGlvblZhbHVlXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy53cml0ZVBvcnRDb21tYW5kKHdhaXRGZWVkYmFjaywgMHgwRCwgdG9JbnQzMihhbmdsZSksIHNwZWVkLCBtYXhQb3dlciwgYnJha2luZ1N0eWxlKVxuICAgIH1cblxuICAgIHNldFNwZWVkRm9yVGltZShzcGVlZCwgdGltZSwgd2FpdEZlZWRiYWNrID0gZmFsc2UsIGJyYWtpbmdTdHlsZSA9IEJyYWtpbmdTdHlsZS5CUkFLRSkge1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdzZXRTcGVlZEZvclRpbWUnLCB0aGlzLnBvcnRJZCwgeyBzcGVlZCwgdGltZSwgd2FpdEZlZWRiYWNrLCBicmFraW5nU3R5bGUgfSlcbiAgICAgICAgcmV0dXJuIHRoaXMud3JpdGVQb3J0Q29tbWFuZCh3YWl0RmVlZGJhY2ssIDB4MDksIHRvSW50MTYodGltZSksIHNwZWVkLCBtYXhQb3dlciwgYnJha2luZ1N0eWxlKVxuICAgIH1cblxuICAgIHJlc2V0WmVybygpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3Jlc2V0WmVybycsIHRoaXMucG9ydElkKVxuICAgICAgICByZXR1cm4gdGhpcy53cml0ZURpcmVjdE1vZGUoRGV2aWNlTW9kZS5ST1RBVElPTiwgdHJ1ZSwgMHgwMCwgMHgwMCwgMHgwMCwgMHgwMClcbiAgICB9XG5cblxuICAgIGFzeW5jIGNhbGlicmF0ZSgpIHtcblxuICAgICAgICBjb25zb2xlLmxvZygnY2FsaWJyYXRlJywgdGhpcy5wb3J0SWQpXG4gICAgICAgIHRoaXMuc2V0UG93ZXIoNTApXG4gICAgICAgIGF3YWl0IHRoaXMud2FpdFRlc3RWYWx1ZShEZXZpY2VNb2RlLlNQRUVELCAodmFsdWUpID0+IHZhbHVlID4gMTApXG4gICAgICAgIGF3YWl0IHRoaXMud2FpdFRlc3RWYWx1ZShEZXZpY2VNb2RlLlNQRUVELCAodmFsdWUpID0+IHZhbHVlID09IDApXG5cblxuICAgICAgICB0aGlzLnNldFBvd2VyKDApXG5cbiAgICAgICAgYXdhaXQgJCQudXRpbC53YWl0KDEwMDApXG5cbiAgICAgICAgLy8gYXdhaXQgdGhpcy5odWJEZXZpY2Uuc2V0UG9ydEZvcm1hdCh0aGlzLnBvcnRJZCwgRGV2aWNlTW9kZS5ST1RBVElPTilcbiAgICAgICAgLy8gbGV0IHZhbHVlID0gYXdhaXQgdGhpcy5odWJEZXZpY2UuZ2V0UG9ydFZhbHVlKHRoaXMucG9ydElkKVxuICAgICAgICAvLyBjb25zb2xlLmxvZyh2YWx1ZSlcdFxuXG4gICAgICAgIGF3YWl0IHRoaXMucmVzZXRaZXJvKClcblxuXG4gICAgICAgIHRoaXMuc2V0UG93ZXIoLTUwKVxuICAgICAgICBhd2FpdCB0aGlzLndhaXRUZXN0VmFsdWUoRGV2aWNlTW9kZS5TUEVFRCwgKHZhbHVlKSA9PiBNYXRoLmFicyh2YWx1ZSkgPiAxMClcbiAgICAgICAgYXdhaXQgdGhpcy53YWl0VGVzdFZhbHVlKERldmljZU1vZGUuU1BFRUQsICh2YWx1ZSkgPT4gdmFsdWUgPT0gMClcblxuICAgICAgICB0aGlzLnNldFBvd2VyKDApXG4gICAgICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgdGhpcy5nZXRWYWx1ZShEZXZpY2VNb2RlLlJPVEFUSU9OKVxuICAgICAgICBjb25zb2xlLmxvZyh2YWx1ZSlcbiAgICAgICAgY29uc3Qgb2Zmc2V0ID0gTWF0aC5mbG9vcih2YWx1ZSAvIDIpXG4gICAgICAgIGNvbnNvbGUubG9nKHsgb2Zmc2V0IH0pXG4gICAgICAgIGF3YWl0IHRoaXMuZ290b0FuZ2xlKG9mZnNldCwgMTAsIHRydWUpXG4gICAgICAgIGF3YWl0IHRoaXMucmVzZXRaZXJvKClcbiAgICAgICAgdGhpcy5jYWxpYnJhdGlvblZhbHVlID0gTWF0aC5hYnMob2Zmc2V0KVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RGF0YVZpZXd9IG1zZyBcbiAgICAgKi9cbiAgICBkZWNvZGVWYWx1ZShtc2cpIHtcbiAgICAgICAgbGV0IHZhbHVlXG4gICAgICAgIHN3aXRjaCAodGhpcy5tb2RlKSB7XG4gICAgICAgICAgICBjYXNlIERldmljZU1vZGUuQUJTT0xVVEU6XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBtc2cuZ2V0SW50MTYoNCwgdHJ1ZSlcbiAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgY2FzZSBEZXZpY2VNb2RlLlJPVEFUSU9OOlxuICAgICAgICAgICAgICAgIHZhbHVlID0gbXNnLmdldEludDMyKDQsIHRydWUpXG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgIGNhc2UgRGV2aWNlTW9kZS5TUEVFRDpcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IG1zZy5nZXRJbnQ4KDQpXG4gICAgICAgICAgICAgICAgYnJlYWtcblxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZVxuICAgIH1cblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE1vdG9yIiwiLy9AdHMtY2hlY2tcblxuY29uc3QgRGV2aWNlID0gcmVxdWlyZSgnLi9EZXZpY2UnKVxuY29uc3Qge1BvcnRNYXBOYW1lcywgRGV2aWNlTW9kZX0gPSByZXF1aXJlKCcuL0NvbnN0JylcblxuY2xhc3MgVGlsdFNlbnNvciBleHRlbmRzIERldmljZSB7XG4gICAgY29uc3RydWN0b3IoaHViRGV2aWNlLCBwb3J0SWQsIHR5cGUpIHtcbiAgICAgICAgc3VwZXIoaHViRGV2aWNlLCBwb3J0SWQsIHR5cGUsIFBvcnRNYXBOYW1lc1twb3J0SWRdKVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RGF0YVZpZXd9IG1zZyBcbiAgICAgKi9cbiAgICBkZWNvZGVWYWx1ZShtc2cpIHtcbiAgICAgICAgbGV0IHZhbHVlXG4gICAgICAgIHN3aXRjaCAodGhpcy5tb2RlKSB7XG4gICAgICAgICAgICBjYXNlIERldmljZU1vZGUuVElMVF9QT1M6XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB7XG4gICAgICAgICAgICAgICAgICAgIHlhdzogbXNnLmdldEludDE2KDQsIHRydWUpLFxuICAgICAgICAgICAgICAgICAgICBwaXRjaDogbXNnLmdldEludDE2KDYsIHRydWUpLFxuICAgICAgICAgICAgICAgICAgICByb2xsOiBtc2cuZ2V0SW50MTYoOCwgdHJ1ZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWVcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVGlsdFNlbnNvclxuIiwiLy9AdHMtY2hlY2tcblxuLyoqXG4gICogXG4gICogQHBhcmFtIHtudW1iZXJ9IHZhbCBcbiAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICovXG5mdW5jdGlvbiB0b0ludDE2KHZhbCkge1xuICAgIGNvbnN0IGJ1ZmYgPSBuZXcgVWludDhBcnJheSgyKVxuICAgIGNvbnN0IHZpZXcgPSBuZXcgRGF0YVZpZXcoYnVmZi5idWZmZXIpXG4gICAgdmlldy5zZXRJbnQxNigwLCB2YWwsIHRydWUpXG4gICAgcmV0dXJuIEFycmF5LmZyb20oYnVmZilcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWwgXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cbmZ1bmN0aW9uIHRvSW50MzIodmFsKSB7XG4gICAgY29uc3QgYnVmZiA9IG5ldyBVaW50OEFycmF5KDQpXG4gICAgY29uc3QgdmlldyA9IG5ldyBEYXRhVmlldyhidWZmLmJ1ZmZlcilcbiAgICB2aWV3LnNldEludDMyKDAsIHZhbCwgdHJ1ZSlcbiAgICByZXR1cm4gQXJyYXkuZnJvbShidWZmKVxufVxuXG5mdW5jdGlvbiB0b1VpbnQzMih2YWwpIHtcbiAgICBjb25zdCBidWZmID0gbmV3IFVpbnQ4QXJyYXkoNClcbiAgICBjb25zdCB2aWV3ID0gbmV3IERhdGFWaWV3KGJ1ZmYuYnVmZmVyKVxuICAgIHZpZXcuc2V0VWludDMyKDAsIHZhbCwgdHJ1ZSlcbiAgICByZXR1cm4gQXJyYXkuZnJvbShidWZmKVxufVxuXG5jb25zdCBkZWJ1ZyA9IGZhbHNlXG5cbmNvbnN0IGxvZyA9IGZ1bmN0aW9uICguLi5kYXRhKSB7XG4gICAgaWYgKGRlYnVnKSB7XG4gICAgICAgIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGRhdGEpXG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICB0b0ludDE2LFxuICAgIHRvSW50MzIsXG4gICAgdG9VaW50MzIsXG4gICAgbG9nXG59IiwiLy9AdHMtY2hlY2tcblxuKGZ1bmN0aW9uICgpIHtcblxuICAgIGNvbnN0IENhbGxiYWNrRW1pdHRlciA9IHJlcXVpcmUoJy4vQ2FsbGJhY2tFbWl0dGVyJylcbiAgICBjb25zdCB7RXZlbnROYW1lcywgRGV2aWNlTW9kZSwgRGV2aWNlVHlwZU5hbWVzLCBCcmFraW5nU3R5bGUsIFBvcnRNYXAsIEh1YlByb3BlcnR5UGF5bG9hZE5hbWVzLCBNb2RlSW5mb3JtYXRpb25UeXBlTmFtZXMsIEV2ZW50LCBEZXZpY2VUeXBlLCBQb3J0TWFwTmFtZXMsIE1lc3NhZ2VUeXBlLCBIdWJQcm9wZXJ0eVBheWxvYWQsIE1vZGVJbmZvcm1hdGlvblR5cGUsIEVycm9yQ29kZU5hbWVzLCBNZXNzYWdlVHlwZU5hbWVzfSA9IHJlcXVpcmUoJy4vQ29uc3QnKVxuICAgIGNvbnN0IE1vdG9yID0gcmVxdWlyZSgnLi9Nb3RvcicpXG4gICAgY29uc3QgRG91YmxlTW90b3IgPSByZXF1aXJlKCcuL0RvdWJsZU1vdG9yJylcbiAgICBjb25zdCBEZXZpY2UgPSByZXF1aXJlKCcuL0RldmljZScpXG4gICAgY29uc3QgTGVkID0gcmVxdWlyZSgnLi9MZWQnKVxuICAgIGNvbnN0IFRpbHRTZW5zb3IgPSByZXF1aXJlKCcuL1RpbHRTZW5zb3InKVxuICAgIGNvbnN0IHtsb2d9ID0gcmVxdWlyZSgnLi9VdGlsJylcblxuICAgIGNvbnN0IENvbG9yID0ge1xuICAgICAgICBCTEFDSzogMCxcbiAgICAgICAgUElOSzogMSxcbiAgICAgICAgUFVSUExFOiAyLFxuICAgICAgICBCTFVFOiAzLFxuICAgICAgICBMSUdIVF9CTFVFOiA0LFxuICAgICAgICBDWUFOOiA1LFxuICAgICAgICBHUkVFTjogNixcbiAgICAgICAgWUVMTE9XOiA3LFxuICAgICAgICBPUkFOR0U6IDgsXG4gICAgICAgIFJFRDogOSxcbiAgICAgICAgV0hJVEU6IDEwLFxuICAgICAgICBOT05FOiAyNTVcbiAgICB9XG5cbiAgICBjb25zdCBMUEYyX1NFUlZJQ0VfVVVJRCA9ICcwMDAwMTYyMy0xMjEyLWVmZGUtMTYyMy03ODVmZWFiY2QxMjMnXG4gICAgY29uc3QgTFBGMl9DSEFSQUNfVVVJRCA9ICcwMDAwMTYyNC0xMjEyLWVmZGUtMTYyMy03ODVmZWFiY2QxMjMnXG5cbiBcbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0FycmF5QnVmZmVyfSBidWYgXG4gICAgICovXG4gICAgZnVuY3Rpb24gYWJUb1N0cmluZyhidWYpIHtcbiAgICAgICAgY29uc3QgdWludDhidWZmID0gbmV3IFVpbnQ4QXJyYXkoYnVmKVxuICAgICAgICBsZXQgcmV0ID0gXCJcIlxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHVpbnQ4YnVmZi5ieXRlTGVuZ3RoICYmIHVpbnQ4YnVmZltpXSAhPSAwOyBpKyspIHtcbiAgICAgICAgICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHVpbnQ4YnVmZltpXSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0XG4gICAgfVxuXG5cbiBcblxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSAgey4uLmFueX0gZGF0YSBcbiAgICAgKiBAcmV0dXJucyB7QXJyYXlCdWZmZXJ9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZm9ybWF0TXNnKG1zZ1R5cGUsIC4uLmRhdGEpIHtcbiAgICAgICAgY29uc3QgYnVmZiA9IGRhdGEuZmxhdCgzKVxuICAgICAgICBjb25zdCBtc2dMZW4gPSBidWZmLmxlbmd0aCArIDNcbiAgICAgICAgY29uc3QgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKG1zZ0xlbilcbiAgICAgICAgY29uc3QgdWludDhCdWZmZXIgPSBuZXcgVWludDhBcnJheShidWZmZXIpXG4gICAgICAgIHVpbnQ4QnVmZmVyWzBdID0gbXNnTGVuXG4gICAgICAgIHVpbnQ4QnVmZmVyWzFdID0gMFxuICAgICAgICB1aW50OEJ1ZmZlclsyXSA9IG1zZ1R5cGVcbiAgICAgICAgdWludDhCdWZmZXIuc2V0KGJ1ZmYsIDMpXG4gICAgICAgIHJldHVybiBidWZmZXJcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIGdldFZpcnR1YWxQb3J0TmFtZShwb3J0SWQxLCBwb3J0SWQyKSB7XG4gICAgICAgIGNvbnN0IHBvcnRJZEEgPSBQb3J0TWFwTmFtZXNbcG9ydElkMV1cbiAgICAgICAgY29uc3QgcG9ydElkQiA9IFBvcnRNYXBOYW1lc1twb3J0SWQyXVxuICAgICAgICByZXR1cm4gYCR7cG9ydElkQX1fJHtwb3J0SWRCfWBcbiAgICB9XG5cbiAgICBjb25zdCBjb25zdHJ1Y3Rvck1hcCA9IHtcbiAgICAgICAgW0RldmljZVR5cGUuVEVDSE5JQ19MQVJHRV9MSU5FQVJfTU9UT1JdOiBNb3RvcixcbiAgICAgICAgW0RldmljZVR5cGUuVEVDSE5JQ19MQVJHRV9BTkdVTEFSX01PVE9SX0dSRVldOiBNb3RvcixcbiAgICAgICAgW0RldmljZVR5cGUuVEVDSE5JQ19YTEFSR0VfTElORUFSX01PVE9SXTogTW90b3IsXG4gICAgICAgIFtEZXZpY2VUeXBlLlRFQ0hOSUNfTUVESVVNX0hVQl9USUxUX1NFTlNPUl06IFRpbHRTZW5zb3IsXG4gICAgICAgIFtEZXZpY2VUeXBlLkhVQl9MRURdOiBMZWRcbiAgICB9XG5cbiAgICAvKipAaW1wbGVtZW50cyBIVUIuSHViRGV2aWNlICovXG4gICAgY2xhc3MgSHViRGV2aWNlIGV4dGVuZHMgRXZlbnRFbWl0dGVyMiB7XG5cbiAgICAgICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgICAgICBzdXBlcigpXG4gICAgICAgICAgICB0aGlzLmNoYXJhYyA9IG51bGxcbiAgICAgICAgICAgIHRoaXMucG9ydENtZFF1ZXVlID0ge31cbiAgICAgICAgICAgIHRoaXMucG9ydENtZENhbGxiYWNrID0ge31cbiAgICAgICAgICAgIC8qKkB0eXBlIHt7W3BvcnRJZDogc3RyaW5nXTogRGV2aWNlfX0gKi9cbiAgICAgICAgICAgIHRoaXMuaHViRGV2aWNlcyA9IHt9XG4gICAgICAgICAgICB0aGlzLmJ1c3kgPSBmYWxzZVxuICAgICAgICAgICAgdGhpcy5jbWRRdWV1ZSA9IFtdXG4gICAgICAgICAgICB0aGlzLmF0dGFjaENhbGxiYWNrcyA9IG5ldyBDYWxsYmFja0VtaXR0ZXIoKVxuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAcGFyYW0ge0JsdWV0b290aERldmljZX0gZGV2aWNlIFxuICAgICAgICAgKi9cbiAgICAgICAgYXN5bmMgaW5pdChkZXZpY2UpIHtcblxuICAgICAgICAgICAgY29uc3Qgc2VydmVyID0gYXdhaXQgZGV2aWNlLmdhdHQuY29ubmVjdCgpXG4gICAgICAgICAgICBsb2coJ0Nvbm5lY3RlZCcpXG4gICAgICAgICAgICBjb25zdCBzZXJ2aWNlID0gYXdhaXQgc2VydmVyLmdldFByaW1hcnlTZXJ2aWNlKExQRjJfU0VSVklDRV9VVUlEKVxuICAgICAgICAgICAgdGhpcy5jaGFyYWMgPSBhd2FpdCBzZXJ2aWNlLmdldENoYXJhY3RlcmlzdGljKExQRjJfQ0hBUkFDX1VVSUQpXG5cbiAgICAgICAgICAgIGNvbnN0IG9uQ2hhcmFjdGVyaXN0aWN2YWx1ZWNoYW5nZWQgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmRlY29kZU1zZyhldmVudC50YXJnZXQudmFsdWUpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRldmljZS5hZGRFdmVudExpc3RlbmVyKCdnYXR0c2VydmVyZGlzY29ubmVjdGVkJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdvbkdhdHRTZXJ2ZXJEaXNjb25uZWN0ZWQnLCB0aGlzKVxuICAgICAgICAgICAgICAgIHRoaXMuY2hhcmFjLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NoYXJhY3RlcmlzdGljdmFsdWVjaGFuZ2VkJywgb25DaGFyYWN0ZXJpc3RpY3ZhbHVlY2hhbmdlZClcblxuICAgICAgICAgICAgICAgIHRoaXMuY2hhcmFjID0gbnVsbFxuICAgICAgICAgICAgICAgIHRoaXMuZW1pdCgnZGlzY29ubmVjdGVkJylcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIHRoaXMuY2hhcmFjLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYXJhY3RlcmlzdGljdmFsdWVjaGFuZ2VkJywgb25DaGFyYWN0ZXJpc3RpY3ZhbHVlY2hhbmdlZClcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY2hhcmFjLnN0YXJ0Tm90aWZpY2F0aW9ucygpXG4gICAgICAgICAgICBhd2FpdCAkJC51dGlsLndhaXQoMTAwKVxuICAgICAgICB9XG5cbiAgICAgICAgYXN5bmMgc3RhcnROb3RpZmljYXRpb24oKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNlbmRNc2coTWVzc2FnZVR5cGUuSFVCX1BST1BFUlRJRVMsIEh1YlByb3BlcnR5UGF5bG9hZC5CQVRURVJZX1ZPTFRBR0UsIDB4MDIpXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNlbmRNc2coTWVzc2FnZVR5cGUuSFVCX1BST1BFUlRJRVMsIEh1YlByb3BlcnR5UGF5bG9hZC5TWVNURU1fVFlQRV9JRCwgMHgwNSlcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2VuZE1zZyhNZXNzYWdlVHlwZS5IVUJfUFJPUEVSVElFUywgSHViUHJvcGVydHlQYXlsb2FkLlBSSU1BUllfTUFDX0FERFJFU1MsIDB4MDUpXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNlbmRNc2coTWVzc2FnZVR5cGUuSFVCX0FMRVJUUywgMHgwMSwgMHgwMSlcbiAgICAgICAgICAgIC8vIGF3YWl0IHRoaXMuc2VuZE1zZyhNZXNzYWdlVHlwZS5IVUJfQUxFUlRTLCAweDAyLCAweDAxKVxuICAgICAgICAgICAgLy8gYXdhaXQgdGhpcy5zZW5kTXNnKE1lc3NhZ2VUeXBlLkhVQl9BTEVSVFMsIDB4MDMsIDB4MDEpXG4gICAgICAgICAgICAvLyBhd2FpdCB0aGlzLnNlbmRNc2coTWVzc2FnZVR5cGUuSFVCX0FMRVJUUywgMHgwNCwgMHgwMSlcblxuICAgICAgICB9XG5cblxuICAgICAgICAvKipcbiAgICAgICAgICogXG4gICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwb3J0SWQgXG4gICAgICAgICAqIEByZXR1cm5zIHtQcm9taXNlPE1vdG9yPn1cbiAgICAgICAgICovXG4gICAgICAgIGdldE1vdG9yKHBvcnRJZCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2UgPSB0aGlzLmh1YkRldmljZXNbcG9ydElkXVxuICAgICAgICAgICAgICAgIGlmIChkZXZpY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRldmljZSBpbnN0YW5jZW9mIE1vdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGRldmljZSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCgpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNoQ2FsbGJhY2tzLm9uKChkZXZpY2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkZXZpY2UucG9ydElkID09IHBvcnRJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZyhgZGV2aWNlIG9uIHBvcnRJZCAke3BvcnRJZH0gaXMgcmVhZHlgKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZGV2aWNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gcG9ydElkIFxuICAgICAgICAgKiBAcmV0dXJucyB7UHJvbWlzZTxUaWx0U2Vuc29yPn1cbiAgICAgICAgICovXG4gICAgICAgIGdldFRpbHRTZW5zb3IocG9ydElkKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZSA9IHRoaXMuaHViRGV2aWNlc1twb3J0SWRdXG4gICAgICAgICAgICAgICAgaWYgKGRldmljZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGV2aWNlIGluc3RhbmNlb2YgVGlsdFNlbnNvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShkZXZpY2UpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmF0dGFjaENhbGxiYWNrcy5vbigoZGV2aWNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGV2aWNlLnBvcnRJZCA9PSBwb3J0SWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2coYGRldmljZSBvbiBwb3J0SWQgJHtwb3J0SWR9IGlzIHJlYWR5YClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGRldmljZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcblxuICAgICAgICB9XG5cbiAgICAgICAgZ2V0TGVkKHBvcnRJZCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXZpY2UgPSB0aGlzLmh1YkRldmljZXNbcG9ydElkXVxuICAgICAgICAgICAgICAgIGlmIChkZXZpY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRldmljZSBpbnN0YW5jZW9mIExlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShkZXZpY2UpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmF0dGFjaENhbGxiYWNrcy5vbigoZGV2aWNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGV2aWNlLnBvcnRJZCA9PSBwb3J0SWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2coYGRldmljZSBvbiBwb3J0SWQgJHtwb3J0SWR9IGlzIHJlYWR5YClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGRldmljZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkgICAgXG4gICAgICAgIH1cblxuICAgICAgICBhc3luYyBnZXREYmxNb3Rvcihwb3J0SWQxLCBwb3J0SWQyKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gZ2V0VmlydHVhbFBvcnROYW1lKHBvcnRJZDEsIHBvcnRJZDIpXG4gICAgICAgICAgICAgICAgY29uc3QgZGV2aWNlID0gT2JqZWN0LnZhbHVlcyh0aGlzLmh1YkRldmljZXMpLmZpbmQoKGQpID0+IGQubmFtZSA9PSBuYW1lKVxuICAgICAgICAgICAgICAgIGlmIChkZXZpY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShkZXZpY2UpXG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNoQ2FsbGJhY2tzLm9uKChkZXZpY2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkZXZpY2UubmFtZSA9PSBuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYGRldmljZSBvbiBwb3J0SWQgJHtkZXZpY2UucG9ydElkfSBpcyByZWFkeWApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShkZXZpY2UpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuY3JlYXRlVmlydHVhbFBvcnQocG9ydElkMSwgcG9ydElkMilcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAcGFyYW0gIHtBcnJheUJ1ZmZlcn0gYnVmZmVyIFxuICAgICAgICAgKi9cbiAgICAgICAgYXN5bmMgc2VuZEJ1ZmZlcihidWZmZXIpIHtcbiAgICAgICAgICAgIGxvZygnc2VuZEJ1ZmZlcicsIGJ1ZmZlcilcbiAgICAgICAgICAgIGlmICghdGhpcy5idXN5KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5idXN5ID0gdHJ1ZVxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuY2hhcmFjLndyaXRlVmFsdWVXaXRob3V0UmVzcG9uc2UoYnVmZmVyKVxuICAgICAgICAgICAgICAgIHRoaXMuYnVzeSA9IGZhbHNlXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY21kUXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNlbmRCdWZmZXIodGhpcy5jbWRRdWV1ZS5zaGlmdCgpKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9nKCdidXN5IHB1c2ggaW4gcXVldWUnKVxuICAgICAgICAgICAgICAgIHRoaXMuY21kUXVldWUucHVzaChidWZmZXIpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcbiAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IG1zZ1R5cGVcbiAgICAgICAgICogQHBhcmFtICB7Li4uYW55fSBkYXRhIFxuICAgICAgICAgKi9cbiAgICAgICAgc2VuZE1zZyhtc2dUeXBlLCAuLi5kYXRhKSB7XG4gICAgICAgICAgICBsb2coJ3NlbmRNc2cnLCBNZXNzYWdlVHlwZU5hbWVzW21zZ1R5cGVdLCBkYXRhKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VuZEJ1ZmZlcihmb3JtYXRNc2cobXNnVHlwZSwgZGF0YSkpXG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFxuICAgICAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0UG9ydElkRnJvbU5hbWUobmFtZSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpbmZvIG9mIE9iamVjdC52YWx1ZXModGhpcy5odWJEZXZpY2VzKSkge1xuICAgICAgICAgICAgICAgIGlmIChpbmZvLm5hbWUgPT0gbmFtZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaW5mby5wb3J0SWRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IHBvcnRJZDFcbiAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IHBvcnRJZDJcbiAgICAgICAgICovXG4gICAgICAgIGNyZWF0ZVZpcnR1YWxQb3J0KHBvcnRJZDEsIHBvcnRJZDIpIHtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VuZE1zZyhNZXNzYWdlVHlwZS5WSVJUVUFMX1BPUlRfU0VUVVAsIDB4MDEsIHBvcnRJZDEsIHBvcnRJZDIpXG4gICAgICAgIH1cblxuICAgICAgICBzaHV0ZG93bigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlbmRNc2coTWVzc2FnZVR5cGUuSFVCX0FDVElPTlMsIDB4MDEpXG4gICAgICAgIH1cblxuXG4gICAgICAgIGdldEh1YkRldmljZXMoKSB7XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LnZhbHVlcyh0aGlzLmh1YkRldmljZXMpXG4gICAgICAgIH1cblxuICAgICAgICBnZXREZXZpY2VUeXBlKHBvcnRJZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaHViRGV2aWNlc1twb3J0SWRdLnR5cGVcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcbiAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IHBvcnRJZCBcbiAgICAgICAgICogQHJldHVybnMge1Byb21pc2U8SFVCLlBvcnRJbmZvcm1hdGlvbj59XG4gICAgICAgICAqL1xuICAgICAgICBhc3luYyBnZXRQb3J0SW5mb3JtYXRpb24ocG9ydElkKSB7XG4gICAgICAgICAgICBjb25zdCBwb3J0SW5mbyA9IGF3YWl0IHRoaXMuZ2V0UG9ydEluZm9ybWF0aW9uUmVxdWVzdChwb3J0SWQpXG4gICAgICAgICAgICBjb25zdCB7IGNhcGFiaWxpdGllcywgY291bnQsIG91dHB1dCwgaW5wdXQgfSA9IHBvcnRJbmZvXG4gICAgICAgICAgICBjb25zdCBiaXRTZXQgPSBNYXRoLm1heChpbnB1dCwgb3V0cHV0KVxuICAgICAgICAgICAgY29uc3QgbW9kZXMgPSBbXVxuICAgICAgICAgICAgZm9yIChsZXQgbW9kZSA9IDA7IG1vZGUgPCBjb3VudDsgbW9kZSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IHt9XG4gICAgICAgICAgICAgICAgaWYgKGJpdFNldCA+PiBtb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCByZXRcbiAgICAgICAgICAgICAgICAgICAgcmV0ID0gYXdhaXQgdGhpcy5nZXRQb3J0TW9kZUluZm9ybWF0aW9uUmVxdWVzdChwb3J0SWQsIG1vZGUsIE1vZGVJbmZvcm1hdGlvblR5cGUuTkFNRSlcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5uYW1lID0gcmV0Lm5hbWVcbiAgICAgICAgICAgICAgICAgICAgcmV0ID0gYXdhaXQgdGhpcy5nZXRQb3J0TW9kZUluZm9ybWF0aW9uUmVxdWVzdChwb3J0SWQsIG1vZGUsIE1vZGVJbmZvcm1hdGlvblR5cGUuUkFXKVxuICAgICAgICAgICAgICAgICAgICBkYXRhW3JldC50eXBlXSA9IHsgbWluOiByZXQubWluLCBtYXg6IHJldC5tYXggfVxuICAgICAgICAgICAgICAgICAgICByZXQgPSBhd2FpdCB0aGlzLmdldFBvcnRNb2RlSW5mb3JtYXRpb25SZXF1ZXN0KHBvcnRJZCwgbW9kZSwgTW9kZUluZm9ybWF0aW9uVHlwZS5QQ1QpXG4gICAgICAgICAgICAgICAgICAgIGRhdGFbcmV0LnR5cGVdID0geyBtaW46IHJldC5taW4sIG1heDogcmV0Lm1heCB9XG4gICAgICAgICAgICAgICAgICAgIHJldCA9IGF3YWl0IHRoaXMuZ2V0UG9ydE1vZGVJbmZvcm1hdGlvblJlcXVlc3QocG9ydElkLCBtb2RlLCBNb2RlSW5mb3JtYXRpb25UeXBlLlNJKVxuICAgICAgICAgICAgICAgICAgICBkYXRhW3JldC50eXBlXSA9IHsgbWluOiByZXQubWluLCBtYXg6IHJldC5tYXggfVxuICAgICAgICAgICAgICAgICAgICByZXQgPSBhd2FpdCB0aGlzLmdldFBvcnRNb2RlSW5mb3JtYXRpb25SZXF1ZXN0KHBvcnRJZCwgbW9kZSwgTW9kZUluZm9ybWF0aW9uVHlwZS5TWU1CT0wpXG4gICAgICAgICAgICAgICAgICAgIGRhdGEudW5pdCA9IHJldC5zeW1ib2xcbiAgICAgICAgICAgICAgICAgICAgcmV0ID0gYXdhaXQgdGhpcy5nZXRQb3J0TW9kZUluZm9ybWF0aW9uUmVxdWVzdChwb3J0SWQsIG1vZGUsIE1vZGVJbmZvcm1hdGlvblR5cGUuVkFMVUVfRk9STUFUKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IG51bVZhbHVlcywgZGF0YVR5cGUsIHRvdGFsRmlndXJlcywgZGVjaW1hbHMgfSA9IHJldFxuICAgICAgICAgICAgICAgICAgICBkYXRhW3JldC50eXBlXSA9IHsgbnVtVmFsdWVzLCBkYXRhVHlwZSwgdG90YWxGaWd1cmVzLCBkZWNpbWFscyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1vZGVzLnB1c2goZGF0YSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB7IG1vZGVzLCBjYXBhYmlsaXRpZXMgfVxuICAgICAgICB9XG5cblxuICAgICAgICBnZXRQb3J0SW5mb3JtYXRpb25SZXF1ZXN0KHBvcnRJZCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZW5kTXNnKE1lc3NhZ2VUeXBlLlBPUlRfSU5GT1JNQVRJT05fUkVRVUVTVCwgcG9ydElkLCAweDAxKVxuICAgICAgICAgICAgICAgIHRoaXMucG9ydENtZENhbGxiYWNrW3BvcnRJZF0gPSByZXNvbHZlXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cblxuXG4gICAgICAgIGdldFBvcnRNb2RlSW5mb3JtYXRpb25SZXF1ZXN0KHBvcnRJZCwgbW9kZSwgdHlwZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZW5kTXNnKE1lc3NhZ2VUeXBlLlBPUlRfTU9ERV9JTkZPUk1BVElPTl9SRVFVRVNULCBwb3J0SWQsIG1vZGUsIHR5cGUpXG4gICAgICAgICAgICAgICAgdGhpcy5wb3J0Q21kQ2FsbGJhY2tbcG9ydElkXSA9IHJlc29sdmVcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogXG4gICAgICAgICAqIEBwYXJhbSB7RGF0YVZpZXd9IG1zZyBcbiAgICAgICAgICovXG4gICAgICAgIGRlY29kZU1zZyhtc2cpIHtcbiAgICAgICAgICAgIGNvbnN0IGJ1ZmZlckxlbiA9IG1zZy5ieXRlTGVuZ3RoXG4gICAgICAgICAgICBjb25zdCBtc2dMZW4gPSBtc2cuZ2V0VWludDgoMClcbiAgICAgICAgICAgIGNvbnN0IG1zZ1R5cGUgPSBtc2cuZ2V0VWludDgoMilcbiAgICAgICAgICAgIGxvZygnZGVjb2RlTXNnJywgeyBtc2dUeXBlOiBNZXNzYWdlVHlwZU5hbWVzW21zZ1R5cGVdIH0pXG4gICAgICAgICAgICBzd2l0Y2ggKG1zZ1R5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIE1lc3NhZ2VUeXBlLkhVQl9BVFRBQ0hFRF9JTzpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVQb3J0TXNnKG1zZylcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBNZXNzYWdlVHlwZS5HRU5FUklDX0VSUk9SX01FU1NBR0VTOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUdlbmVyaWNFcnJvck1zZyhtc2cpXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgTWVzc2FnZVR5cGUuSFVCX1BST1BFUlRJRVM6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlSHViUHJvcGVydHlSZXNwb25zZShtc2cpXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgY2FzZSBNZXNzYWdlVHlwZS5IVUJfQUxFUlRTOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUh1YkFsZXJ0cyhtc2cpO1xuICAgICAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgICAgIGNhc2UgTWVzc2FnZVR5cGUuUE9SVF9PVVRQVVRfQ09NTUFORF9GRUVEQkFDSzpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVQb3J0Q29tbWFuZEZlZWRiYWNrKG1zZylcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBNZXNzYWdlVHlwZS5QT1JUX01PREVfSU5GT1JNQVRJT046XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlUG9ydE1vZGVJbmZvcm1hdGlvbihtc2cpXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgTWVzc2FnZVR5cGUuUE9SVF9JTkZPUk1BVElPTjpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVQb3J0SW5mb3JtYXRpb24obXNnKVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIE1lc3NhZ2VUeXBlLlBPUlRfVkFMVUVfU0lOR0xFOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVBvcnRWYWx1ZVNpbmdsZShtc2cpXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cblxuICAgICAgICAvKipcbiAgICAgICAgICAqIFxuICAgICAgICAgICogQHBhcmFtIHtEYXRhVmlld30gbXNnIFxuICAgICAgICAgICovXG4gICAgICAgIGhhbmRsZVBvcnRWYWx1ZVNpbmdsZShtc2cpIHtcbiAgICAgICAgICAgIC8vbG9nKCdtc2cnLCBtc2cpXG4gICAgICAgICAgICBjb25zdCBwb3J0SWQgPSBtc2cuZ2V0VWludDgoMylcbiAgICAgICAgICAgIGNvbnN0IG1zZ0xlbiA9IG1zZy5nZXRVaW50OCgwKVxuICAgICAgICAgICAgY29uc3QgZGV2aWNlID0gdGhpcy5odWJEZXZpY2VzW3BvcnRJZF1cbiAgICAgICAgICAgIGxvZygnaGFuZGxlUG9ydFZhbHVlU2luZ2xlJywgeyBtc2dMZW4sIHBvcnRJZCB9KVxuICAgICAgICAgICAgZGV2aWNlLmhhbmRsZVZhbHVlKG1zZylcbiAgICAgICAgfVxuXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAcGFyYW0ge0RhdGFWaWV3fSBtc2cgXG4gICAgICAgICAqL1xuICAgICAgICBoYW5kbGVQb3J0TW9kZUluZm9ybWF0aW9uKG1zZykge1xuICAgICAgICAgICAgY29uc3QgcG9ydElkID0gbXNnLmdldFVpbnQ4KDMpXG4gICAgICAgICAgICBjb25zdCBtb2RlID0gbXNnLmdldFVpbnQ4KDQpXG4gICAgICAgICAgICBjb25zdCB0eXBlID0gbXNnLmdldFVpbnQ4KDUpXG4gICAgICAgICAgICBjb25zdCBkYXRhID0geyBwb3J0SWQsIG1vZGUsIHR5cGU6IE1vZGVJbmZvcm1hdGlvblR5cGVOYW1lc1t0eXBlXSB9XG4gICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIE1vZGVJbmZvcm1hdGlvblR5cGUuTkFNRTpcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5uYW1lID0gYWJUb1N0cmluZyhtc2cuYnVmZmVyLnNsaWNlKDYsIG1zZy5ieXRlTGVuZ3RoKSlcbiAgICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICBjYXNlIE1vZGVJbmZvcm1hdGlvblR5cGUuUkFXOlxuICAgICAgICAgICAgICAgIGNhc2UgTW9kZUluZm9ybWF0aW9uVHlwZS5QQ1Q6XG4gICAgICAgICAgICAgICAgY2FzZSBNb2RlSW5mb3JtYXRpb25UeXBlLlNJOlxuICAgICAgICAgICAgICAgICAgICBkYXRhLm1pbiA9IG1zZy5nZXRGbG9hdDMyKDYsIHRydWUpXG4gICAgICAgICAgICAgICAgICAgIGRhdGEubWF4ID0gbXNnLmdldEZsb2F0MzIoMTAsIHRydWUpXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgY2FzZSBNb2RlSW5mb3JtYXRpb25UeXBlLlNZTUJPTDpcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5zeW1ib2wgPSBhYlRvU3RyaW5nKG1zZy5idWZmZXIuc2xpY2UoNiwgbXNnLmJ5dGVMZW5ndGgpKVxuICAgICAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgICAgIGNhc2UgTW9kZUluZm9ybWF0aW9uVHlwZS5WQUxVRV9GT1JNQVQ6XG4gICAgICAgICAgICAgICAgICAgIGRhdGEubnVtVmFsdWVzID0gbXNnLmdldFVpbnQ4KDYpXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuZGF0YVR5cGUgPSBbXCI4Yml0XCIsIFwiMTZiaXRcIiwgXCIzMmJpdFwiLCBcImZsb2F0XCJdW21zZy5nZXRVaW50OCg3KV1cbiAgICAgICAgICAgICAgICAgICAgZGF0YS50b3RhbEZpZ3VyZXMgPSBtc2cuZ2V0VWludDgoOClcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5kZWNpbWFscyA9IG1zZy5nZXRVaW50OCg5KVxuICAgICAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbG9nKCdwb3J0TW9kZUluZm9ybWF0aW9uJywgZGF0YSlcbiAgICAgICAgICAgIGNvbnN0IGNiID0gdGhpcy5wb3J0Q21kQ2FsbGJhY2tbcG9ydElkXVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBjYiA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgY2IoZGF0YSlcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5wb3J0Q21kQ2FsbGJhY2tbcG9ydElkXVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcbiAgICAgICAgICogQHBhcmFtIHtEYXRhVmlld30gbXNnIFxuICAgICAgICAgKi9cbiAgICAgICAgaGFuZGxlUG9ydEluZm9ybWF0aW9uKG1zZykge1xuICAgICAgICAgICAgY29uc3QgcG9ydElkID0gbXNnLmdldFVpbnQ4KDMpXG4gICAgICAgICAgICBsZXQgY2FwYWJpbGl0aWVzID0gbXNnLmdldFVpbnQ4KDUpXG4gICAgICAgICAgICBjb25zdCBjb3VudCA9IG1zZy5nZXRVaW50OCg2KVxuICAgICAgICAgICAgY29uc3QgaW5wdXQgPSBtc2cuZ2V0VWludDE2KDcsIHRydWUpXG4gICAgICAgICAgICBjb25zdCBvdXRwdXQgPSBtc2cuZ2V0VWludDE2KDksIHRydWUpXG4gICAgICAgICAgICBsb2coYFBvcnQgJHtwb3J0SWR9LCBjYXBhYmlsaXRpZXMgJHtjYXBhYmlsaXRpZXN9LCB0b3RhbCBtb2RlcyAke2NvdW50fSwgXG4gICAgICAgICAgICAgICAgICAgIGlucHV0IG1vZGVzICR7aW5wdXR9LCBvdXRwdXQgbW9kZXMgJHtvdXRwdXR9YClcbiAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJsZUNhcHMgPSAnb3V0cHV0LGlucHV0LGxvZ2ljYWwgY29tYmluYWJsZSwgbG9naWNhbCBzeW5jaHJvbmlzYWJsZScuc3BsaXQoJywnKVxuICAgICAgICAgICAgbGV0IGNhcCA9IFtdXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDQ7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmICgoY2FwYWJpbGl0aWVzID4+IGkpICYgMSkge1xuICAgICAgICAgICAgICAgICAgICBjYXAucHVzaChhdmFpbGFibGVDYXBzW2ldKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSB7IHBvcnRJZCwgY2FwYWJpbGl0aWVzOiBjYXAuam9pbignLCAnKSwgY291bnQsIGlucHV0LCBvdXRwdXQgfVxuICAgICAgICAgICAgY29uc3QgY2IgPSB0aGlzLnBvcnRDbWRDYWxsYmFja1twb3J0SWRdXG4gICAgICAgICAgICBpZiAodHlwZW9mIGNiID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBjYihkYXRhKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cblxuICAgICAgICAvKipcbiAgICAgICAgICogXG4gICAgICAgICAqIEBwYXJhbSB7RGF0YVZpZXd9IG1zZyBcbiAgICAgICAgICogQHJldHVybnMgXG4gICAgICAgICAqL1xuICAgICAgICBoYW5kbGVIdWJQcm9wZXJ0eVJlc3BvbnNlKG1zZykge1xuICAgICAgICAgICAgY29uc3QgcHJvcGVydHkgPSBtc2cuZ2V0VWludDgoMylcbiAgICAgICAgICAgIGxvZyh7IHByb3BlcnR5OiBIdWJQcm9wZXJ0eVBheWxvYWROYW1lc1twcm9wZXJ0eV0gfSlcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eSA9PSBIdWJQcm9wZXJ0eVBheWxvYWQuQkFUVEVSWV9WT0xUQUdFKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYmF0dGVyeUxldmVsID0gbXNnLmdldFVpbnQ4KDUpXG4gICAgICAgICAgICAgICAgbG9nKHsgYmF0dGVyeUxldmVsIH0pXG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0KCdiYXR0ZXJ5TGV2ZWwnLCB7IGJhdHRlcnlMZXZlbCB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAocHJvcGVydHkgPT0gSHViUHJvcGVydHlQYXlsb2FkLkJVVFRPTl9TVEFURSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1dHRvblN0YXRlID0gbXNnLmdldFVpbnQ4KDUpXG4gICAgICAgICAgICAgICAgbG9nKHsgYnV0dG9uU3RhdGUgfSlcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ2J1dHRvblN0YXRlJywgeyBidXR0b25TdGF0ZSB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAocHJvcGVydHkgPT0gSHViUHJvcGVydHlQYXlsb2FkLlNZU1RFTV9UWVBFX0lEKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3lzdGVtVHlwZSA9IG1zZy5nZXRVaW50OCg1KVxuICAgICAgICAgICAgICAgIGxvZyh7IHN5c3RlbVR5cGUgfSlcbiAgICAgICAgICAgICAgICAvL3RoaXMuZW1pdCgnYnV0dG9uU3RhdGUnLCB7IGJ1dHRvblN0YXRlIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChwcm9wZXJ0eSA9PSBIdWJQcm9wZXJ0eVBheWxvYWQuUFJJTUFSWV9NQUNfQUREUkVTUykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ5dGVzID0gW11cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDY7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBieXRlcy5wdXNoKG1zZy5nZXRVaW50OCg1ICsgaSkudG9TdHJpbmcoMTYpLnRvTG9jYWxlVXBwZXJDYXNlKCkucGFkU3RhcnQoMiwgJzAnKSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbG9nKHsgYnl0ZXMgfSlcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ2FkZHJlc3MnLCB7IGFkZHJlc3M6IGJ5dGVzLmpvaW4oJzonKSB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcbiAgICAgICAgICogQHBhcmFtIHtEYXRhVmlld30gbXNnIFxuICAgICAgICAgKi9cbiAgICAgICAgaGFuZGxlR2VuZXJpY0Vycm9yTXNnKG1zZykge1xuICAgICAgICAgICAgY29uc3QgY21kVHlwZSA9IG1zZy5nZXRVaW50OCgzKVxuICAgICAgICAgICAgY29uc3QgZXJyb3JDb2RlID0gbXNnLmdldFVpbnQ4KDQpXG4gICAgICAgICAgICBsb2coeyBjbWRUeXBlLCBlcnJvckNvZGU6IEVycm9yQ29kZU5hbWVzW2Vycm9yQ29kZV0gfSlcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCB7IGNtZFR5cGUsIGVycm9yQ29kZTogRXJyb3JDb2RlTmFtZXNbZXJyb3JDb2RlXSB9KVxuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFxuICAgICAgICAgKiBAcGFyYW0ge0RhdGFWaWV3fSBtc2cgXG4gICAgICAgICAqL1xuICAgICAgICBoYW5kbGVIdWJBbGVydHMobXNnKSB7XG4gICAgICAgICAgICBjb25zdCBidWZmZXJMZW4gPSBtc2cuYnl0ZUxlbmd0aFxuICAgICAgICAgICAgY29uc3QgbXNnTGVuID0gbXNnLmdldFVpbnQ4KDApXG4gICAgICAgICAgICBjb25zdCB0eXBlID0gbXNnLmdldFVpbnQ4KDMpXG4gICAgICAgICAgICBjb25zdCBvcGVyYXRpb24gPSBtc2cuZ2V0VWludDgoNClcbiAgICAgICAgICAgIGNvbnN0IHBheWxvYWQgPSBtc2cuZ2V0VWludDgoNSlcblxuICAgICAgICAgICAgbG9nKCdoYW5kbGVIdWJBbGVydHMnLCB7IGJ1ZmZlckxlbiwgbXNnTGVuLCB0eXBlLCBvcGVyYXRpb24sIHBheWxvYWQgfSlcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnaHViQWxlcnRzJywgeyB0eXBlLCBwYXlsb2FkIH0pXG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogXG4gICAgICAgICAqIEBwYXJhbSB7RGF0YVZpZXd9IG1zZyBcbiAgICAgICAgICovXG4gICAgICAgIGhhbmRsZVBvcnRDb21tYW5kRmVlZGJhY2sobXNnKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBvZmZzZXQgPSAzOyBvZmZzZXQgPCBtc2cuYnl0ZUxlbmd0aDsgb2Zmc2V0ICs9IDIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwb3J0SWQgPSBtc2cuZ2V0VWludDgob2Zmc2V0KVxuICAgICAgICAgICAgICAgIGNvbnN0IGZlZWRiYWNrID0gbXNnLmdldFVpbnQ4KG9mZnNldCArIDEpXG4gICAgICAgICAgICAgICAgY29uc3QgZGV2aWNlID0gdGhpcy5odWJEZXZpY2VzW3BvcnRJZF1cbiAgICAgICAgICAgICAgICBsb2coJ2hhbmRsZVBvcnRDb21tYW5kRmVlZGJhY2snLCB7IHBvcnRJZCwgZmVlZGJhY2sgfSlcbiAgICAgICAgICAgICAgICBpZiAoZmVlZGJhY2sgPT0gMTAgJiYgZGV2aWNlICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBkZXZpY2UuaGFuZGxlRmVlZGJhY2soKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBcbiAgICAgICAgICogQHBhcmFtIHtEYXRhVmlld30gbXNnIFxuICAgICAgICAgKi9cbiAgICAgICAgaGFuZGxlUG9ydE1zZyhtc2cpIHtcblxuICAgICAgICAgICAgY29uc3QgcG9ydElkID0gbXNnLmdldFVpbnQ4KDMpXG4gICAgICAgICAgICBjb25zdCBldmVudFR5cGUgPSBtc2cuZ2V0VWludDgoNClcbiAgICAgICAgICAgIGNvbnN0IHR5cGUgPSBldmVudFR5cGUgPyBtc2cuZ2V0VWludDE2KDUsIHRydWUpIDogMFxuICAgICAgICAgICAgY29uc3QgZGV2aWNlVHlwZU5hbWUgPSBEZXZpY2VUeXBlTmFtZXNbdHlwZV0gfHwgXCJVbmtub3duXCJcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50TmFtZSA9IEV2ZW50TmFtZXNbZXZlbnRUeXBlXVxuXG4gICAgICAgICAgICBsb2coJ2hhbmRsZVBvcnRNc2cnLCB7IHBvcnRJZCwgZXZlbnROYW1lLCBkZXZpY2VUeXBlTmFtZSB9KVxuICAgICAgICAgICAgaWYgKGV2ZW50VHlwZSA9PSBFdmVudC5BVFRBQ0hFRF9JTykge1xuXG4gICAgICAgICAgICAgICAgbGV0IGNvbnN0cnVjdG9yID0gY29uc3RydWN0b3JNYXBbdHlwZV1cbiAgICAgICAgICAgICAgICBpZiAoIWNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yID0gRGV2aWNlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZSA9IG5ldyBjb25zdHJ1Y3Rvcih0aGlzLCBwb3J0SWQsIGRldmljZVR5cGVOYW1lKVxuICAgICAgICAgICAgICAgIHRoaXMuaHViRGV2aWNlc1twb3J0SWRdID0gZGV2aWNlXG4gICAgICAgICAgICAgICAgdGhpcy5hdHRhY2hDYWxsYmFja3MuZW1pdChkZXZpY2UpXG5cbiAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ2F0dGFjaCcsIGRldmljZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGV2ZW50VHlwZSA9PSBFdmVudC5ERVRBQ0hFRF9JTykge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmh1YkRldmljZXNbcG9ydElkXVxuICAgICAgICAgICAgICAgIHRoaXMuZW1pdCgnZGV0YWNoJywgeyBwb3J0SWQgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGV2ZW50VHlwZSA9PSBFdmVudC5BVFRBQ0hFRF9WSVJUVUFMX0lPKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcG9ydElkMSA9IG1zZy5nZXRVaW50OCg3KVxuICAgICAgICAgICAgICAgIGNvbnN0IHBvcnRJZDIgPSBtc2cuZ2V0VWludDgoOClcblxuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZSA9IG5ldyBEb3VibGVNb3Rvcih0aGlzLCBwb3J0SWQsIGdldFZpcnR1YWxQb3J0TmFtZShwb3J0SWQxLCBwb3J0SWQyKSlcbiAgICAgICAgICAgICAgICB0aGlzLmh1YkRldmljZXNbcG9ydElkXSA9IGRldmljZVxuICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNoQ2FsbGJhY2tzLmVtaXQoZGV2aWNlKVxuXG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0KCdhdHRhY2gnLCBkZXZpY2UpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnaHViJywge1xuXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBcbiAgICAgICAgICAgICAqIEByZXR1cm5zIHtQcm9taXNlPEh1YkRldmljZT59XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGFzeW5jIGZ1bmN0aW9uIGNvbm5lY3QoKSB7XG4gICAgICAgICAgICAgICAgbG9nKCdjb25uZWN0JylcblxuICAgICAgICAgICAgICAgIGNvbnN0IGRldmljZSA9IGF3YWl0IG5hdmlnYXRvci5ibHVldG9vdGgucmVxdWVzdERldmljZSh7XG4gICAgICAgICAgICAgICAgICAgIGFjY2VwdEFsbERldmljZXM6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbmFsU2VydmljZXM6IFtMUEYyX1NFUlZJQ0VfVVVJRF1cbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgY29uc3QgaHViRGV2aWNlID0gbmV3IEh1YkRldmljZSgpXG4gICAgICAgICAgICAgICAgYXdhaXQgaHViRGV2aWNlLmluaXQoZGV2aWNlKVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGh1YkRldmljZVxuXG4gICAgICAgICAgICAgICAgLy9hd2FpdCBzZW5kTXNnKE1lc3NhZ2VUeXBlLkhVQl9QUk9QRVJUSUVTLCBIdWJQcm9wZXJ0eVBheWxvYWQuQkFUVEVSWV9UWVBFLCAweDA1KVxuICAgICAgICAgICAgICAgIC8vYXdhaXQgc2VuZE1zZyhmb3JtYXRNc2coTWVzc2FnZVR5cGUuSFVCX1BST1BFUlRJRVMsIEh1YlByb3BlcnR5UGF5bG9hZC5CQVRURVJZX1ZPTFRBR0UsIDB4MDIpKVxuICAgICAgICAgICAgICAgIC8vYXdhaXQgc2VuZE1zZyhNZXNzYWdlVHlwZS5IVUJfUFJPUEVSVElFUywgSHViUHJvcGVydHlQYXlsb2FkLkJVVFRPTl9TVEFURSwgMHgwMilcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBjb25uZWN0LFxuICAgICAgICAgICAgICAgIENvbG9yLFxuICAgICAgICAgICAgICAgIFBvcnRNYXAsXG4gICAgICAgICAgICAgICAgUG9ydE1hcE5hbWVzLFxuICAgICAgICAgICAgICAgIERldmljZU1vZGUsXG4gICAgICAgICAgICAgICAgQnJha2luZ1N0eWxlLFxuICAgICAgICAgICAgICAgIERldmljZVR5cGVOYW1lc1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbn0pKCk7XG5cblxuIl19
