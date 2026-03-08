// @ts-check

/**
 * @typedef {Object} ActionInfo
 * @property {string} hubName
 * @property {number} portId
 * @property {string} name
 * @property {HUB.DeviceAction[]} devActions
 */


$$.control.registerControl('actions', {

	template: { gulp_inject: './actions.html' },

	deps: ['breizbot.pager', 'breizbot.files', 'brainjs.http'],

	props: {
		hubDevices: []
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.Files.Interface} fileSrv
	 * 
	 */
	init: function (elt, pager, fileSrv) {

		/**@type Array<HUB.HubDevice> */
		const hubDevices = this.props.hubDevices

		let eraseMode = false

		function getActions() {
			/**@type Array<ActionInfo> */
			const actions = []
			for (const hub of hubDevices) {
				const hubName = hub.name
				const devices = hub.getHubDevices()
				for (const device of devices) {
					const { portId, name, curAction, actions: devActions } = device
					for (const devAction of devActions) {
						devAction.isActionEnabled = device.isActionEnabled(devAction.action)
						devAction.color = (curAction == devAction.action) ? 'w3-green' : 'w3-blue'
					}

					if (devActions.length > 0)
						actions.push({ hubName, portId, name, devActions })
				}
			}
			console.log('actions', actions)
			return actions
		}

		function update() {
			ctrl.model.actions = getActions()
			ctrl.update()
		}

		const ctrl = $$.viewController(elt, {
			data: {
				actions: getActions(),
				getClass: function (scope) {
					return 'btnAction w3-btn ' + scope.devAction.color
				}
			},
			events: {
				onBtnAction: async function () {
					const cmd = $(this).data('cmd')
					const idx = $(this).closest('tr').index()

					/**@type ActionInfo */
					const info = ctrl.model.actions[idx]

					console.log('onBtnAction', cmd, info)
					const device = getDevice(info.hubName, info.portId)
					if (device) {
						if (eraseMode) {
							const actionIdx = device.actions.findIndex(a => a.action == cmd)
							if (actionIdx >= 0) {
								device.actions.splice(actionIdx, 1)
								update()
							}


						}
						else {
							if (cmd == 'CALIBRATE') {
								$(this).removeClass('w3-blue')
								$(this).addClass('w3-yellow')

								await device.execAction(cmd)
								$(this).removeClass('w3-yellow')
								$(this).addClass('w3-blue')
							}
							else {
								device.execAction(cmd)
								update()
							}
						}

					}

				}
			}
		})

		function getDevice(hubName, portId) {
			console.log('getDevice', { hubName, portId })
			const hub = hubDevices.find(h => h.name == hubName)
			if (hub == undefined) {
				throw new Error(`hub with name ${hubName} not found`)
				return
			}
			const device = hub.getDevice(portId)
			if (device == undefined) {
				throw new Error(`device with portId ${portId} from hub ${hubName} not found`)
				return
			}
			return device
		}

		async function save() {
			const data = []
			for (const hub of hubDevices) {
				const hubName = hub.name
				const devices = hub.getHubDevices()
				const hubInfo = { hubName, devices: [] }

				for (const device of devices) {
					const { portId, name, type, power, actions: devActions } = device

					if (devActions.length > 0)
						hubInfo.devices.push({ portId, name, type, power, devActions })
				}
				if (hubInfo.devices.length > 0) {
					data.push(hubInfo)
				}
			}
			console.log('data', data)
			if (data.length == 0) {
				$$.ui.showAlert({ content: 'Nothing to save, add action first !!' })
				return
			}
			const fileName = await $$.ui.showPrompt({ title: 'Save', label: 'FileName: ' })
			const blob = new Blob(
				[JSON.stringify(data)],
				{ type: "application/json" }
			);
			fileSrv.saveFile(blob, fileName + '.powerup')
		}

		function loadData(data) {
			try {
				for (const hubInfo of data) {
					for (const devInfo of hubInfo.devices) {
						const device = getDevice(hubInfo.hubName, devInfo.portId)
						if (device.type == devInfo.type) {
							device.power = devInfo.power
							device.name = devInfo.name
							device.actions = devInfo.devActions
						}

					}

				}
				update()
			}
			catch (e) {
				console.error(e.message)
				$$.ui.showAlert({ content: e.message })
			}



		}

		this.getButtons = function () {
			return {
				apply: {
					title: 'Add Action',
					icon: 'fas fa-plus',
					onClick: function () {
						console.log('addAction')
						pager.pushPage('addAction', {
							title: 'Add Action',
							props: {
								hubDevices
							},
							onReturn: function (data) {
								console.log('onReturn', data)
								const { hub, port, action, label } = data
								const device = getDevice(hub, port)
								device.actions.push({ action, label })
								update()
							}
						})
					}
				},
				save: {
					title: 'Save',
					icon: 'fa fa-save',
					onClick: function () {
						console.log('save')
						save()
					}
				},
				open: {
					title: 'Open...',
					icon: 'fa fa-folder-open',
					onClick: function () {
						console.log('open')
						fileSrv.openFile('Open file', 'powerup', async (data) => {
							const response = await fetch(data.url)
							const jsonData = await response.json()
							console.log('jsonData', jsonData)
							loadData(jsonData)
						})
					}
				},
				erase: {
					title: 'Erase',
					icon: 'fas fa-eraser',
					onClick: function (btn) {
						eraseMode = !eraseMode
						console.log({ eraseMode })

						btn.toggleClass('w3-text-red')
					}
				}
			}
		}

	}



});




