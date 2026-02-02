// @ts-check
$$.control.registerControl('input-label', {
	props: {
		val: 10
	},
	init: function (elt) {
		console.log('props', this.props)
		const { val } = this.props
		const span = $('<span>').appendTo(elt)
			.text(val)
			.click(function () {
				const label = this
				console.log('onClick', this.textContent)

				const originalValue = $(this).text();
				let validated = false;

				const input = document.createElement("input");
				input.type = "text";
				input.value = originalValue;
				input.className = "input-edit";

				label.replaceWith(input);
				input.focus();

				// Validation uniquement avec Enter
				input.addEventListener("keydown", (e) => {
					if (e.key === "Enter") {
						label.textContent = input.value;
						elt.trigger('input-label-change', input.value)
						validated = true;
						input.replaceWith(label);

					}

					// Optionnel : Escape pour annuler
					if (e.key === "Escape") {
						validated = true;
						input.replaceWith(label);
					}
				});

				// Perte de focus = annulation
				input.addEventListener("blur", () => {
					if (validated) return
					input.replaceWith(label);
				});
			})

		this.getValue = function() {
			return span.text()
		}
	}
})

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
				let { portId, type, name, calibrated } = device
				if (calibrated == undefined) calibrated = false
				if (portId < 50) {
					const info = { name, portId, type, calibrated }
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
				onPowerChange: function(ev, data) {
					console.log('onPowerChange', data)
				},
				onNameChange: function (ev, newName) {
					console.log('onNameChange', newName)
					const portId = getExternalPortId($(this))
					const device = hubDevice.getDevice(portId)
					device.name = newName
				},
				onMotorAction: async function (ev) {
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
							break
						case 'calibrate':
							$(this).removeClass('w3-grey')
							$(this).addClass('w3-yellow')

							await motor.calibrate()
							$(this).removeClass('w3-yellow')
							$(this).addClass('w3-green')

							$(this).closest('tr').find('button.goto').prop('disabled', false)
							break
						case 'gotoLeft':
							motor.gotoLeft()
							break
						case 'gotoRight':
							motor.gotoRight()
							break
						case 'gotoCenter':
							motor.gotoCenter()
							break
						case 'gotoAngle':
							{
								const angle = parseInt($(this).closest('tr').find('input.angle').val())
								console.log({ angle })
								await motor.gotoAngle(angle, 100, true)
							}

							break

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
				onMouseUp: async function () {
					//console.log('onMouseUp')
					const action = $(this).data('action')
					const portId = getExternalPortId($(this))
					/**@type {HUB.TachoMotor} */
					const motor = hubDevice.getDevice(portId)
					const power = parseInt($(this).closest('tr').find('.power').getValue())
					console.log({ power })
					switch (action) {
						case 'forward':
							motor.setPower(power)
							break
						case 'backward':
							motor.setPower(-power)
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




