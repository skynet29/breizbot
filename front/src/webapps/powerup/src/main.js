// @ts-check


$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'hub'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {HUB} hub
	 */
	init: function (elt, pager, hub) {


		hub.on('disconnected', () => {
			ctrl.setData({ connected: false })
		})

		hub.on('attach', (data) => {
			//console.log('attach', data)
			const { portId, deviceTypeName } = data
			if (portId < 50) {
				ctrl.model.externalDevices.push({
					portId,
					portName: hub.PortMapNames[data.portId],
					deviceTypeName
				})
				ctrl.model.externalDevices.sort((a, b) => a.portId - b.portId)
			}
			else {
				ctrl.model.internalDevices.push({deviceTypeName, portId})
			}
			ctrl.update()
		})

		hub.on('detach', (data) => {
			//console.log('detach', data)

			const idx = ctrl.model.externalDevices.findIndex((e) => e.portId == data.portId)
			console.log('idx', idx)
			ctrl.model.externalDevices.splice(idx, 1)
			ctrl.update()
		})

		hub.on('rotate', (data) => {
			console.log('rotate', data)
		})

		hub.on('error', (data) => {
			console.log(data)
		})


		/**
		 * 
		 * @param {JQuery<HTMLElement>} elt 
		 */
		function getExternalPortId(elt) {
			const idx = elt.closest('tr').index()
			return ctrl.model.externalDevices[idx].portId

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
					portId
				}
			})
		}

		const ctrl = $$.viewController(elt, {
			data: {
				connected: false,
				internalDevices: [],
				externalDevices: []
			},
			events: {
				onMouseUp: function() {
					//console.log('onMouseUp')
					const action = $(this).data('action')
					const portId = getExternalPortId($(this))
					switch (action) {
						case 'off':
							hub.motor.setPower(portId, 0)
							break
						case 'forward':
							hub.motor.setPower(portId, 100)
							break
						case 'backward':
							hub.motor.setPower(portId, -100)
							break
					}					
				},
				onMouseDown: function() {
					//console.log('onMouseDown')
					const portId = getExternalPortId($(this))
					hub.motor.setPower(portId, 0)
				},
				onConnect: async function () {
					await hub.connect()
					ctrl.setData({ connected: true })
					await hub.subscribe(hub.PortMap.B, hub.DeviceMode.ROTATION)
				},
				onSendMsg: async function () {
					console.log('onSendMsg')
					//await hub.led.setColor(hub.Color.RED)
					await hub.led.setRGBColor(0, 0, 255)
					//await hub.motor.resetZero(hub.PortMap.B)
				},
				onShutdown: async function () {
					await hub.shutdown()
				},
				onInfo: function() {
					const idx = $(this).closest('tr').index()
					const {portId, deviceTypeName} = ctrl.model.internalDevices[idx]
					openInfoPage(portId, deviceTypeName)

				},
				onInfo2: function() {
					const idx = $(this).closest('tr').index()
					const {portId, deviceTypeName} = ctrl.model.externalDevices[idx]
					openInfoPage(portId, deviceTypeName)
				}
			}
		})

	}


});




