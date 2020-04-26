$$.control.registerControl('rootPage', {

	deps: ['breizbot.apps', 'breizbot.pager'],

	template: {gulp_inject: './main.html'},

	init: function(elt, srvApps, pager) {

		const ctrl = $$.viewController(elt, {
			data: {
				apps: []
			},
			events: {
				onAppClick: function(ev, data) {
					console.log('onAppClick', data)

					pager.pushPage('infoPage', {
						title: 'App Information',
						props: {
							info: data
						},
						onBack: listAll
					})
				}

			}
		})

		async function listAll() {
			const apps = await srvApps.listAll()
			console.log('apps', apps)
			ctrl.setData({apps})
		}

		listAll()
	}
});




