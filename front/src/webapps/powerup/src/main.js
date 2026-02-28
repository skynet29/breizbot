// @ts-check


$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'hub', 'breizbot.blocklyinterpretor'],


	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {HUB} hub
	 * @param {Breizbot.Services.BlocklyInterpretor.Interface} blocklyInterpretor
	 * 
	 */
	init: async function (elt, pager, hub, blocklyInterpretor) {

		//const config = {}

		elt.find('button').addClass('w3-btn w3-blue')

		/**@type {{[UUID: string]: HUB.HubDevice}} */
		const hubDevices = {}
		let UUID = 1

		let config = null


		const ctrl = $$.viewController(elt, {
			data: {
				currentConfig: '',
				gamepadConnected: false,
				hubDevices: []

			},
			events: {
				onActions: function() {
					pager.pushPage('actions', {
						title: 'Actions',
						props: {
							hubDevices: Object.values(hubDevices)
						}
					})
				},
				onSetName: async function(ev, newName) {
					console.log('onSetName', newName)
					const idx = $(this).closest('tr').index()
					const hubDesc = ctrl.model.hubDevices[idx]
					const hubDevice = hubDevices[hubDesc.UUID]
					await hubDevice.setName(newName)
					hubDesc.name = newName
					ctrl.update()

				},
				onCode: function () {
					//console.log('onCode')
					pager.pushPage('code', {
						title: 'Code',
						props: {
							hubDevices: Object.values(hubDevices),
							config,
						},
						onBack: function (value) {
							//console.log('onBack', value)
							config = value
						}
					})
				},


				onShutDown: function () {
					const idx = $(this).closest('tr').index()
					//console.log('onShutDown', idx)

					/**@type {ActionSrv.HubDesc} */
					const hubDesc = ctrl.model.hubDevices[idx]
					const hubDevice = hubDevices[hubDesc.UUID]
					hubDevice.shutdown()
				},
				onInfo: function () {
					const idx = $(this).closest('tr').index()
					//console.log('onInfo', idx)
					/**@type {ActionSrv.HubDesc} */
					const hubDesc = ctrl.model.hubDevices[idx]
					const hubDevice = hubDevices[hubDesc.UUID]
					console.log('hubDevice', hubDevice)

					pager.pushPage('hubinfo', {
						title: hubDevice.name,
						props: {
							hubDevice
						}
					})
				},



				onConnect: async function () {
					const hubDevice = await hub.connect()
					const id = UUID++
					const name = await hubDevice.getName()
					const address = await hubDevice.getPrimaryMACAddress()
					console.log('onConnect', {name, address})

					hubDevices[id] = hubDevice

					hubDevice.on('error', (data) => {
						console.log(data)
					})


					ctrl.model.hubDevices.push({ UUID: id, batteryLevel: 0, address, name })
					ctrl.update()

					hubDevice.on('batteryLevel', (data) => {
						//console.log('batteryLevel', data)
						const hubDesc = ctrl.model.hubDevices.find((e) => e.UUID == id)
						hubDesc.batteryLevel = data.batteryLevel
						ctrl.update()
					})


					await hubDevice.startNotification()

					hubDevice.on('disconnected', () => {
						console.log('disconnected')
						const idx = ctrl.model.hubDevices.findIndex((e) => e.UUID == id)
						ctrl.model.hubDevices.splice(idx, 1)
						ctrl.update()
						delete hubDevices[id]
					})

				}


			}
		})

	}


});




