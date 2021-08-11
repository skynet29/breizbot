//@ts-check
$$.control.registerControl('rootPage', {

	deps: [
		'breizbot.apps',
		'breizbot.pager', 
		'breizbot.users',
		'breizbot.scheduler'
	],

	template: {gulp_inject: './main.html'},

	/**
	 * 
	 * @param {Breizbot.Services.Apps.Interface} srvApps 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {Breizbot.Services.User.Interface} users 
	 * @param {Breizbot.Services.Scheduler.Interface} scheduler 
	 */
	init: function(elt, srvApps, pager, users, scheduler) {

		const ctrl = $$.viewController(elt, {
			data: {
				apps: [],
				getItems: function() {
					return function(data) {
						const ret = {
							info: {name: 'Information', icon: 'fas fa-info-circle'}
						}
						if (!data.activated) {
							ret.add = {name: 'Add to Home page', icon: 'fas fa-plus'}
						}
						return ret
					}
				}
			},
			events: {
				onAppClick: function(ev, data) {
					//console.log('onAppClick', data)
					scheduler.openApp(data.appName)
				},
				onTileContextMenu: async function(ev, data) {
					//console.log('onTileContextMenu', data)
					if (data.cmd == 'info') {
						pager.pushPage('infoPage', {
							title: 'App Information',
							props: {
								info: data
							}
						})
	
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




