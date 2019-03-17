$$.control.registerControl('breizbot.main', {

	deps: ['breizbot.apps', 'breizbot.users'],

	template: "<div bn-control=\"breizbot.apps\" \n	bn-data=\"{apps}\" \n	bn-event=\"appclick: onAppClick\"\n	style=\"height: 100%\">\n		\n	</div>",

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





//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JyZWl6Ym90Lm1haW4nLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5hcHBzJywgJ2JyZWl6Ym90LnVzZXJzJ10sXG5cblx0dGVtcGxhdGU6IFwiPGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5hcHBzXFxcIiBcXG5cdGJuLWRhdGE9XFxcInthcHBzfVxcXCIgXFxuXHRibi1ldmVudD1cXFwiYXBwY2xpY2s6IG9uQXBwQ2xpY2tcXFwiXFxuXHRzdHlsZT1cXFwiaGVpZ2h0OiAxMDAlXFxcIj5cXG5cdFx0XFxuXHQ8L2Rpdj5cIixcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydkFwcHMsIHNydlVzZXJzKSB7XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGFwcHM6IFtdXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQXBwQ2xpY2s6IGZ1bmN0aW9uKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQXBwQ2xpY2snLCBkYXRhKVxuXHRcdFx0XHRcdCQkLnVpLnNob3dDb25maXJtKHtcblx0XHRcdFx0XHRcdHRpdGxlOiBkYXRhLnByb3BzLnRpdGxlLCBcblx0XHRcdFx0XHRcdGNvbnRlbnQ6ICdEZXNjcmlwdGlvbjonLFxuXHRcdFx0XHRcdFx0b2tUZXh0OiAoZGF0YS5hY3RpdmF0ZWQpID8gJ0Rlc2FjdGl2YXRlJyA6ICdBY3RpdmF0ZSdcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdHNydlVzZXJzLmFjdGl2YXRlQXBwKGRhdGEuYXBwTmFtZSwgIWRhdGEuYWN0aXZhdGVkKS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRkYXRhLmFjdGl2YXRlZCA9ICFkYXRhLmFjdGl2YXRlZFxuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRzcnZBcHBzLmxpc3RBbGwoKS50aGVuKChhcHBzKSA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZygnYXBwcycsIGFwcHMpXG5cdFx0XHRjdHJsLnNldERhdGEoe2FwcHN9KVxuXHRcdH0pXG5cdH1cbn0pO1xuXG5cblxuXG4iXX0=
