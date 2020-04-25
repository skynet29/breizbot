$$.service.registerService('app.rcx', {
    
    init: function(config) {

		let port
		let toggle = true
		let respExpectedSize = 0
		let sentCmdSize = 0
		let respBuff = []
        let callback = null
        let timer = null


		async function beep(type) {
			console.log('beep')
			return sendData(0x51, type)
		}

		async function connect() {
			port = await navigator.serial.requestPort()

			await port.open({baudrate: 2400, parity: 'odd' })

			readLoop()
		}


		async function readLoop() {
			const reader = port.readable.getReader()

			while(true) {
				const {value, done} = await reader.read()				
				console.log(value, done)
				if (respExpectedSize != 0) {
					respBuff = respBuff.concat(Array.from(value))
                }
                
                if (respBuff.length >= sentCmdSize) {
                    console.log('resp echo ok')
                }

				if (respExpectedSize == respBuff.length) {
					//console.log('respBuff', respBuff)
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
                case 0x12:
				case 0x30:
					return 3
				case 0x15:
					return 9
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

			//console.log('buffer', buffer)
			return buffer

		}

		function sendData(...bytes) {
            console.log('sendData', bytes)
            respBuff = []
            if (timer != null) {
                return Promise.reject('Busy')
            }

			return new Promise((resolve, reject) => {
				callback = resolve
				
				const respSize = getRespSize(bytes[0])

				const writer = port.writable.getWriter()
	
		
				writer.write(encode(bytes))
	
				respExpectedSize = (bytes.length + respSize) * 2 + 10
				//console.log('respExpectedSize', respExpectedSize)
	
                writer.releaseLock()
                
                timer = setTimeout(() => {
                    timer = null
                    reject('Timeout')
                }, 1000)
	
			})

        }
        
        async function getBatteryLevel() {
            const resp = await sendData(0x30)
            return resp[1] + (resp[2] << 8)
        }

        async function getVersion() {
            const resp = await sendData(0x12, 35, 0)
            return resp[1] + (resp[2] << 8)
        }

        async function powerOff() {
            return await sendData(0x60)
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

        async function motorOn(motorList) {
            return sendData(0x21, 0xC0 | getMotorList(motorList))
        }

        async function motorOff(motorList) {
            return sendData(0x21, 0x10 | getMotorList(motorList))
        }

        async function motorFwd(motorList) {
            return sendData(0xE1, 0x80 | getMotorList(motorList))
        }

        async function motorBkd(motorList) {
            return sendData(0xE1, 0x00 | getMotorList(motorList))
        }

        async function motorPower(motorList, power /* 0 to 7 */) {
            return sendData(0x13, getMotorList(motorList), 2, power)
        }

        async function setDate() {
            const d = new Date()

            return sendData(0x22, d.getHours(), d.getMinutes())
        }

        async function motorStatus(motor) {
            motor = motor.charCodeAt(0) - 65

            const resp = await sendData(0x12, 3, motor)
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
            motorStatus

        }

    }
})