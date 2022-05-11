// @ts-check

$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, pager) {

		let device = null
		let server = null
		let service = null
		let charac = null
		let devices = {}

		function getEnumName(enumVal) {
			const ret = {}
			Object.entries(enumVal).forEach(([key, val]) => { ret[val] = key })
			return ret
		}

		const Event = {
			DETACHED_IO: 0x00,
			ATTACHED_IO: 0x01,
			ATTACHED_VIRTUAL_IO: 0x02,
		}
		const EventNames = getEnumName(Event)


		const MessageType = {
			HUB_PROPERTIES: 0x01,
			HUB_ACTIONS: 0x02,
			HUB_ALERTS: 0x03,
			HUB_ATTACHED_IO: 0x04,
			GENERIC_ERROR_MESSAGES: 0x05,
			HW_NETWORK_COMMANDS: 0x08,
			FW_UPDATE_GO_INTO_BOOT_MODE: 0x10,
			FW_UPDATE_LOCK_MEMORY: 0x11,
			FW_UPDATE_LOCK_STATUS_REQUEST: 0x12,
			FW_LOCK_STATUS: 0x13,
			PORT_INFORMATION_REQUEST: 0x21,
			PORT_MODE_INFORMATION_REQUEST: 0x22,
			PORT_INPUT_FORMAT_SETUP_SINGLE: 0x41,
			PORT_INPUT_FORMAT_SETUP_COMBINEDMODE: 0x42,
			PORT_INFORMATION: 0x43,
			PORT_MODE_INFORMATION: 0x44,
			PORT_VALUE_SINGLE: 0x45,
			PORT_VALUE_COMBINEDMODE: 0x46,
			PORT_INPUT_FORMAT_SINGLE: 0x47,
			PORT_INPUT_FORMAT_COMBINEDMODE: 0x48,
			VIRTUAL_PORT_SETUP: 0x61,
			PORT_OUTPUT_COMMAND: 0x81,
			PORT_OUTPUT_COMMAND_FEEDBACK: 0x82,
		}



		const MessageTypeNames = getEnumName(MessageType)

		const DeviceType = {
			UNKNOWN: 0,
			SIMPLE_MEDIUM_LINEAR_MOTOR: 1,
			TRAIN_MOTOR: 2,
			LIGHT: 8,
			VOLTAGE_SENSOR: 20,
			CURRENT_SENSOR: 21,
			PIEZO_BUZZER: 22,
			HUB_LED: 23,
			TILT_SENSOR: 34,
			MOTION_SENSOR: 35,
			COLOR_DISTANCE_SENSOR: 37,
			MEDIUM_LINEAR_MOTOR: 38,
			MOVE_HUB_MEDIUM_LINEAR_MOTOR: 39,
			MOVE_HUB_TILT_SENSOR: 40,
			DUPLO_TRAIN_BASE_MOTOR: 41,
			DUPLO_TRAIN_BASE_SPEAKER: 42,
			DUPLO_TRAIN_BASE_COLOR_SENSOR: 43,
			DUPLO_TRAIN_BASE_SPEEDOMETER: 44,
			TECHNIC_LARGE_LINEAR_MOTOR: 46, // Technic Control+
			TECHNIC_XLARGE_LINEAR_MOTOR: 47, // Technic Control+
			TECHNIC_MEDIUM_ANGULAR_MOTOR: 48, // Spike Prime
			TECHNIC_LARGE_ANGULAR_MOTOR: 49, // Spike Prime
			TECHNIC_MEDIUM_HUB_GEST_SENSOR: 54,
			REMOTE_CONTROL_BUTTON: 55,
			REMOTE_CONTROL_RSSI: 56,
			TECHNIC_MEDIUM_HUB_ACCELEROMETER: 57,
			TECHNIC_MEDIUM_HUB_GYRO_SENSOR: 58,
			TECHNIC_MEDIUM_HUB_TILT_SENSOR: 59,
			TECHNIC_MEDIUM_HUB_TEMPERATURE_SENSOR: 60,
			TECHNIC_COLOR_SENSOR: 61, // Spike Prime
			TECHNIC_DISTANCE_SENSOR: 62, // Spike Prime
			TECHNIC_FORCE_SENSOR: 63, // Spike Prime
			TECHNIC_3X3_COLOR_LIGHT_MATRIX: 64, // Spike Essential
			TECHNIC_SMALL_ANGULAR_MOTOR: 65, // Spike Essential
			MARIO_ACCELEROMETER: 71,
			MARIO_BARCODE_SENSOR: 73,
			MARIO_PANTS_SENSOR: 74,
			TECHNIC_MEDIUM_ANGULAR_MOTOR_GREY: 75, // Mindstorms
			TECHNIC_LARGE_ANGULAR_MOTOR_GREY: 76, // Technic Control+
		}

		const DeviceTypeNames = getEnumName(DeviceType)

		const ErrorCode = {
			ACK: 0x01,
			MACK: 0x02,
			BUFFER_OVERFLOW: 0x03,
			TIMEOUT: 0x04,
			COMMAND_NOT_RECOGNIZED: 0x05,
			INVALID_USE: 0x06,
			OVERCURRENT: 0x07,
			INTERNAL_ERROR: 0x08,
		}

		const HubPropertyPayload = {
			ADVERTISING_NAME: 0x01,
			BUTTON_STATE: 0x02,
			FW_VERSION: 0x03,
			HW_VERSION: 0x04,
			RSSI: 0x05,
			BATTERY_VOLTAGE: 0x06,
			BATTERY_TYPE: 0x07,
			MANUFACTURER_NAME: 0x08,
			RADIO_FIRMWARE_VERSION: 0x09,
			LWP_PROTOCOL_VERSION: 0x0A,
			SYSTEM_TYPE_ID: 0x0B,
			HW_NETWORK_ID: 0x0C,
			PRIMARY_MAC_ADDRESS: 0x0D,
			SECONDARY_MAC_ADDRESS: 0x0E,
			HW_NETWORK_FAMILY: 0x0F
		}

		const HubPropertyPayloadNames = getEnumName(HubPropertyPayload)

		const ErrorCodeNames = getEnumName(ErrorCode)

		const Color = {
			BLACK: 0,
			PINK: 1,
			PURPLE: 2,
			BLUE: 3,
			LIGHT_BLUE: 4,
			CYAN: 5,
			GREEN: 6,
			YELLOW: 7,
			ORANGE: 8,
			RED: 9,
			WHITE: 10,
			NONE: 255
		}


		const mapFcn = {}
		mapFcn[MessageType.HUB_ATTACHED_IO] = handlePortMsg
		mapFcn[MessageType.GENERIC_ERROR_MESSAGES] = handleGenericErrorMsg
		mapFcn[MessageType.HUB_PROPERTIES] = handleHubPropertyResponse
		mapFcn[MessageType.PORT_OUTPUT_COMMAND_FEEDBACK] = handlePortCommandFeedback

		/**
		 * 
		 * @param {DataView} msg 
		 * @returns 
		 */
		function handleHubPropertyResponse(msg) {
			const property = msg.getUint8(3)
			console.log({ property: HubPropertyPayloadNames[property] })
			if (property == HubPropertyPayload.BATTERY_VOLTAGE) {
				const batteryLevel = msg.getUint8(5)
				console.log({ batteryLevel })
			}
		}
		/**
		 * 
		 * @param {DataView} msg 
		 */
		function handleGenericErrorMsg(msg) {
			const cmdType = msg.getUint8(3)
			const errorCode = msg.getUint8(4)
			console.log({ cmdType, errorCode: ErrorCodeNames[errorCode] })
		}

		/**
		 * 
		 * @param {DataView} msg 
		 */
		function handlePortCommandFeedback(msg) {
			for (let offset = 3; offset < msg.byteLength; offset += 2) {
				const portId = msg.getUint8(offset)
				const feedback = msg.getUint8(offset + 1)
				console.log({ portId, feedback })
			}
		}
		/**
		 * 
		 * @param {DataView} msg 
		 */
		function handlePortMsg(msg) {

			const portId = msg.getUint8(3)
			const event = msg.getUint8(4)
			const deviceType = event ? msg.getUint16(5, true) : 0
			const deviceTypeName = DeviceTypeNames[deviceType] || "Unknown"
			const eventName = EventNames[event]

			console.log('handlePortMsg', { portId, eventName, deviceTypeName })
			if (event == Event.ATTACHED_IO) {
				attachDevice(portId, deviceType)
			}
			else if (event == Event.DETACHED_IO) {
				detachDevice(portId)
			}
			else if (event == Event.ATTACHED_VIRTUAL_IO) {
				const portIdA = msg.getUint8(7)
				const portIdB = msg.getUint8(8)
				console.log({ portIdA, portIdB })
			}

		}

		function getPortIdFromDeviceType(deviceType) {
			return devices[deviceType]
		}

		function getDeviceTypeFromPortId(portId) {
			for (const [deviceType, port] of Object.entries(devices)) {
				if (port == portId) {
					return deviceType
				}
			}
		}

		/**
		 * 
		 * @param {DataView} msg 
		 */
		function decodeMsg(msg) {
			const bufferLen = msg.byteLength
			const msgLen = msg.getUint8(0)
			const msgType = msg.getUint8(2)
			console.log('decodeMsg', { msgLen, bufferLen, msgType: MessageTypeNames[msgType] })
			const fcn = mapFcn[msgType]
			if (typeof fcn == 'function') {
				fcn(msg)
			}

		}

		/**
		 * 
		 * @param {number} type 
		 * @param  {...any} data 
		 */
		async function sendMsg(type, ...data) {
			console.log('sendMsg', { type, data })
			const msgLen = data.length + 3
			const buffer = new ArrayBuffer(msgLen)
			const uint8Buffer = new Uint8Array(buffer)
			uint8Buffer[0] = msgLen
			uint8Buffer[1] = 0
			uint8Buffer[2] = type
			uint8Buffer.set(data, 3)
			console.log(uint8Buffer)

			await charac.writeValueWithoutResponse(buffer)
		}

		function subscribe(portId, mode) {
			return sendMsg(MessageType.PORT_INPUT_FORMAT_SETUP_SINGLE,
				portId, mode, 0x01, 0x00, 0x00, 0x00, 0x01)
		}

		/**
		 * 
		 * @param {number} portId 
		 * @param {number} mode 
		 * @param  {...any} data 
		 * @returns 
		 */
		function writeDirect(portId, mode, ...data) {
			return sendMsg(MessageType.PORT_OUTPUT_COMMAND, portId, 0x11, 0x51, mode, data)
		}

		function setPower(portId, power) {
			return writeDirect(portId, 0x00, power)
		}

		function onCharacteristicValueChanged(event) {
			//console.log('onCharacteristicvaluechanged', event.target.value)
			decodeMsg(event.target.value)

		}

		function onGattServerDisconnected() {
			console.log('onGattServerDisconnected')
			ctrl.setData({ connected: false })
		}

		async function onConnect() {
			console.log('onConnect')
			devices = {}
			device = await navigator.bluetooth.requestDevice({
				acceptAllDevices: true,
				optionalServices: ['00001623-1212-efde-1623-785feabcd123']
			})
			device.addEventListener('gattserverdisconnected', onGattServerDisconnected)
			server = await device.gatt.connect()
			console.log('Connected')
			ctrl.setData({ connected: true })
			service = await server.getPrimaryService('00001623-1212-efde-1623-785feabcd123')
			charac = await service.getCharacteristic('00001624-1212-efde-1623-785feabcd123')
			charac.addEventListener('characteristicvaluechanged', onCharacteristicValueChanged)
			charac.startNotifications()

			//await sendMsg(MessageType.HUB_PROPERTIES, HubPropertyPayload.BATTERY_VOLTAGE, 0x02)
		}

		/**
		 * 
		 * @param {number} portId 
		 * @param {number} deviceType 
		 */
		function attachDevice(portId, deviceType) {
			console.log('attachDevice', { portId, deviceType })
			devices[deviceType] = portId
			if (portId >= 50) {
				ctrl.model.internalDevices.push(DeviceTypeNames[deviceType])
			}
			else {
				const portName = String.fromCharCode(portId + 65)
				const entry = ctrl.model.externalDevices.find(e => e.port == portName)
				console.log('entry', entry)
				entry.device = DeviceTypeNames[deviceType]
			}
			ctrl.update()
		}

		function detachDevice(portId) {
			const deviceType = getDeviceTypeFromPortId(portId)
			delete devices[deviceType]
			const portName = String.fromCharCode(portId + 65)
			const entry = ctrl.model.externalDevices.find(e => e.port == portName)
			entry.device = 'None'
			ctrl.update()
		}


		async function onSendMsg() {
			//await subscribe(DeviceType.HUB_LED, 0x00)
			await writeDirect(getPortIdFromDeviceType(DeviceType.HUB_LED), 0x00, Color.GREEN)
		}

		async function onShutdown() {
			await sendMsg(MessageType.HUB_ACTIONS, 0x01)
		}

		const externalDevices = []
		for (let i = 0; i < 4; i++) {
			externalDevices.push({
				port: String.fromCharCode(i + 65),
				device: 'None'
			})
		}

		function onAction(ev) {
			const idx = $(this).closest('tr').index()
			const action = $(this).data('action')
			console.log('onAction', { idx, action })
			switch (action) {
				case 'off':
					setPower(idx, 0)
					break
				case 'forward':
					setPower(idx, 100)
					break
				case 'backward':
					setPower(idx, -100)
					break
			}

		}

		const ctrl = $$.viewController(elt, {
			data: {
				connected: false,
				internalDevices: [],
				externalDevices
			},
			events: {
				onConnect,
				onSendMsg,
				onShutdown,
				onAction
			}
		})

	}


});




