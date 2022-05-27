//@ts-check

$$.service.registerService('hub', {

    init: function () {

        let charac = null
        let hubDevices = {}
        const event = new EventEmitter2()
        const debug = false
        const portCmdCallback = {}
        const deviceModes = {}


        const log = function (...data) {
            if (debug) {
                console.log.apply(console, data)
            }
        }

        function getEnumName(enumVal) {
            const ret = {}
            Object.entries(enumVal).forEach(([key, val]) => { ret[val] = key })
            return ret
        }

        const Event = {
            DETACHED_IO: 0x00,
            ATTACHED_IO: 0x01,
            ATTACHED_VIRTUAL_IO: 0x02,
        }
        const EventNames = getEnumName(Event)


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
            RGB: 0x01
        }

        const BrakingStyle = {
            FLOAT: 0,
            HOLD: 126,
            BRAKE: 127
        }

        const PortMapNames = getEnumName(PortMap)

        const mapFcn = {}
        mapFcn[MessageType.HUB_ATTACHED_IO] = handlePortMsg
        mapFcn[MessageType.GENERIC_ERROR_MESSAGES] = handleGenericErrorMsg
        mapFcn[MessageType.HUB_PROPERTIES] = handleHubPropertyResponse
        mapFcn[MessageType.PORT_OUTPUT_COMMAND_FEEDBACK] = handlePortCommandFeedback
        mapFcn[MessageType.PORT_INFORMATION] = handlePortInformation
        mapFcn[MessageType.PORT_MODE_INFORMATION] = handlePortModeInformation
        mapFcn[MessageType.PORT_VALUE_SINGLE] = handlePortValueSingle


        const mapValue = {}
        mapValue[DeviceType.TECHNIC_LARGE_LINEAR_MOTOR] = handleMotorValue
        mapValue[DeviceType.TECHNIC_LARGE_ANGULAR_MOTOR_GREY] = handleMotorValue

        /**
         * 
         * @param {DataView} msg 
         */
        function handleMotorValue(msg) {
            const portId = msg.getUint8(3)
            if (deviceModes[portId] != undefined) {
                const { mode, cbk } = deviceModes[portId]
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

                if (typeof cbk == 'function') {
                    cbk({ mode, value, portId })
                }

            }
        }
        /**
         * 
         * @param {DataView} msg 
         */
        function handlePortValueSingle(msg) {
            log('msg', msg)
            const portId = msg.getUint8(3)
            const device = hubDevices[portId]
            log('handlePortValueSingle', { portId, device })
            const fn = mapValue[device]
            if (typeof fn == 'function') {
                fn(msg)
            }
        }

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
         * @param {DataView} msg 
         */
        function handlePortModeInformation(msg) {
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
            const cb = portCmdCallback[portId]
            if (typeof cb == 'function') {
                cb(data)
                delete portCmdCallback[portId]
            }
        }
        /**
         * 
         * @param {DataView} msg 
         */
        function handlePortInformation(msg) {
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
            const cb = portCmdCallback[portId]
            if (typeof cb == 'function') {
                cb(data)
            }
        }


        /**
         * 
         * @param {DataView} msg 
         * @returns 
         */
        function handleHubPropertyResponse(msg) {
            const property = msg.getUint8(3)
            log({ property: HubPropertyPayloadNames[property] })
            if (property == HubPropertyPayload.BATTERY_VOLTAGE) {
                const batteryLevel = msg.getUint8(5)
                log({ batteryLevel })
                event.emit('batteryLevel', { batteryLevel })
            }
            else if (property == HubPropertyPayload.BUTTON_STATE) {
                const buttonState = msg.getUint8(5)
                log({ buttonState })
                event.emit('buttonState', { buttonState })
            }
        }
        /**
         * 
         * @param {DataView} msg 
         */
        function handleGenericErrorMsg(msg) {
            const cmdType = msg.getUint8(3)
            const errorCode = msg.getUint8(4)
            log({ cmdType, errorCode: ErrorCodeNames[errorCode] })
            event.emit('error', { cmdType, errorCode: ErrorCodeNames[errorCode] })
        }

        /**
         * 
         * @param {DataView} msg 
         */
        function handlePortCommandFeedback(msg) {
            for (let offset = 3; offset < msg.byteLength; offset += 2) {
                const portId = msg.getUint8(offset)
                const feedback = msg.getUint8(offset + 1)
                log({ portId, feedback })
                if (feedback == 10) {
                    const cbk = portCmdCallback[portId]
                    if (typeof cbk == 'function') {
                        cbk()
                        delete portCmdCallback[portId]
                    }
                }
                portMsgQueue[portId].shift()
                const buffer = portMsgQueue[portId][0] // verifie si il y a d'autre message a envoyer
                if (buffer) {
                    log('envoie message mis en attente', buffer)
                    sendMsg(buffer)
                }
            }
        }
        /**
         * 
         * @param {DataView} msg 
         */
        function handlePortMsg(msg) {

            const portId = msg.getUint8(3)
            const eventType = msg.getUint8(4)
            const deviceType = eventType ? msg.getUint16(5, true) : 0
            const deviceTypeName = DeviceTypeNames[deviceType] || "Unknown"
            const eventName = EventNames[eventType]

            log('handlePortMsg', { portId, eventName, deviceTypeName })
            if (eventType == Event.ATTACHED_IO) {
                hubDevices[portId] = deviceType
                event.emit('attach', { portId, deviceTypeName })
            }
            else if (eventType == Event.DETACHED_IO) {
                delete hubDevices[portId]
                event.emit('detach', { portId })
            }
            else if (eventType == Event.ATTACHED_VIRTUAL_IO) {
                const portIdA = PortMapNames[msg.getUint8(7)]
                const portIdB = PortMapNames[msg.getUint8(8)]
                PortMapNames[portId] = `${portIdA}_${portIdB}`

                log({ portIdA, portIdB })
                event.emit('attach', { portId, deviceTypeName: 'Virtual Port' })
            }

        }

        function getPortIdFromName(portName) {
            for (const [key, name] of Object.entries(PortMapNames)) {
                if (name == portName) {
                    return key
                }
            }
            return -1;
        }

        /**
         * 
         * @param {DataView} msg 
         */
        function decodeMsg(msg) {
            const bufferLen = msg.byteLength
            const msgLen = msg.getUint8(0)
            const msgType = msg.getUint8(2)
            log('decodeMsg', { msgLen, bufferLen, msgType: MessageTypeNames[msgType] })
            const fcn = mapFcn[msgType]
            if (typeof fcn == 'function') {
                fcn(msg)
            }

        }

        /**
         * 
         * @param  {...any} data 
         * @returns {ArrayBuffer}
         */
        function formatMsg(...data) {
            const buff = data.flat(2)
            const msgLen = buff.length + 2
            const buffer = new ArrayBuffer(msgLen)
            const uint8Buffer = new Uint8Array(buffer)
            uint8Buffer[0] = msgLen
            uint8Buffer[1] = 0
            uint8Buffer.set(buff, 2)
            return buffer
        }
        /**
         * 
         * @param  {ArrayBuffer} buffer 
         */
        async function sendMsg(buffer) {
            log('sendMsg', buffer)
            await charac.writeValueWithoutResponse(buffer)
        }

        async function subscribe(portId, mode, cbk = null) {
            deviceModes[portId] = { mode, cbk }

            await sendMsg(formatMsg(MessageType.PORT_INPUT_FORMAT_SETUP_SINGLE,
                portId, mode, 0x01, 0x00, 0x00, 0x00, 0x01))

        }

        function createVirtualPort(portId1, portId2) {
            return sendMsg(formatMsg(MessageType.VIRTUAL_PORT_SETUP, 0x01, portId1, portId2))
        }

        function getPortInformationRequest(portId) {
            return new Promise(async (resolve) => {
                await sendMsg(formatMsg(MessageType.PORT_INFORMATION_REQUEST, portId, 0x01))
                portCmdCallback[portId] = resolve
            })
        }

        function getPortModeInformationRequest(portId, mode, type) {
            return new Promise(async (resolve) => {
                await sendMsg(formatMsg(MessageType.PORT_MODE_INFORMATION_REQUEST, portId, mode, type))
                portCmdCallback[portId] = resolve
            })
        }

        async function getPortInformation(portId) {
            const portInfo = await getPortInformationRequest(portId)
            const { capabilities, count, output, input } = portInfo
            const bitSet = Math.max(input, output)
            const modes = []
            for (let mode = 0; mode < count; mode++) {
                const data = {}
                if (bitSet >> mode) {
                    let ret
                    ret = await getPortModeInformationRequest(portId, mode, ModeInformationType.NAME)
                    data.name = ret.name
                    ret = await getPortModeInformationRequest(portId, mode, ModeInformationType.RAW)
                    data[ret.type] = { min: ret.min, max: ret.max }
                    ret = await getPortModeInformationRequest(portId, mode, ModeInformationType.PCT)
                    data[ret.type] = { min: ret.min, max: ret.max }
                    ret = await getPortModeInformationRequest(portId, mode, ModeInformationType.SI)
                    data[ret.type] = { min: ret.min, max: ret.max }
                    ret = await getPortModeInformationRequest(portId, mode, ModeInformationType.SYMBOL)
                    data.unit = ret.symbol
                    ret = await getPortModeInformationRequest(portId, mode, ModeInformationType.VALUE_FORMAT)
                    const { numValues, dataType, totalFigures, decimals } = ret
                    data[ret.type] = { numValues, dataType, totalFigures, decimals }
                }
                modes.push(data)
            }
            return { modes, capabilities }
        }

        const portMsgQueue = {}

        async function writePortCommand(portId, ...data) {

            log('writePortCommand', { portId })

            return new Promise(async (resolve) => {
                const buffer = formatMsg(MessageType.PORT_OUTPUT_COMMAND, portId, 0x11, data)
                if (portMsgQueue[portId] == undefined) {
                    portMsgQueue[portId] = []
                }

                if (portMsgQueue[portId].length == 0) { // la queue de msg est vide
                    portMsgQueue[portId].push(buffer)
                    await sendMsg(buffer)
                }
                else {
                    log('Message mis en attente')
                    portMsgQueue[portId].push(buffer)
                }

                portCmdCallback[portId] = resolve
            })

        }


        async function waitTestValue(portId, mode, testFn) {
            return new Promise(async (resolve) => {
                await subscribe(portId, mode, (data) => {
                    log('waitTestValue', data)
                    if (testFn(data.value)) {
                        delete deviceModes[portId]
                        resolve()
                    }
                })
            })
        }

        const maxPower = 100

        function setSpeed(portId, speed) {
            return writePortCommand(portId, 0x07, speed, maxPower, 0)
        }

        function setSpeedEx(portId, speed1, speed2) {
            return writePortCommand(portId, 0x08, speed1, speed2, maxPower, 0)
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

        function setSpeedForTime(portId, speed, time, brakingStyle = BrakingStyle.BRAKE) {
            return writePortCommand(portId, 0x09, toInt16(time), speed, maxPower, brakingStyle)
        }

        function rotateDegrees(portId, degrees, speed, brakingStyle = BrakingStyle.BRAKE) {
            return writePortCommand(portId, 0x0B, toInt32(degrees), speed, maxPower, brakingStyle)
        }

        function gotoAngle(portId, angle, speed, brakingStyle = BrakingStyle.BRAKE) {
            return writePortCommand(portId, 0x0D, toInt32(angle), speed, maxPower, brakingStyle)
        }

        /**
         * 
         * @param {number} portId 
         * @param {number} mode 
         * @param  {...any} data 
         * @returns 
         */
        function writeDirect(portId, mode, ...data) {
            return writePortCommand(portId, 0x51, mode, data)
        }

        function setPower(portId, power) {
            return writeDirect(portId, DeviceMode.POWER, power)
        }

        function resetZero(portId) {
            return writeDirect(portId, DeviceMode.ROTATION, 0x00, 0x00, 0x00, 0x00)
        }

        async function setColor(color) {
            await subscribe(PortMap.HUB_LED, DeviceMode.COLOR)
            return writeDirect(PortMap.HUB_LED, DeviceMode.COLOR, color)
        }

        async function setRGBColor(r, g, b) {
            await subscribe(PortMap.HUB_LED, DeviceMode.RGB)
            return writeDirect(PortMap.HUB_LED, DeviceMode.RGB, r, g, b)
        }

        function onCharacteristicValueChanged(event) {
            //log('onCharacteristicvaluechanged', event.target.value)
            decodeMsg(event.target.value)

        }

        function onGattServerDisconnected() {
            log('onGattServerDisconnected')
            event.emit('disconnected')
        }

        function shutdown() {
            return sendMsg(formatMsg(MessageType.HUB_ACTIONS, 0x01))
        }

        function getDeviceType(portId) {
            return DeviceTypeNames[hubDevices[portId]]
        }

        async function connect() {
            log('connect')
            hubDevices = {}
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['00001623-1212-efde-1623-785feabcd123']
            })
            device.addEventListener('gattserverdisconnected', onGattServerDisconnected)
            const server = await device.gatt.connect()
            log('Connected')
            const service = await server.getPrimaryService('00001623-1212-efde-1623-785feabcd123')
            charac = await service.getCharacteristic('00001624-1212-efde-1623-785feabcd123')
            charac.addEventListener('characteristicvaluechanged', onCharacteristicValueChanged)
            charac.startNotifications()

            await sendMsg(formatMsg(MessageType.HUB_PROPERTIES, HubPropertyPayload.BATTERY_TYPE, 0x05))
            //await sendMsg(formatMsg(MessageType.HUB_PROPERTIES, HubPropertyPayload.BATTERY_VOLTAGE, 0x02))
            await sendMsg(formatMsg(MessageType.HUB_PROPERTIES, HubPropertyPayload.BUTTON_STATE, 0x02))
        }

        return {
            connect,
            shutdown,
            getDeviceType,
            subscribe,
            waitTestValue,
            createVirtualPort,
            getPortInformation,
            getPortIdFromName,
            on: event.on.bind(event),
            motor: {
                setPower,
                resetZero,
                setSpeed,
                setSpeedEx,
                setSpeedForTime,
                rotateDegrees,
                gotoAngle
            },
            led: {
                setColor,
                setRGBColor
            },
            Color,
            PortMap,
            PortMapNames,
            DeviceMode,
            BrakingStyle
        }
    }
});