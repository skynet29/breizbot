$$.service.registerService('app.rcx', {

    deps: ['app.srecord'],
    
    init: function(config, srecord) {

		let port
		let toggle = true
		let respExpectedSize = 0
		let sentCmdSize = 0
		let respBuff = []
        let callback = null
        let timer = null
        const defaultTimeout = 2000 // 2 sec

        function loByte(a) {
            return a & 0xFF
        }

        function hiByte(a) {
            return (a >> 8) & 0xFF
        }


		async function beep(type) {
			console.log('beep')
			return sendData(defaultTimeout, 0x51, type)
		}

		async function connect() {
			port = await navigator.serial.requestPort()

			await port.open({baudRate: 2400, parity: 'odd' })

			readLoop()
		}


		async function readLoop() {
			const reader = port.readable.getReader()

			while(true) {
				const {value, done} = await reader.read()				
				//console.log(value, done)
				if (respExpectedSize != 0) {
					respBuff = respBuff.concat(Array.from(value))
                }
                
                //console.log('respBuffLength', respBuff.length)

				if (respExpectedSize == respBuff.length) {
					
					const resp = decodeResp(respBuff.slice(sentCmdSize))
                    console.log('resp', resp)
                    
                    clearTimeout(timer)
                    timer = null

					if (typeof callback == 'function') {
						callback(resp)
					}
					
					respBuff = []
					respExpectedSize = 0
				}

				if (done) {
					reader.releaseLock()
					break;
				}
			}

		}

		function getRespSize(opcode) {
			switch(opcode) {
                case 0x45:
                case 0x75:
                    return 2
                case 0x12:
				case 0x30:
					return 3
				case 0x15:
					return 9
                case 0xA5:
                    return 26
				default:
					return 1
			}
		}

		function decodeResp(buffer) {
			const ret = []
			buffer = buffer.slice(3) // skip header
			for(let i = 0; i < buffer.length - 2; i+= 2) {
				ret.push(buffer[i])
			}
			return ret
		}

		function encode(bytes) {
            sentCmdSize = bytes.length * 2 + 5
            //console.log('sentCmdSize', sentCmdSize)

			const buffer = new ArrayBuffer(sentCmdSize)
			const view = new Uint8Array(buffer)

			view[0] = 0x55
			view[1] = 0xff
			view[2] = 0x00

			if (toggle) {
				bytes[0] |= 0x08
			}

			toggle = !toggle

			let off = 3
			let sum = 0
			bytes.forEach((byte) => {
				view[off++] = byte
				view[off++] = ~byte & 0xff
				sum = (sum + byte) & 0xff
			})

			view[off++] = sum
			view[off++] = ~sum & 0xff

			//console.log('encodeBytes', view)
			return buffer

		}

		function sendData(timeout, ...bytes) {
            //console.log('sendData', bytes)
            respBuff = []
            if (timer != null) {
                return Promise.reject('Busy')
            }

			return new Promise((resolve, reject) => {
				callback = resolve
				
				const respSize = getRespSize(bytes[0])

				const writer = port.writable.getWriter()
	
                const encodedData = encode(bytes)
	
				writer.write(encodedData)
	
				respExpectedSize = (bytes.length + respSize) * 2 + 10
				//console.log('respSize', respSize)
				//console.log('respExpectedBytes', respExpectedSize)
	
                writer.releaseLock()
                if (timeout != 0) {
                    timer = setTimeout(() => {
                        timer = null
                        reject('Timeout, check your RCX is switched on')
                    }, timeout)    
                }
	
			})

        }

        async function downloadFirmware(srec, chunkSize) {
            console.log('rcx.downloadFirmware')
            let ret = srecord.parse(srec)
            console.log('parse ret', ret)
            const data = Object.values(ret.mem).flat()
            console.log('data', data)
            let checksum = 0
            data.forEach((val) => {
                checksum = (checksum + val) % 65536
            })
            console.log('checksum', checksum)   
            await deleteFirmware()      
            ret = await startDownloadFirmware(ret.boot, checksum)  
            if (ret != 0) {
                throw 'startDownloadFirmware failed'
            }
            
            let remain = data.length
            let seq = 1
            let offset = 0
            while (remain > 0) {
                console.log('remainBytes', remain)
                let n = chunkSize
                if (remain <= chunkSize) {
                    seq = 0
                    n = chunkSize
                }
                console.log('chunkSize', n)
                ret = await transferData(seq++, data.slice(offset, offset + n))
                if (ret != 0) {
                    throw 'transferData error=' + ret
                }
                remain -= n
                offset += n
            }

            ret = await unlockFirmware()
            console.log('ret', ret)


        }

        async function deleteFirmware() {
            console.log('deleteFirmware')
            return await sendData(defaultTimeout, 0x65, 1, 3, 5, 7, 11)
        }

        async function unlockFirmware() {
            console.log('unlockFirmware')
            return await sendData(0, 0xA5, 76, 69, 71, 79, 174)  // "LEGO®"
        }

        async function startDownloadFirmware(entryAddr, checksum) {
            console.log('startDownloadFirmware', entryAddr, '0x', checksum.toString(16))
            const resp = await sendData(defaultTimeout, 0x75, loByte(entryAddr), hiByte(entryAddr), loByte(checksum), hiByte(checksum), 0)
            return resp[1]
        }

        async function transferData(index, data) {
            let checksum = 0
            data.forEach((val) => {
                checksum = (checksum + val) % 256
            })
            let length = data.length
            console.log('transferData data length=', length, 'checksum=', checksum)
            const resp = await sendData(defaultTimeout * 10, 0x45, loByte(index), hiByte(index), loByte(length), hiByte(length), ...data, checksum)
            return resp[1]
        }
        
        async function getBatteryLevel() {
            const resp = await sendData(defaultTimeout, 0x30)
            return resp[1] + (resp[2] << 8)

        }

        async function getVersion() {
            const resp = await sendData(defaultTimeout, 0x15, 1, 3, 5, 7, 11)
            return {
                romVersion: {
                    major: (resp[1] << 8) + resp[2],
                    minor: (resp[3] << 8) + resp[4]
                },
                firmwareVersion: {
                    major: (resp[5] << 8) + resp[6],
                    minor: (resp[7] << 8) + resp[8]
                }
            }
        }

        async function powerOff() {
            return await sendData(defaultTimeout, 0x60)
        }

        function getMotorList(list) {
            let ret = 0
            list.forEach((val) => {
                switch(val) {
                    case 'A': ret |= 1; break
                    case 'B': ret |= 2; break
                    case 'C': ret |= 4; break
                }
            })
            return ret
        }

        async function isAlive() {
            return sendData(defaultTimeout, 0x10)
        }

        async function motorOn(motorList) {
            return sendData(defaultTimeout, 0x21, 0xC0 | getMotorList(motorList))
        }

        async function motorOff(motorList) {
            return sendData(defaultTimeout, 0x21, 0x10 | getMotorList(motorList))
        }

        async function motorFwd(motorList) {
            return sendData(defaultTimeout, 0xE1, 0x80 | getMotorList(motorList))
        }

        async function motorBkd(motorList) {
            return sendData(defaultTimeout, 0xE1, 0x00 | getMotorList(motorList))
        }

        async function motorPower(motorList, power /* 0 to 7 */) {
            return sendData(defaultTimeout, 0x13, getMotorList(motorList), 2, power)
        }

        async function setDate() {
            const d = new Date()

            return sendData(defaultTimeout, 0x22, d.getHours(), d.getMinutes())
        }

        async function motorStatus(motor) {
            motor = motor.charCodeAt(0) - 65

            const resp = await sendData(defaultTimeout, 0x12, 3, motor)
            const mask = resp[1]
            const ret = {
                power: mask & 0x07,
                dir: ((mask & 0x08) != 0) ? 'FWD' : 'BACK',
                brake: ((mask & 0x40) != 0),
                on: ((mask & 0x80) != 0)

            }
            return ret
            
        }

        return {
            connect,
            beep,
            getBatteryLevel,
            getVersion,
            powerOff,
            motorOn,
            motorOff,
            motorFwd,
            motorBkd,
            motorPower,
            motorStatus,
            deleteFirmware,
            startDownloadFirmware,
            unlockFirmware,
            transferData,
            downloadFirmware,
            isAlive

        }

    }
})