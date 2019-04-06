$$.control.registerControl('breizbot.home', {

	deps: ['breizbot.apps', 'breizbot.scheduler'],

	template: {gulp_inject: './home.html'},

	init: function(elt, srvApps, scheduler) {

		const ctrl = $$.viewController(elt, {
			data: {
				apps: []
			},
			events: {
				onAppClick: function(ev, data) {
					scheduler.openApp(data.appName)
				}
			}
		})

		srvApps.listMyApp().then((apps) => {
			console.log('apps', apps)
			ctrl.setData({apps})
		})
	}
});
