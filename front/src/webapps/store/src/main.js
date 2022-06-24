//@ts-check
$$.control.registerControl('rootPage', {

	deps: [
		'breizbot.apps',
		'breizbot.pager'
	],

	template: {gulp_inject: './main.html'},

	/**
	 * 
	 * @param {Breizbot.Services.Apps.Interface} srvApps 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function(elt, srvApps, pager, users, scheduler) {

		const ctrl = $$.viewController(elt, {
			data: {
				apps: []
			},
			events: {
				onAppClick: function(ev, data) {
					//console.log('onAppClick', data)
					pager.pushPage('infoPage', {
						title: 'App Information',
						props: {
							info: data
						}
					})
				// scheduler.openApp(data.appName)
				},
				onTileContextMenu: async function(ev, data) {
					//console.log('onTileContextMenu', data)
					if (data.cmd == 'info') {
	
					}
					if (data.cmd == 'add') {
						await users.activateApp(data.appName, true)
						listAll()

					}
				}

			}
		})

		async function listAll() {
			const apps = await srvApps.listAll()
			//console.log('apps', apps)
			ctrl.setData({apps})
		}

		listAll()

		this.onAppResume = function() {
			listAll()
		}
	}
});




