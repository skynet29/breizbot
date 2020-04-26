$$.control.registerControl('rootPage', {

	deps: ['breizbot.apps', 'breizbot.users'],

	template: {gulp_inject: './main.html'},

	init: function(elt, srvApps, srvUsers) {

		const ctrl = $$.viewController(elt, {
			data: {
				apps: []
			},
			events: {
				onAppClick: function(ev, data) {
					console.log('onAppClick', data)
					$$.ui.showConfirm({
						title: data.props.title, 
						content: `<h3>Description</h3><p>${data.props.description || ""}</p>`,
						width: 'auto',
						okText: (data.activated) ? 'Remove from Home page' : 'Add to Home page'
					},
						async function() {
							await srvUsers.activateApp(data.appName, !data.activated)
							data.activated = !data.activated
							const info = ctrl.model.apps.find((a) => a.appName == data.appName)	
							info.activated = data.activated
							ctrl.update()
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




