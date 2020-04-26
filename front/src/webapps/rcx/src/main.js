$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

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




