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
    const ColorSensor = require('./ColorSensor')
    const DistanceSensor = require('./DistanceSensor')
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
        [DeviceType.LIGHT]: Led,
        [DeviceType.TECHNIC_MEDIUM_ANGULAR_MOTOR_GREY]: TachoMotor,
        [DeviceType.TECHNIC_COLOR_SENSOR]: ColorSensor,
        [DeviceType.TECHNIC_DISTANCE_SENSOR]: DistanceSensor
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
            this.hubPropertyCallback = null

        }

        async writePortCommand(portId, ...data) {

            console.log('#writePortCommand', { portId, data })

            const buffer = formatMsg(MessageType.PORT_OUTPUT_COMMAND, portId, 0x11, data)

            if (!this.busy) {
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
            //await this.sendMsg(MessageType.HUB_PROPERTIES, HubPropertyPayload.PRIMARY_MAC_ADDRESS, 0x05)
            //await this.sendMsg(MessageType.HUB_PROPERTIES, HubPropertyPayload.ADVERTISING_NAME, 0x05)
            // const name = await this.getName()
            // const address = await this.getPrimaryMACAddress()
            // console.log('startNotification', {name, address})

            await this.sendMsg(MessageType.HUB_ALERTS, 0x01, 0x01)
            // await this.sendMsg(MessageType.HUB_ALERTS, 0x02, 0x01)
            // await this.sendMsg(MessageType.HUB_ALERTS, 0x03, 0x01)
            // await this.sendMsg(MessageType.HUB_ALERTS, 0x04, 0x01)

        }

        async getName() {
            this.name = await new Promise(async (resolve) => {
                this.hubPropertyCallback = resolve
                await this.sendMsg(MessageType.HUB_PROPERTIES, HubPropertyPayload.ADVERTISING_NAME, 0x05)
            })
            return this.name

        }

        async getPrimaryMACAddress() {
            const address = await new Promise(async (resolve) => {
                this.hubPropertyCallback = resolve
                await this.sendMsg(MessageType.HUB_PROPERTIES, HubPropertyPayload.PRIMARY_MAC_ADDRESS, 0x05)
            })
            return address

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
            //console.log('# sendBuffer', buffer)
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
         */
        async setName(name) {
            const data = Array.from(name).map(c => c.charCodeAt(0))
            log('name', data)
            await this.sendMsg(MessageType.HUB_PROPERTIES, HubPropertyPayload.ADVERTISING_NAME, 0x01, data)
            this.name = name
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
            console.log('handlePortValueSingle', { msgLen, portId })
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
            const propType = msg.getUint8(4)
            const msgLen = msg.getUint8(0)
            console.log('handleHubPropertyResponse', { property: HubPropertyPayloadNames[property], msgLen, propType })
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
                //this.emit('address', { address: bytes.join(':') })
                this.hubPropertyCallback(bytes.join(':'))
            }
            else if (property == HubPropertyPayload.ADVERTISING_NAME) {
                if (this.hubPropertyCallback != null) {
                    const nameLength = msgLen - 5
                    const bytes = []
                    for (let i = 0; i < nameLength; i++) {
                        bytes.push(msg.getUint8(5 + i))
                    }
                    const name = String.fromCharCode(...bytes)
                    log({name})
                    this.hubPropertyCallback(name)
                }
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
             * @param {Device} device 
             * @returns {boolean}
             */
            function isColorSensor(device) {
                return device instanceof ColorSensor
            }

            /**
             * 
             * @param {Device} device 
             * @returns {boolean}
             */
            function isDistanceSensor(device) {
                return device instanceof DistanceSensor
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
                isDoubleMotor,
                isColorSensor,
                isDistanceSensor
            }
        }
    });

})();


