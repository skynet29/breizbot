// @ts-check

$$.control.registerControl('info', {

	template: { gulp_inject: './info.html' },

	deps: ['breizbot.pager', 'hub'],

	props: {
		device: null
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {HUB} hub
	 */
	init: function (elt, pager, hub) {

		/**@type {HUB.Device} */
		const device = this.props.device


		const ctrl = $$.viewController(elt, {
			data: {
				modes: [],
				capabilities: '',
				isInput: function(scope) {
					return (scope.$i.mode & 0x1) != 0
				},
				getCapabilites: function(scope) {
					if (scope.$i.mode == 2) {
						return 'OUT'
					}
					else if (scope.$i.mode == 1) {
						return 'IN'
					}
					else if (scope.$i.mode == 3) {
						return 'IN/OUT'
					}				
				}
			},
			events: {
				onBtnGet: async function(scope) {
					const mode = $(this).closest('tr').index()
					console.log('onBtnGet', mode)
					const values = await device.getValue(mode)
					console.log('values', values)
					$(this).closest('td').find('span').text(JSON.stringify(values, null, 4))
					
				}
			}
		})

		async function init() {
			const { modes, capabilities } = await device.readInfo()
			ctrl.setData({ modes, capabilities })
		}

		init()
	}


});




