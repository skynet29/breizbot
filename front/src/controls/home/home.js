$$.control.registerControl('breizbot.home', {

	deps: ['breizbot.apps'],

	template: {gulp_inject: './home.html'},

	init: function(elt, srvApps) {

		const ctrl = $$.viewController(elt, {
			data: {
				apps: []
			},
			events: {
				onAppClick: function(ev, data) {
					location.href = '/apps/' + data.appName
				}
			}
		})

		srvApps.listMyApp().then((apps) => {
			console.log('apps', apps)
			ctrl.setData({apps})
		})
	}
});
