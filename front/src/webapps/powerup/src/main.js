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
				ctrl.model.internalDevices.push(deviceTypeName)
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

		/**
		 * 
		 * @param {JQuery<HTMLElement>} elt 
		 */
		function getPortId(elt) {
			const idx = elt.closest('tr').index()
			return ctrl.model.externalDevices[idx].portId

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
					const portId = getPortId($(this))
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
					const portId = getPortId($(this))
					hub.motor.setPower(portId, 0)
				},
				onConnect: async function () {
					await hub.connect()
					ctrl.setData({ connected: true })
				},
				onSendMsg: async function () {
					await hub.led.setColor(hub.Color.PURPLE)
				},
				onShutdown: async function () {
					await hub.shutdown()
				}
			}
		})

	}


});




