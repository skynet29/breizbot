// @ts-check

$$.control.registerControl('hubinfo', {

	template: { gulp_inject: './hubinfo.html' },

	deps: ['breizbot.pager', 'hub'],

	props: {
		hubDevice: null
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {HUB} hub
	 */
	init: function (elt, pager, hub) {

		/**@type {HUB.HubDevice} */
		const hubDevice = this.props.hubDevice


		async function initDevices() {
			const devices = hubDevice.getHubDevices()
			console.log('devices', devices)

			const internalDevices = []
			const externalDevices = []

			for (const device of devices) {
				//await device.readInfo()
				const { portId, type, name } = device
				if (portId < 50) {
					const info = { name, portId, type }
					externalDevices.push(info)
				}
				else {
					internalDevices.push({
						portId,
						type
					})

				}
			}

			ctrl.setData({ internalDevices, externalDevices })
		}


		/**
		 * 
		 * @param {number} portId 
		 * @param {string} deviceTypeName
		 */
		function openInfoPage(portId, deviceTypeName) {
			pager.pushPage('info', {
				title: deviceTypeName,
				props: {
					device: hubDevice.getDevice(portId)
				}
			})
		}

		/**
		 * 
		 * @param {JQuery<HTMLElement>} elt 
		 */
		function getExternalPortId(elt) {
			const idx = elt.closest('tr').index()
			return ctrl.model.externalDevices[idx].portId

		}

		async function attachCbk(data) {
			console.log('attach', data)
			const { portId, name, type } = data
			const info = { portId, name, type }
			ctrl.model.externalDevices.push(info)
			ctrl.update()

		}

		function detachCbk(data) {
			console.log('detach', data)
			const idx = ctrl.model.externalDevices.findIndex((dev) => dev.portId == data.portId)
			//console.log('idx', idx)
			ctrl.model.externalDevices.splice(idx, 1)
			ctrl.update()

		}

		hubDevice.on('attach', attachCbk)
		hubDevice.on('detach', detachCbk)

		this.dispose = async function () {
			console.log('hubInfo dispose')
			hubDevice.off('attach', attachCbk)
			hubDevice.off('detach', detachCbk)


		}


		const ctrl = $$.viewController(elt, {
			data: {
				internalDevices: [],
				externalDevices: [],
				isMotor: function (scope) {
					return hub.isMotor(hubDevice.getDevice(scope.$i.portId))
				},
				isLed: function (scope) {
					return hub.isLed(hubDevice.getDevice(scope.$i.portId))
				},
				isTachoMotor: function (scope) {
					return hub.isTachoMotor(hubDevice.getDevice(scope.$i.portId))
				}
			},
			events: {
				onMotorAction: async function () {
					const portId = getExternalPortId($(this))
					const action = $(this).data('action')
					console.log('onMotorAction', portId, action)
					/**@type {HUB.TachoMotor} */
					const motor = hubDevice.getDevice(portId)
					switch (action) {
						case 'reset':
							motor.resetZero()
							break
						case 'gozero':
							motor.gotoAngle(0, 50, false)

					}

				},
				onLedAction: async function () {
					const portId = getExternalPortId($(this))
					const action = $(this).data('action')
					console.log('onLedAction', portId, action)
					/**@type {HUB.Led} */
					const led = hubDevice.getDevice(portId)
					led.setBrightness((action == 'on' ? 100 : 0))
				},
				onCalibrate: async function () {
					const portId = getExternalPortId($(this))
					console.log('onCalibrate', portId)
					/**@type {HUB.TachoMotor} */
					const motor = hubDevice.getDevice(portId)
					await motor.calibrate()
				},
				onMouseUp: async function () {
					//console.log('onMouseUp')
					const action = $(this).data('action')
					const portId = getExternalPortId($(this))
					/**@type {HUB.TachoMotor} */
					const motor = hubDevice.getDevice(portId)
					switch (action) {
						case 'forward':
							motor.setPower(100)
							break
						case 'backward':
							motor.setPower(-100)
							break
					}
				},
				onMouseDown: async function () {
					//console.log('onMouseDown')
					const portId = getExternalPortId($(this))
					/**@type {HUB.TachoMotor} */
					const motor = hubDevice.getDevice(portId)
					motor.setPower(0)
				},
				onInfo: function () {
					const idx = $(this).closest('tr').index()
					const { portId, deviceTypeName } = ctrl.model.internalDevices[idx]
					openInfoPage(portId, deviceTypeName)

				},
				onInfo2: function () {
					const idx = $(this).closest('tr').index()
					const { portId, deviceTypeName } = ctrl.model.externalDevices[idx]
					openInfoPage(portId, deviceTypeName)
				}

			}
		})

		initDevices()

	}


});




