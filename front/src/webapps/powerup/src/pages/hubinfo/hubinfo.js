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
		const devices = hubDevice.getHubDevices()
		console.log('devices', devices)

		const internalDevices = []
		const externalDevices = []

		for (const device of devices) {
			const {portId, deviceTypeName, portName} = device
			if (portId < 50) {
				externalDevices.push({
					portName,
					portId,
					deviceTypeName
				})
			}
			else {
				internalDevices.push({
					portId,
					deviceTypeName
				})

			}
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
					portId,
					hubDevice
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

		function attachCbk(data) {
			console.log('attach', data)
			const { portId, deviceTypeName } = data
			devices[portId] = deviceTypeName
		}

		function detachCbk(data) {
			console.log('detach', data)
			delete devices[data.portId]
		}

		hubDevice.on('attach', attachCbk)
		hubDevice.on('detach', detachCbk)

		this.dispose = function () {
			console.log('hubInfo dispose')
			hubDevice.off('attach', attachCbk)
			hubDevice.off('detach', detachCbk)
		}


		const ctrl = $$.viewController(elt, {
			data: {
				internalDevices,
				externalDevices

			},
			events: {
				onCalibrate: async function() {
					const portId = getExternalPortId($(this))
					console.log('onCalibrate', portId)
					await hubDevice.getMotor(portId).calibrate()
				},
				onMouseUp: function () {
					//console.log('onMouseUp')
					const action = $(this).data('action')
					const portId = getExternalPortId($(this))
					switch (action) {
						case 'forward':
							hubDevice.getMotor(portId).setPower(100)
							break
						case 'backward':
							hubDevice.getMotor(portId).setPower(-100)
							break
					}
				},
				onMouseDown: function () {
					//console.log('onMouseDown')
					const portId = getExternalPortId($(this))
					hubDevice.getMotor(portId).setPower(0)
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

	}


});




