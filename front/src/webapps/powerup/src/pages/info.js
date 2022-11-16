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




