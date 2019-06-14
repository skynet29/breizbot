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
						content: 'Description:',
						okText: (data.activated) ? 'Desactivate' : 'Activate'
					},
						function() {
							srvUsers.activateApp(data.appName, !data.activated).then(() => {
								data.activated = !data.activated
								const info = ctrl.model.apps.find((a) => a.appName == data.appName)	
								info.activated = data.activated
								ctrl.update()
							})
						})
				}
			}
		})

		srvApps.listAll().then((apps) => {
			console.log('apps', apps)
			ctrl.setData({apps})
		})
	}
});




