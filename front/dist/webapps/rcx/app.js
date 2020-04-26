$$.control.registerControl('rootPage', {

	template: "<div>\n    <div bn-show=\"notSupported\" class=\"notSupported\">\n        Sorry, <b>Web Serial</b> is not supported on this device, make sure you\'re\n        running Chrome 78 or later and have enabled the\n        <code>#enable-experimental-web-platform-features</code> flag in\n        <code>chrome://flags</code>\n    </div>\n\n    <button class=\"w3-button w3-blue\" \n        bn-event=\"click: onConnect\"\n        bn-show=\"showConnect\"\n        >Connect</button>\n\n    <div bn-show=\"connected\">\n\n        <div class=\"beep\">\n            <button class=\"w3-button w3-blue\" bn-event=\"click: onBeep\">Beep</button>\n\n            <div bn-control=\"brainjs.combobox\", \n            bn-data=\"{items: [\n                {value: 0, label: \'Beep\'},\n                {value: 1, label: \'Beep beep\'},\n                {value: 2, label: \'Downward tones\'},\n                {value: 3, label: \'Upward tones\'},\n                {value: 4, label: \'Low buzz\'},\n                {value: 5, label: \'Fast upward tones\'}\n            ]}\" \n            bn-val=\"beep\" bn-iface=\"beepType\"></div>\n    \n        </div>\n        <button class=\"w3-button w3-blue\" bn-event=\"click: onBattery\">Battery</button>\n        <button class=\"w3-button w3-blue\" bn-event=\"click: onVersion\">Version</button>\n        <button class=\"w3-button w3-blue\" bn-event=\"click: onMotorStatus\">Motor Status</button>\n        <button class=\"w3-button w3-blue\" bn-event=\"click: onPowerOff\">Power Off</button>\n\n        <fieldset bn-control=\"brainjs.checkgroup\" bn-iface=\"motorList\">\n            <legend>Motor List</legend>\n            <input type=\"checkbox\" value=\"A\" class=\"w3-check\"><label>A</label>\n            <input type=\"checkbox\" value=\"B\" class=\"w3-check\"><label>B</label>\n            <input type=\"checkbox\" value=\"C\" class=\"w3-check\"><label>C</label>\n\n        </fieldset>\n\n        <fieldset bn-control=\"brainjs.radiogroup\" bn-iface=\"motorDir\">\n            <legend>Motor Direction</legend>\n            <input type=\"radio\" value=\"Fwd\" class=\"w3-radio\"><label>Forward</label>\n            <input type=\"radio\" value=\"Bkd\" class=\"w3-radio\"><label>Backward</label>\n\n        </fieldset>\n\n        <button class=\"w3-button w3-blue\" bn-event=\"click: onMotorOn\">Motor On</button>\n        <button class=\"w3-button w3-blue\" bn-event=\"click: onMotorOff\">Motor Off</button>\n\n    </div>\n\n\n</div>",

	deps: ['app.rcx'],

	init: function(elt, rcx) {


		const ctrl = $$.viewController(elt, {
			data: {
				notSupported: !('serial' in navigator),
				connected: false,
				beep: 0,
				showConnect: function() {
					return !this.notSupported && !this.connected
				}
			},
			events: {
				onConnect: async function() {
					await rcx.connect()
					ctrl.setData({connected: true})
				},
				onBeep: async function() {
					const beepType = parseInt(ctrl.scope.beepType.getValue())
					console.log('beepType', beepType)
					await rcx.beep(beepType)
				},
				onBattery: async function() {
					const level = await rcx.getBatteryLevel()
					console.log('level', level)
					$$.ui.showAlert({title: 'Battery Level', content: `${level} mV`})
				},
				onVersion: async function() {
					const version = await rcx.getVersion()
					console.log('version', version)
					$$.ui.showAlert({title: 'Firmware version', content: version})
				},
				onPowerOff: async function() {
					await rcx.powerOff()
				},
				onMotorOn: async function() {
					const motorList = ctrl.scope.motorList.getValue()
					const motorDir = ctrl.scope.motorDir.getValue()
					console.log('motorList', motorList)
					console.log('motorDir', motorDir)
					if (motorDir == 'Fwd') {
						await rcx.motorFwd(motorList)
					}
					else {
						await rcx.motorBkd(motorList)
					}
					await rcx.motorOn(motorList)
				},
				onMotorOff: async function() {
					const motorList = ctrl.scope.motorList.getValue()
					console.log('motorList', motorList)
					await rcx.motorOff(motorList)
				},
				onMotorStatus: async function() {
					const retA = await rcx.motorStatus('A')
					const retB = await rcx.motorStatus('B')
					const retC = await rcx.motorStatus('C')
					let status =  {
						A: retA, B: retB, C: retC
					}
					status = JSON.stringify(status, null, 4)
					console.log('status', status)
					$$.ui.showAlert({
						title: 'Motor Status',
						height: 400,
						content: `<pre>${status}</pre>`
					})
				}
			}
		})
	}


});





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
                    reject('Timeout, check your RCX is switched on')
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJyY3guanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXY+XFxuICAgIDxkaXYgYm4tc2hvdz1cXFwibm90U3VwcG9ydGVkXFxcIiBjbGFzcz1cXFwibm90U3VwcG9ydGVkXFxcIj5cXG4gICAgICAgIFNvcnJ5LCA8Yj5XZWIgU2VyaWFsPC9iPiBpcyBub3Qgc3VwcG9ydGVkIG9uIHRoaXMgZGV2aWNlLCBtYWtlIHN1cmUgeW91XFwncmVcXG4gICAgICAgIHJ1bm5pbmcgQ2hyb21lIDc4IG9yIGxhdGVyIGFuZCBoYXZlIGVuYWJsZWQgdGhlXFxuICAgICAgICA8Y29kZT4jZW5hYmxlLWV4cGVyaW1lbnRhbC13ZWItcGxhdGZvcm0tZmVhdHVyZXM8L2NvZGU+IGZsYWcgaW5cXG4gICAgICAgIDxjb2RlPmNocm9tZTovL2ZsYWdzPC9jb2RlPlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLWJsdWVcXFwiIFxcbiAgICAgICAgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkNvbm5lY3RcXFwiXFxuICAgICAgICBibi1zaG93PVxcXCJzaG93Q29ubmVjdFxcXCJcXG4gICAgICAgID5Db25uZWN0PC9idXR0b24+XFxuXFxuICAgIDxkaXYgYm4tc2hvdz1cXFwiY29ubmVjdGVkXFxcIj5cXG5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImJlZXBcXFwiPlxcbiAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1ibHVlXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uQmVlcFxcXCI+QmVlcDwvYnV0dG9uPlxcblxcbiAgICAgICAgICAgIDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb21ib2JveFxcXCIsIFxcbiAgICAgICAgICAgIGJuLWRhdGE9XFxcIntpdGVtczogW1xcbiAgICAgICAgICAgICAgICB7dmFsdWU6IDAsIGxhYmVsOiBcXCdCZWVwXFwnfSxcXG4gICAgICAgICAgICAgICAge3ZhbHVlOiAxLCBsYWJlbDogXFwnQmVlcCBiZWVwXFwnfSxcXG4gICAgICAgICAgICAgICAge3ZhbHVlOiAyLCBsYWJlbDogXFwnRG93bndhcmQgdG9uZXNcXCd9LFxcbiAgICAgICAgICAgICAgICB7dmFsdWU6IDMsIGxhYmVsOiBcXCdVcHdhcmQgdG9uZXNcXCd9LFxcbiAgICAgICAgICAgICAgICB7dmFsdWU6IDQsIGxhYmVsOiBcXCdMb3cgYnV6elxcJ30sXFxuICAgICAgICAgICAgICAgIHt2YWx1ZTogNSwgbGFiZWw6IFxcJ0Zhc3QgdXB3YXJkIHRvbmVzXFwnfVxcbiAgICAgICAgICAgIF19XFxcIiBcXG4gICAgICAgICAgICBibi12YWw9XFxcImJlZXBcXFwiIGJuLWlmYWNlPVxcXCJiZWVwVHlwZVxcXCI+PC9kaXY+XFxuICAgIFxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtYmx1ZVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkJhdHRlcnlcXFwiPkJhdHRlcnk8L2J1dHRvbj5cXG4gICAgICAgIDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1ibHVlXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uVmVyc2lvblxcXCI+VmVyc2lvbjwvYnV0dG9uPlxcbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uIHczLWJsdWVcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25Nb3RvclN0YXR1c1xcXCI+TW90b3IgU3RhdHVzPC9idXR0b24+XFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b24gdzMtYmx1ZVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblBvd2VyT2ZmXFxcIj5Qb3dlciBPZmY8L2J1dHRvbj5cXG5cXG4gICAgICAgIDxmaWVsZHNldCBibi1jb250cm9sPVxcXCJicmFpbmpzLmNoZWNrZ3JvdXBcXFwiIGJuLWlmYWNlPVxcXCJtb3Rvckxpc3RcXFwiPlxcbiAgICAgICAgICAgIDxsZWdlbmQ+TW90b3IgTGlzdDwvbGVnZW5kPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgdmFsdWU9XFxcIkFcXFwiIGNsYXNzPVxcXCJ3My1jaGVja1xcXCI+PGxhYmVsPkE8L2xhYmVsPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgdmFsdWU9XFxcIkJcXFwiIGNsYXNzPVxcXCJ3My1jaGVja1xcXCI+PGxhYmVsPkI8L2xhYmVsPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgdmFsdWU9XFxcIkNcXFwiIGNsYXNzPVxcXCJ3My1jaGVja1xcXCI+PGxhYmVsPkM8L2xhYmVsPlxcblxcbiAgICAgICAgPC9maWVsZHNldD5cXG5cXG4gICAgICAgIDxmaWVsZHNldCBibi1jb250cm9sPVxcXCJicmFpbmpzLnJhZGlvZ3JvdXBcXFwiIGJuLWlmYWNlPVxcXCJtb3RvckRpclxcXCI+XFxuICAgICAgICAgICAgPGxlZ2VuZD5Nb3RvciBEaXJlY3Rpb248L2xlZ2VuZD5cXG4gICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwicmFkaW9cXFwiIHZhbHVlPVxcXCJGd2RcXFwiIGNsYXNzPVxcXCJ3My1yYWRpb1xcXCI+PGxhYmVsPkZvcndhcmQ8L2xhYmVsPlxcbiAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJyYWRpb1xcXCIgdmFsdWU9XFxcIkJrZFxcXCIgY2xhc3M9XFxcInczLXJhZGlvXFxcIj48bGFiZWw+QmFja3dhcmQ8L2xhYmVsPlxcblxcbiAgICAgICAgPC9maWVsZHNldD5cXG5cXG4gICAgICAgIDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1ibHVlXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uTW90b3JPblxcXCI+TW90b3IgT248L2J1dHRvbj5cXG4gICAgICAgIDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvbiB3My1ibHVlXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uTW90b3JPZmZcXFwiPk1vdG9yIE9mZjwvYnV0dG9uPlxcblxcbiAgICA8L2Rpdj5cXG5cXG5cXG48L2Rpdj5cIixcblxuXHRkZXBzOiBbJ2FwcC5yY3gnXSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHJjeCkge1xuXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdG5vdFN1cHBvcnRlZDogISgnc2VyaWFsJyBpbiBuYXZpZ2F0b3IpLFxuXHRcdFx0XHRjb25uZWN0ZWQ6IGZhbHNlLFxuXHRcdFx0XHRiZWVwOiAwLFxuXHRcdFx0XHRzaG93Q29ubmVjdDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuICF0aGlzLm5vdFN1cHBvcnRlZCAmJiAhdGhpcy5jb25uZWN0ZWRcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkNvbm5lY3Q6IGFzeW5jIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGF3YWl0IHJjeC5jb25uZWN0KClcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe2Nvbm5lY3RlZDogdHJ1ZX0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQmVlcDogYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgYmVlcFR5cGUgPSBwYXJzZUludChjdHJsLnNjb3BlLmJlZXBUeXBlLmdldFZhbHVlKCkpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ2JlZXBUeXBlJywgYmVlcFR5cGUpXG5cdFx0XHRcdFx0YXdhaXQgcmN4LmJlZXAoYmVlcFR5cGUpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQmF0dGVyeTogYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgbGV2ZWwgPSBhd2FpdCByY3guZ2V0QmF0dGVyeUxldmVsKClcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnbGV2ZWwnLCBsZXZlbClcblx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnQmF0dGVyeSBMZXZlbCcsIGNvbnRlbnQ6IGAke2xldmVsfSBtVmB9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblZlcnNpb246IGFzeW5jIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IHZlcnNpb24gPSBhd2FpdCByY3guZ2V0VmVyc2lvbigpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3ZlcnNpb24nLCB2ZXJzaW9uKVxuXHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdGaXJtd2FyZSB2ZXJzaW9uJywgY29udGVudDogdmVyc2lvbn0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUG93ZXJPZmY6IGFzeW5jIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGF3YWl0IHJjeC5wb3dlck9mZigpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uTW90b3JPbjogYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgbW90b3JMaXN0ID0gY3RybC5zY29wZS5tb3Rvckxpc3QuZ2V0VmFsdWUoKVxuXHRcdFx0XHRcdGNvbnN0IG1vdG9yRGlyID0gY3RybC5zY29wZS5tb3RvckRpci5nZXRWYWx1ZSgpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ21vdG9yTGlzdCcsIG1vdG9yTGlzdClcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnbW90b3JEaXInLCBtb3RvckRpcilcblx0XHRcdFx0XHRpZiAobW90b3JEaXIgPT0gJ0Z3ZCcpIHtcblx0XHRcdFx0XHRcdGF3YWl0IHJjeC5tb3RvckZ3ZChtb3Rvckxpc3QpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0YXdhaXQgcmN4Lm1vdG9yQmtkKG1vdG9yTGlzdClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0YXdhaXQgcmN4Lm1vdG9yT24obW90b3JMaXN0KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbk1vdG9yT2ZmOiBhc3luYyBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zdCBtb3Rvckxpc3QgPSBjdHJsLnNjb3BlLm1vdG9yTGlzdC5nZXRWYWx1ZSgpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ21vdG9yTGlzdCcsIG1vdG9yTGlzdClcblx0XHRcdFx0XHRhd2FpdCByY3gubW90b3JPZmYobW90b3JMaXN0KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbk1vdG9yU3RhdHVzOiBhc3luYyBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zdCByZXRBID0gYXdhaXQgcmN4Lm1vdG9yU3RhdHVzKCdBJylcblx0XHRcdFx0XHRjb25zdCByZXRCID0gYXdhaXQgcmN4Lm1vdG9yU3RhdHVzKCdCJylcblx0XHRcdFx0XHRjb25zdCByZXRDID0gYXdhaXQgcmN4Lm1vdG9yU3RhdHVzKCdDJylcblx0XHRcdFx0XHRsZXQgc3RhdHVzID0gIHtcblx0XHRcdFx0XHRcdEE6IHJldEEsIEI6IHJldEIsIEM6IHJldENcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0c3RhdHVzID0gSlNPTi5zdHJpbmdpZnkoc3RhdHVzLCBudWxsLCA0KVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdzdGF0dXMnLCBzdGF0dXMpXG5cdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnTW90b3IgU3RhdHVzJyxcblx0XHRcdFx0XHRcdGhlaWdodDogNDAwLFxuXHRcdFx0XHRcdFx0Y29udGVudDogYDxwcmU+JHtzdGF0dXN9PC9wcmU+YFxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdhcHAucmN4Jywge1xuICAgIFxuICAgIGluaXQ6IGZ1bmN0aW9uKGNvbmZpZykge1xuXG5cdFx0bGV0IHBvcnRcblx0XHRsZXQgdG9nZ2xlID0gdHJ1ZVxuXHRcdGxldCByZXNwRXhwZWN0ZWRTaXplID0gMFxuXHRcdGxldCBzZW50Q21kU2l6ZSA9IDBcblx0XHRsZXQgcmVzcEJ1ZmYgPSBbXVxuICAgICAgICBsZXQgY2FsbGJhY2sgPSBudWxsXG4gICAgICAgIGxldCB0aW1lciA9IG51bGxcblxuXG5cdFx0YXN5bmMgZnVuY3Rpb24gYmVlcCh0eXBlKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnYmVlcCcpXG5cdFx0XHRyZXR1cm4gc2VuZERhdGEoMHg1MSwgdHlwZSlcblx0XHR9XG5cblx0XHRhc3luYyBmdW5jdGlvbiBjb25uZWN0KCkge1xuXHRcdFx0cG9ydCA9IGF3YWl0IG5hdmlnYXRvci5zZXJpYWwucmVxdWVzdFBvcnQoKVxuXG5cdFx0XHRhd2FpdCBwb3J0Lm9wZW4oe2JhdWRyYXRlOiAyNDAwLCBwYXJpdHk6ICdvZGQnIH0pXG5cblx0XHRcdHJlYWRMb29wKClcblx0XHR9XG5cblxuXHRcdGFzeW5jIGZ1bmN0aW9uIHJlYWRMb29wKCkge1xuXHRcdFx0Y29uc3QgcmVhZGVyID0gcG9ydC5yZWFkYWJsZS5nZXRSZWFkZXIoKVxuXG5cdFx0XHR3aGlsZSh0cnVlKSB7XG5cdFx0XHRcdGNvbnN0IHt2YWx1ZSwgZG9uZX0gPSBhd2FpdCByZWFkZXIucmVhZCgpXHRcdFx0XHRcblx0XHRcdFx0Y29uc29sZS5sb2codmFsdWUsIGRvbmUpXG5cdFx0XHRcdGlmIChyZXNwRXhwZWN0ZWRTaXplICE9IDApIHtcblx0XHRcdFx0XHRyZXNwQnVmZiA9IHJlc3BCdWZmLmNvbmNhdChBcnJheS5mcm9tKHZhbHVlKSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BCdWZmLmxlbmd0aCA+PSBzZW50Q21kU2l6ZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncmVzcCBlY2hvIG9rJylcbiAgICAgICAgICAgICAgICB9XG5cblx0XHRcdFx0aWYgKHJlc3BFeHBlY3RlZFNpemUgPT0gcmVzcEJ1ZmYubGVuZ3RoKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygncmVzcEJ1ZmYnLCByZXNwQnVmZilcblx0XHRcdFx0XHRjb25zdCByZXNwID0gZGVjb2RlUmVzcChyZXNwQnVmZi5zbGljZShzZW50Q21kU2l6ZSkpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lcilcbiAgICAgICAgICAgICAgICAgICAgdGltZXIgPSBudWxsXG5cblx0XHRcdFx0XHRpZiAodHlwZW9mIGNhbGxiYWNrID09ICdmdW5jdGlvbicpIHtcblx0XHRcdFx0XHRcdGNhbGxiYWNrKHJlc3ApXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdHJlc3BCdWZmID0gW11cblx0XHRcdFx0XHRyZXNwRXhwZWN0ZWRTaXplID0gMFxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGRvbmUpIHtcblx0XHRcdFx0XHRyZWFkZXIucmVsZWFzZUxvY2soKVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRSZXNwU2l6ZShvcGNvZGUpIHtcblx0XHRcdHN3aXRjaChvcGNvZGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIDB4MTI6XG5cdFx0XHRcdGNhc2UgMHgzMDpcblx0XHRcdFx0XHRyZXR1cm4gM1xuXHRcdFx0XHRjYXNlIDB4MTU6XG5cdFx0XHRcdFx0cmV0dXJuIDlcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRyZXR1cm4gMVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGRlY29kZVJlc3AoYnVmZmVyKSB7XG5cdFx0XHRjb25zdCByZXQgPSBbXVxuXHRcdFx0YnVmZmVyID0gYnVmZmVyLnNsaWNlKDMpIC8vIHNraXAgaGVhZGVyXG5cdFx0XHRmb3IobGV0IGkgPSAwOyBpIDwgYnVmZmVyLmxlbmd0aCAtIDI7IGkrPSAyKSB7XG5cdFx0XHRcdHJldC5wdXNoKGJ1ZmZlcltpXSlcblx0XHRcdH1cblx0XHRcdHJldHVybiByZXRcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBlbmNvZGUoYnl0ZXMpIHtcbiAgICAgICAgICAgIHNlbnRDbWRTaXplID0gYnl0ZXMubGVuZ3RoICogMiArIDVcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3NlbnRDbWRTaXplJywgc2VudENtZFNpemUpXG5cblx0XHRcdGNvbnN0IGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihzZW50Q21kU2l6ZSlcblx0XHRcdGNvbnN0IHZpZXcgPSBuZXcgVWludDhBcnJheShidWZmZXIpXG5cblx0XHRcdHZpZXdbMF0gPSAweDU1XG5cdFx0XHR2aWV3WzFdID0gMHhmZlxuXHRcdFx0dmlld1syXSA9IDB4MDBcblxuXHRcdFx0aWYgKHRvZ2dsZSkge1xuXHRcdFx0XHRieXRlc1swXSB8PSAweDA4XG5cdFx0XHR9XG5cblx0XHRcdHRvZ2dsZSA9ICF0b2dnbGVcblxuXHRcdFx0bGV0IG9mZiA9IDNcblx0XHRcdGxldCBzdW0gPSAwXG5cdFx0XHRieXRlcy5mb3JFYWNoKChieXRlKSA9PiB7XG5cdFx0XHRcdHZpZXdbb2ZmKytdID0gYnl0ZVxuXHRcdFx0XHR2aWV3W29mZisrXSA9IH5ieXRlICYgMHhmZlxuXHRcdFx0XHRzdW0gPSAoc3VtICsgYnl0ZSkgJiAweGZmXG5cdFx0XHR9KVxuXG5cdFx0XHR2aWV3W29mZisrXSA9IHN1bVxuXHRcdFx0dmlld1tvZmYrK10gPSB+c3VtICYgMHhmZlxuXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdidWZmZXInLCBidWZmZXIpXG5cdFx0XHRyZXR1cm4gYnVmZmVyXG5cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzZW5kRGF0YSguLi5ieXRlcykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3NlbmREYXRhJywgYnl0ZXMpXG4gICAgICAgICAgICByZXNwQnVmZiA9IFtdXG4gICAgICAgICAgICBpZiAodGltZXIgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdCgnQnVzeScpXG4gICAgICAgICAgICB9XG5cblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHRcdGNhbGxiYWNrID0gcmVzb2x2ZVxuXHRcdFx0XHRcblx0XHRcdFx0Y29uc3QgcmVzcFNpemUgPSBnZXRSZXNwU2l6ZShieXRlc1swXSlcblxuXHRcdFx0XHRjb25zdCB3cml0ZXIgPSBwb3J0LndyaXRhYmxlLmdldFdyaXRlcigpXG5cdFxuXHRcdFxuXHRcdFx0XHR3cml0ZXIud3JpdGUoZW5jb2RlKGJ5dGVzKSlcblx0XG5cdFx0XHRcdHJlc3BFeHBlY3RlZFNpemUgPSAoYnl0ZXMubGVuZ3RoICsgcmVzcFNpemUpICogMiArIDEwXG5cdFx0XHRcdC8vY29uc29sZS5sb2coJ3Jlc3BFeHBlY3RlZFNpemUnLCByZXNwRXhwZWN0ZWRTaXplKVxuXHRcbiAgICAgICAgICAgICAgICB3cml0ZXIucmVsZWFzZUxvY2soKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVyID0gbnVsbFxuICAgICAgICAgICAgICAgICAgICByZWplY3QoJ1RpbWVvdXQsIGNoZWNrIHlvdXIgUkNYIGlzIHN3aXRjaGVkIG9uJylcbiAgICAgICAgICAgICAgICB9LCAxMDAwKVxuXHRcblx0XHRcdH0pXG5cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgYXN5bmMgZnVuY3Rpb24gZ2V0QmF0dGVyeUxldmVsKCkge1xuICAgICAgICAgICAgY29uc3QgcmVzcCA9IGF3YWl0IHNlbmREYXRhKDB4MzApXG4gICAgICAgICAgICByZXR1cm4gcmVzcFsxXSArIChyZXNwWzJdIDw8IDgpXG4gICAgICAgIH1cblxuICAgICAgICBhc3luYyBmdW5jdGlvbiBnZXRWZXJzaW9uKCkge1xuICAgICAgICAgICAgY29uc3QgcmVzcCA9IGF3YWl0IHNlbmREYXRhKDB4MTIsIDM1LCAwKVxuICAgICAgICAgICAgcmV0dXJuIHJlc3BbMV0gKyAocmVzcFsyXSA8PCA4KVxuICAgICAgICB9XG5cbiAgICAgICAgYXN5bmMgZnVuY3Rpb24gcG93ZXJPZmYoKSB7XG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgc2VuZERhdGEoMHg2MClcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldE1vdG9yTGlzdChsaXN0KSB7XG4gICAgICAgICAgICBsZXQgcmV0ID0gMFxuICAgICAgICAgICAgbGlzdC5mb3JFYWNoKCh2YWwpID0+IHtcbiAgICAgICAgICAgICAgICBzd2l0Y2godmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0EnOiByZXQgfD0gMTsgYnJlYWtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnQic6IHJldCB8PSAyOyBicmVha1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdDJzogcmV0IHw9IDQ7IGJyZWFrXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHJldHVybiByZXRcbiAgICAgICAgfVxuXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIG1vdG9yT24obW90b3JMaXN0KSB7XG4gICAgICAgICAgICByZXR1cm4gc2VuZERhdGEoMHgyMSwgMHhDMCB8IGdldE1vdG9yTGlzdChtb3Rvckxpc3QpKVxuICAgICAgICB9XG5cbiAgICAgICAgYXN5bmMgZnVuY3Rpb24gbW90b3JPZmYobW90b3JMaXN0KSB7XG4gICAgICAgICAgICByZXR1cm4gc2VuZERhdGEoMHgyMSwgMHgxMCB8IGdldE1vdG9yTGlzdChtb3Rvckxpc3QpKVxuICAgICAgICB9XG5cbiAgICAgICAgYXN5bmMgZnVuY3Rpb24gbW90b3JGd2QobW90b3JMaXN0KSB7XG4gICAgICAgICAgICByZXR1cm4gc2VuZERhdGEoMHhFMSwgMHg4MCB8IGdldE1vdG9yTGlzdChtb3Rvckxpc3QpKVxuICAgICAgICB9XG5cbiAgICAgICAgYXN5bmMgZnVuY3Rpb24gbW90b3JCa2QobW90b3JMaXN0KSB7XG4gICAgICAgICAgICByZXR1cm4gc2VuZERhdGEoMHhFMSwgMHgwMCB8IGdldE1vdG9yTGlzdChtb3Rvckxpc3QpKVxuICAgICAgICB9XG5cbiAgICAgICAgYXN5bmMgZnVuY3Rpb24gbW90b3JQb3dlcihtb3Rvckxpc3QsIHBvd2VyIC8qIDAgdG8gNyAqLykge1xuICAgICAgICAgICAgcmV0dXJuIHNlbmREYXRhKDB4MTMsIGdldE1vdG9yTGlzdChtb3Rvckxpc3QpLCAyLCBwb3dlcilcbiAgICAgICAgfVxuXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIHNldERhdGUoKSB7XG4gICAgICAgICAgICBjb25zdCBkID0gbmV3IERhdGUoKVxuXG4gICAgICAgICAgICByZXR1cm4gc2VuZERhdGEoMHgyMiwgZC5nZXRIb3VycygpLCBkLmdldE1pbnV0ZXMoKSlcbiAgICAgICAgfVxuXG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uIG1vdG9yU3RhdHVzKG1vdG9yKSB7XG4gICAgICAgICAgICBtb3RvciA9IG1vdG9yLmNoYXJDb2RlQXQoMCkgLSA2NVxuXG4gICAgICAgICAgICBjb25zdCByZXNwID0gYXdhaXQgc2VuZERhdGEoMHgxMiwgMywgbW90b3IpXG4gICAgICAgICAgICBjb25zdCBtYXNrID0gcmVzcFsxXVxuICAgICAgICAgICAgY29uc3QgcmV0ID0ge1xuICAgICAgICAgICAgICAgIHBvd2VyOiBtYXNrICYgMHgwNyxcbiAgICAgICAgICAgICAgICBkaXI6ICgobWFzayAmIDB4MDgpICE9IDApID8gJ0ZXRCcgOiAnQkFDSycsXG4gICAgICAgICAgICAgICAgYnJha2U6ICgobWFzayAmIDB4NDApICE9IDApLFxuICAgICAgICAgICAgICAgIG9uOiAoKG1hc2sgJiAweDgwKSAhPSAwKVxuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmV0XG4gICAgICAgICAgICBcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjb25uZWN0LFxuICAgICAgICAgICAgYmVlcCxcbiAgICAgICAgICAgIGdldEJhdHRlcnlMZXZlbCxcbiAgICAgICAgICAgIGdldFZlcnNpb24sXG4gICAgICAgICAgICBwb3dlck9mZixcbiAgICAgICAgICAgIG1vdG9yT24sXG4gICAgICAgICAgICBtb3Rvck9mZixcbiAgICAgICAgICAgIG1vdG9yRndkLFxuICAgICAgICAgICAgbW90b3JCa2QsXG4gICAgICAgICAgICBtb3RvclBvd2VyLFxuICAgICAgICAgICAgbW90b3JTdGF0dXNcblxuICAgICAgICB9XG5cbiAgICB9XG59KSJdfQ==
