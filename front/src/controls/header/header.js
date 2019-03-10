$$.control.registerControl('breizbot.header', {

	deps: ['breizbot.broker', 'breizbot.users'],

	props: {
		userName: 'Unknown',
		showHome: true,
		title: ''
	},

	template: {gulp_inject: './header.html'},

	init: function(elt, broker, users) {

		const dlgCtrl = $$.dialogController({
			title: 'Notifications',
			template: {gulp_inject: './notifs.html'},
			data: {notifs: []},
			options: {
				width: 'auto'
			},
			events: {
				onDelete: function() {
					var notif = $(this).closest('li').data('notif')
					console.log('onDelete', notif)
					users.removeNotif(notif)
				}
			}
		})		

		const ctrl = $$.viewController(elt, {
			data: {
				items: {
					pwd: {name: 'Change password', icon: 'fa-lock'},
					apps: {name: 'Applications', icon: 'fa-th'},
					sep: '------',
					logout: {name: 'Logout', icon: 'fa-power-off'}
				},
				userName: this.props.userName,
				showHome: this.props.showHome,
				title: this.props.title,
				nbNotif: 0
			},
			events: {
				onContextMenu: function(ev, data) {
					console.log('onContextMenu', data)
					if (data.cmd == 'logout') {
						location.href = '/logout'
					}
					if (data.cmd == 'apps') {
						location.href = '/apps/store'
					}
				},
				onNotification: function(ev) {
					console.log('onNotification')
					if (ctrl.model.nbNotif == 0) {
						$$.ui.showAlert({content: 'no notifications', title: 'Notifications'})
					}
					else {
						dlgCtrl.show()
					}					
				}
			}
		})

		function updateNotifs(notifs) {
			ctrl.setData({nbNotif: notifs.length})
			dlgCtrl.setData({notifs})
			if (notifs.length == 0) {
				dlgCtrl.hide()
			}			
		}

		broker.register('breizbot.notif', function(msg) {
			//console.log('msg', msg)
			updateNotifs(msg.data)
		})

		users.getNotifs().then(updateNotifs)
	}
});
