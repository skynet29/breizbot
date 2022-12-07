// @ts-check

$$.control.registerControl('configCtrl', {

	template: { gulp_inject: './configCtrl.html' },

	deps: ['breizbot.pager', 'breizbot.http'],

	props: {
		currentConfig: ''
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.Http.Interface} http
	 */
	init: function (elt, pager, http) {

		//console.log('props', this.props)

		const {currentConfig} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				configs: [],
				hasConfigs: function() {
					return this.configs.length > 0
				}
			},
			events: {
				onItemContextMenu: async function(ev, data) {
					const idx = $(this).closest('.item').index()
					//console.log('onItemContextMenu', idx, data)
					const config = ctrl.model.configs[idx]
					if (data.cmd == 'delete') {
						if (config.name == currentConfig) {
							$$.ui.showAlert({content: 'Cannot delete active config', title: 'Warning'})
						}
						else {
							await http.post('/delete', config)
							loadConfig()
						}

					}
				
				},
                onItemClick: function (ev) {
                    const idx = $(this).closest('.item').index()
					console.log('onItemClick', idx)
                    const config = ctrl.model.configs[idx]
					pager.popPage(config)


                }	
			}
		})

		async function loadConfig() {
			const configs = await http.get('/')
			console.log({configs})
			ctrl.setData({configs})
		}

		loadConfig()

	}


});




