$$.control.registerControl('breizbot.main', {

	deps: ['breizbot.apps', 'breizbot.users'],

	template: "<div bn-control=\"breizbot.apps\" \n	bn-data=\"apps: apps\" \n	bn-event=\"appclick: onAppClick\"\n	style=\"height: 100%\">\n		\n	</div>",

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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90Lm1haW4nLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5hcHBzJywgJ2JyZWl6Ym90LnVzZXJzJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5hcHBzXFxcIiBcXG5cdGJuLWRhdGE9XFxcImFwcHM6IGFwcHNcXFwiIFxcblx0Ym4tZXZlbnQ9XFxcImFwcGNsaWNrOiBvbkFwcENsaWNrXFxcIlxcblx0c3R5bGU9XFxcImhlaWdodDogMTAwJVxcXCI+XFxuXHRcdFxcblx0PC9kaXY+XCIsXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBzcnZBcHBzLCBzcnZVc2Vycykge1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRhcHBzOiBbXVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkFwcENsaWNrOiBmdW5jdGlvbihldiwgZGF0YSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkFwcENsaWNrJywgZGF0YSlcblx0XHRcdFx0XHQkJC51aS5zaG93Q29uZmlybSh7XG5cdFx0XHRcdFx0XHR0aXRsZTogZGF0YS5wcm9wcy50aXRsZSwgXG5cdFx0XHRcdFx0XHRjb250ZW50OiAnRGVzY3JpcHRpb246Jyxcblx0XHRcdFx0XHRcdG9rVGV4dDogKGRhdGEuYWN0aXZhdGVkKSA/ICdEZXNhY3RpdmF0ZScgOiAnQWN0aXZhdGUnXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRzcnZVc2Vycy5hY3RpdmF0ZUFwcChkYXRhLmFwcE5hbWUsICFkYXRhLmFjdGl2YXRlZCkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0ZGF0YS5hY3RpdmF0ZWQgPSAhZGF0YS5hY3RpdmF0ZWRcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0c3J2QXBwcy5saXN0QWxsKCkudGhlbigoYXBwcykgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ2FwcHMnLCBhcHBzKVxuXHRcdFx0Y3RybC5zZXREYXRhKHthcHBzfSlcblx0XHR9KVxuXHR9XG59KTtcblxuXG5cblxuIl19
