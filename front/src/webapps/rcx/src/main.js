$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['app.rcx', 'breizbot.pager', 'breizbot.files'],

	init: function(elt, rcx, pager, files) {


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
				onDownloadFirmware: function() {
					//console.log('onDownloadFirmware')
					pager.pushPage('breizbot.files', {
						title: 'Open File',
						props: {
							filterExtension: 'lgo'
						},
						events: {
							fileclick: function (ev, data) {
								pager.popPage(data)
							}
						},
						onReturn: async function (info) {
							//console.log('onReturn', info)
							const { fileName, rootDir } = info
							const url = files.fileUrl(rootDir + fileName)
							const resp = await fetch(url)
							const srec = await resp.text()
							//console.log('srec', srec)
							await rcx.downloadFirmware(srec, 200)

						}
					})

				},
				onConnect: async function() {
					await rcx.connect()
					ctrl.setData({connected: true})
				},
				onBeep: async function() {
					const beepType = parseInt(ctrl.scope.beepType.getValue())
					console.log('beepType', beepType)
					await rcx.beep(beepType)
				},
				onPing: async function() {
					await rcx.isAlive()
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




