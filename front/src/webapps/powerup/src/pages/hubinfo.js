// @ts-check

$$.control.registerControl('hubinfo', {

	template: { gulp_inject: './hubinfo.html' },

	deps: ['breizbot.pager', 'hub'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {HUB} hub
	 */
	init: function (elt, pager, hub) {

		const devices = hub.getHubDevices()
		console.log('devices', devices)

		const internalDevices = []
		const externalDevices = []

		for(const [key, deviceTypeName] of Object.entries(devices)) {
			const portId = parseInt(key)
			if (portId < 50) {
				externalDevices.push({
					portName: hub.PortMapNames[portId],
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
					portId
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

		hub.on('attach', (data) => {
			console.log('attach', data)
			const { portId, deviceTypeName } = data
			devices[portId] = deviceTypeName
		})

		hub.on('detach', (data) => {
			console.log('detach', data)

			delete devices[data.portId]
		})

		const ctrl = $$.viewController(elt, {			
			data: {
				internalDevices,
				externalDevices
		
			},
			events: {
				onMouseUp: function () {
					//console.log('onMouseUp')
					const action = $(this).data('action')
					const portId = getExternalPortId($(this))
					switch (action) {
						case 'forward':
							hub.Motor(portId).setPower(100)
							break
						case 'backward':
							hub.Motor(portId).setPower(-100)
							break
					}
				},
				onMouseDown: function () {
					//console.log('onMouseDown')
					const portId = getExternalPortId($(this))
					hub.Motor(portId).setPower(0)
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




