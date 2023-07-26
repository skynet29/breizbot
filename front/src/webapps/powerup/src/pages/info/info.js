// @ts-check

$$.control.registerControl('info', {

	template: { gulp_inject: './info.html' },

	deps: ['breizbot.pager', 'hub'],

	props: {
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {HUB} hub
	 */
	init: function (elt, pager, hub) {

		const { portId } = this.props

		/**@type {HUB.HubDevice} */
		const hubDevice = this.props.hubDevice

		const ctrl = $$.viewController(elt, {
			data: {
				modes: [],
				capabilities: ''
			},
			events: {
				onBtnGet: async function(scope) {
					const mode = $(this).closest('tr').index()
					console.log('onBtnGet', mode)
					const device = hubDevice.getDevice(portId)
					const values = await device.getValue(mode)
					console.log('values', values)
					$(this).closest('td').find('span').text(JSON.stringify(values, null, 4))
					
				}
			}
		})

		async function init() {
			const portInfo = await hubDevice.getPortInformation(portId)
			console.log('portInfo', portInfo)	
			const { modes, capabilities } = portInfo
			ctrl.setData({ modes, capabilities })
		}

		init()
	}


});




