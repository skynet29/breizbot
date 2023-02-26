//@ts-check

(function () {

    const debug = false

    const log = function (...data) {
        if (debug) {
            console.log.apply(console, data)
        }
    }

    const { getEnumName } = $$.util

    const LPF2_SERVICE_UUID = '00001623-1212-efde-1623-785feabcd123'
    const LPF2_CHARAC_UUID = '00001624-1212-efde-1623-785feabcd123'

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

    /**
     * 
     * @param  {...any} data 
     * @returns {ArrayBuffer}
     */
    function formatMsg(msgType, ...data) {
        const buff = data.flat(2)
        const msgLen = buff.length + 3
        const buffer = new ArrayBuffer(msgLen)
        const uint8Buffer = new Uint8Array(buffer)
        uint8Buffer[0] = msgLen
        uint8Buffer[1] = 0
        uint8Buffer[2] = msgType
        uint8Buffer.set(buff, 3)
        return buffer
    }


    function getPortIdFromName(portName) {
        for (const [key, name] of Object.entries(PortMapNames)) {
            if (name == portName) {
                return key
            }
        }
        return -1;
    }

    const maxPower = 100



    class Led {

        /**
        * 
        * @param {HubDevice} hubDevice 
        * @param {number} portId 
        */
        constructor(hubDevice, portId) {
            this.hubDevice = hubDevice
            this.portId = portId
        }

        async setColor(color) {
            console.log('setColor', this.portId, color)
            await this.hubDevice.setPortFormat(this.portId, DeviceMode.COLOR)
            return this.hubDevice.writeDirect(this.portId, DeviceMode.COLOR, false, color)
        }

        async setRGBColor(r, g, b) {
            console.log('setColor', this.portId, r, g, b)
            await this.hubDevice.setPortFormat(this.portId, DeviceMode.RGB)
            return this.hubDevice.writeDirect(this.portId, DeviceMode.RGB, false, r, g, b)
        }
    }


    class Motor {
        /**
         * 
         * @param {HubDevice} hubDevice 
         * @param {number} portId 
         */
        constructor(hubDevice, portId) {
            this.hubDevice = hubDevice
            this.portId = portId
        }

        setPower(power) {
            console.log('setPower', { power })
            return this.hubDevice.writeDirect(this.portId, DeviceMode.POWER, false, power)
        }

        setSpeed(speed) {
            console.log('setSpeed', speed)
            return this.hubDevice.writePortCommand(this.portId, false, 0x07, speed, maxPower, 0)
        }

        rotateDegrees(degrees, speed, waitFeedback, brakingStyle = BrakingStyle.BRAKE) {
            return this.hubDevice.writePortCommand(this.portId, waitFeedback, 0x0B, toInt32(degrees), speed, maxPower, brakingStyle)
        }

        gotoAngle(angle, speed, waitFeedback, brakingStyle = BrakingStyle.BRAKE) {
            console.log('gotoAngle', { angle, speed })
            const portValue = this.hubDevice.portValue[this.portId]
            this.hubDevice.portValue[this.portId] = angle
            console.log({ portValue })
            if (portValue != undefined) {
                if (Math.abs(angle - portValue) > 1) {
                    return this.hubDevice.writePortCommand(this.portId, waitFeedback, 0x0D, toInt32(angle), speed, maxPower, brakingStyle)
                }
            }
            else {
                return this.hubDevice.writePortCommand(this.portId, waitFeedback, 0x0D, toInt32(angle), speed, maxPower, brakingStyle)

            }


            return Promise.resolve()
        }

        setSpeedForTime(speed, time, brakingStyle = BrakingStyle.BRAKE) {
            return this.hubDevice.writePortCommand(this.portId, false, 0x09, toInt16(time), speed, maxPower, brakingStyle)
        }

        resetZero() {
            console.log('resetZero')
            return this.hubDevice.writeDirect(this.portId, DeviceMode.ROTATION, true, 0x00, 0x00, 0x00, 0x00)
        }

        waitAlert() {
            return new Promise((resolve) => {
                this.hubDevice.once('hubAlerts', async (data) => {
                    console.log('hubAlerts', data)
                    resolve()
                })
            })
        }


        async calibrate() {

            this.setPower(50)
            await this.hubDevice.waitTestValue(this.portId, DeviceMode.SPEED, (value) => value > 10)
            await this.hubDevice.waitTestValue(this.portId, DeviceMode.SPEED, (value) => value == 0)


            this.setPower(0)

            await $$.util.wait(1000)

            // await this.hubDevice.setPortFormat(this.portId, DeviceMode.ROTATION)
            // let value = await this.hubDevice.getPortValue(this.portId)
            // console.log(value)	

            await this.resetZero()

            await this.hubDevice.setPortFormat(this.portId, DeviceMode.ROTATION)
            let value = await this.hubDevice.getPortValue(this.portId)
            console.log(value)

            this.setPower(-50)
            await this.hubDevice.waitTestValue(this.portId, DeviceMode.SPEED, (value) => Math.abs(value) > 10)
            await this.hubDevice.waitTestValue(this.portId, DeviceMode.SPEED, (value) => value == 0)

            this.setPower(0)
            await this.hubDevice.setPortFormat(this.portId, DeviceMode.ROTATION)
            value = await this.hubDevice.getPortValue(this.portId)
            console.log(value)
            const offset = Math.floor(value / 2)
            console.log({ offset })
            await this.gotoAngle(offset, 10, true)
            value = await this.hubDevice.getPortValue(this.portId)
            console.log(value)
            await this.resetZero()
            this.hubDevice.calibration[this.portId] = Math.abs(offset)
        }

    }


    class DoubleMotor {

        /**
         * 
         * @param {HubDevice} hubDevice 
         * @param {number} portId1 
         * @param {number} portId2 
         */
        constructor(hubDevice, portId1, portId2) {
            this.hubDevice = hubDevice
            this.portId1 = portId1
            this.portId2 = portId2
        }



        async create() {
            const name = await this.hubDevice.createVirtualPort(this.portId1, this.portId2)
            await $$.util.wait(100)
            this.portId = this.hubDevice.getPortIdFromName(name)
            console.log('portId', this.portId)

        }

        setSpeed(speed1, speed2) {
            const portId = this.hubDevice
            return this.hubDevice.writePortCommand(this.portId, false, 0x08, speed1, speed2, maxPower, 0)
        }



    }


    function getVirtualPortName(portId1, portId2) {
        const portIdA = PortMapNames[portId1]
        const portIdB = PortMapNames[portId2]
        return `${portIdA}_${portIdB}`
    }

    class HubDevice extends EventEmitter2 {

        constructor() {
            super()
            this.charac = null
            this.deviceModes = {}
            this.portCmdQueue = {}
            this.portCmdCallback = {}
            this.calibration = {}
            this.hubDevices = {}
            this.portValue = {}
            this.busy = false
            this.cmdQueue = []

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
         * @returns {Motor}
         */
        createMotor(portId) {
            return new Motor(this, portId)
        }

        createLed(portId) {
            return new Led(this, portId)
        }

        async createDblMotor(portId1, portId2) {
            const motor = new DoubleMotor(this, portId1, portId2)
            await motor.create()
            return motor
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
         * @param {number} portId 
         * @param {number} mode
         * @param {boolean} waitFeedback 
         * @param  {...any} data 
         * @returns 
         */
        writeDirect(portId, mode, waitFeedback, ...data) {
            log('writeDirect', { portId, mode, waitFeedback })
            return this.writePortCommand(portId, waitFeedback, 0x51, mode, data)
        }

        /**
         * 
         * @param {number} portId 
         * @param {number} mode 
         * @param {boolean} notificationEnabled 
         * @param {number} deltaInterval 
         * @param {function name(params) {
            
         }} cbk 
         * @returns 
         */
        setPortFormat(portId, mode, cbk = null, deltaInterval = 1) {
            const notificationEnabled = (typeof cbk == 'function')

            console.log('setPortFormat', { portId, mode, notificationEnabled })
            this.deviceModes[portId] = { mode, cbk }

            return this.sendMsg(MessageType.PORT_INPUT_FORMAT_SETUP_SINGLE,
                portId, mode, toUint32(deltaInterval), notificationEnabled ? 0x01 : 0)
        }

        getPortIdFromName(name) {
            for (const [portId, info] of Object.entries(this.hubDevices)) {
                if (info.portName == name) {
                    return portId
                }
            }
        }

        async createVirtualPort(portId1, portId2) {
            const name = getVirtualPortName(portId1, portId2)
            console.log('createVirtualPort', portId1, portId2)
            for (const info of Object.values(this.hubDevices)) {
                if (info.portName == name) {
                    console.log(`virtual port ${name} already created !`)
                    return name
                }
            }
            await this.sendMsg(MessageType.VIRTUAL_PORT_SETUP, 0x01, portId1, portId2)
            return name
        }

        shutdown() {
            return this.sendMsg(MessageType.HUB_ACTIONS, 0x01)
        }

        async writePortCommand(portId, waitFeedback, ...data) {

            log('writePortCommand', { portId, waitFeedback, data })

            if (waitFeedback) {

                return new Promise(async (resolve) => {
                    const buffer = formatMsg(MessageType.PORT_OUTPUT_COMMAND, portId, 0x11, data)

                    await this.sendBuffer(buffer)

                    this.portCmdCallback[portId] = resolve

                })
            }
            else {
                const buffer = formatMsg(MessageType.PORT_OUTPUT_COMMAND, portId, 0x10, data)
                return this.sendBuffer(buffer)
            }

        }

        getHubDevices() {
            return Object.values(this.hubDevices)
        }

        getDeviceType(portId) {
            return DeviceTypeNames[this.hubDevices[portId].type]
        }

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

        async getPortValue(portId, mode) {
            console.log('getPortValue', { portId, mode })
            await this.setPortFormat(portId, mode)
            return new Promise(async (resolve) => {
                await this.sendMsg(MessageType.PORT_INFORMATION_REQUEST, portId, 0x00)
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
         * @param {number} mode 
         * @param {DataView} msg
         */
        handleTiltSensorValue(mode, msg) {
            let value
            switch (mode) {
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
        /**
         * 
         * @param {number} mode 
         * @param {DataView} msg
         */
        handleMotorValue(mode, msg) {
            let value
            switch (mode) {
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

        async waitTestValue(portId, mode, testFn) {
            return new Promise(async (resolve) => {
                await this.setPortFormat(portId, mode, async (value) => {
                    log('waitTestValue', value)
                    if (testFn(value)) {
                        log('waitTestValue OK')
                        delete this.deviceModes[portId]
                        await this.setPortFormat(portId, mode, null)
                        resolve()
                    }
                })
            })
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
            log('handlePortValueSingle', { msgLen, portId, device })

            if (this.deviceModes[portId] != undefined) {
                const { mode, cbk } = this.deviceModes[portId]
                log({ mode, cbk: typeof cbk == 'function' })
                let value = null

                switch (device.type) {
                    case DeviceType.TECHNIC_LARGE_LINEAR_MOTOR:
                    case DeviceType.TECHNIC_LARGE_ANGULAR_MOTOR_GREY:
                    case DeviceType.TECHNIC_XLARGE_LINEAR_MOTOR:
                        value = this.handleMotorValue(mode, msg)
                        break
                    case DeviceType.TECHNIC_MEDIUM_HUB_TILT_SENSOR:
                        value = this.handleTiltSensorValue(mode, msg)
                        break
                }

                log({ value })
                const cb = this.portCmdCallback[portId]
                if (value != null) {
                    if (typeof cbk == 'function') {
                        cbk(value)
                    }
                    else if (typeof cb == 'function') {
                        log('getPortValue OK', value)
                        cb(value)
                        delete this.portCmdCallback[portId]
                    }
                }

            }
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
                log('handlePortCommandFeedback', { portId, feedback })
                if (feedback == 10) {
                    const cbk = this.portCmdCallback[portId]
                    if (typeof cbk == 'function') {
                        cbk()
                    }

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
                const info = { type, deviceTypeName, portName: PortMapNames[portId], portId }

                this.hubDevices[portId] = info
                this.emit('attach', info)
            }
            else if (eventType == Event.DETACHED_IO) {
                delete this.hubDevices[portId]
                this.emit('detach', { portId })
            }
            else if (eventType == Event.ATTACHED_VIRTUAL_IO) {
                const portId1 = msg.getUint8(7)
                const portId2 = msg.getUint8(8)
                const info = { deviceTypeName: 'Virtual Port', portName: getVirtualPortName(portId1, portId2), portId }

                this.hubDevices[portId] = info

                this.emit('attach', info)
            }

            //console.log('hubDevices', this)

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


