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
        this.waitStale = false

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
            else if (feedback == 44 && this.waitStale) {
                this.waitStale  = false
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
            console.log('readInfo', this.portId)
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
        //console.log('decodeValue', this.type, deviceInfo)
        if (info != undefined) {
            const { VALUE_FORMAT, RAW, SI } = info.modes[this.mode]
            const range = $$.util.mapRange(RAW.min, RAW.max, SI.min, SI.max)
            const { dataType, numValues } = VALUE_FORMAT
            const ret = []
            let offset = 4
            let val
            console.log('decodeValue', {RAW, SI, dataType, numValues})
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
                console.log('val', val)
                ret.push(Math.trunc(range(val)))
            }
            if (ret.length == 1) {
                return ret[0]
            }
            return ret

        }
        else {
            console.error('No info for this port')
        }
    }
    /**
     * 
     * @param {DataView} msg 
     */
    handleValue(msg) {
        const value = this.decodeValue(msg)
        //console.log('handleValue', this.portId, value, typeof this.valueCallback)

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

        const ret = await new Promise(async (resolve) => {
            this.valueCallback = async (value) => {
                //console.log('waitTestValue', value)
                const ret = testFn(value)
                if (ret) {
                    log('waitTestValue OK')
                    //await this.setMode(mode, false)
                    resolve(value)
                }
            }

        })

        this.valueCallback = null
        await this.setMode(mode, false)
        return ret
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