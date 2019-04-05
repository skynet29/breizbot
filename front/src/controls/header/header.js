$$.control.registerControl('breizbot.header', {

	deps: ['breizbot.broker', 'breizbot.users', 'breizbot.rtc'],

	props: {
		userName: 'Unknown',
		showHome: true,
		title: ''
	},

	template: {gulp_inject: './header.html'},

	init: function(elt, broker, users, rtc) {

		const audio = new Audio('/assets/skype.mp3')
		audio.loop = true
	
		const ctrl = $$.viewController(elt, {
			data: {
				items: {
					pwd: {name: 'Change password', icon: 'fas fa-lock'},
					apps: {name: 'Applications', icon: 'fas fa-th'},
					sep: '------',
					logout: {name: 'Logout', icon: 'fas fa-power-off'}
				},
				userName: this.props.userName,
				showHome: this.props.showHome,
				title: this.props.title,
				nbNotif: 0,
				hasIncomingCall: false,
				caller: ''

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
						location.href = '/apps/notif'
					}					
				},
				onCallResponse: function(ev, data) {
					const {cmd} = data
					console.log('onCallResponse', data)
					ctrl.setData({hasIncomingCall: false})
					audio.pause()
					if (cmd == 'accept') {						
						location.href = `/apps/video?caller=${ctrl.model.caller}`
					}
					if (cmd == 'deny') {
						rtc.deny(ctrl.model.caller)
					}
				}
			}
		})

		function updateNotifs(nbNotif) {
			ctrl.setData({nbNotif})
		
		}

		broker.register('breizbot.notifCount', function(msg) {
			//console.log('msg', msg)
			updateNotifs(msg.data)
		})

		broker.register('breizbot.rtc.call', function(msg) {
			console.log('msg', msg)
			if (msg.hist === true) {
				return
			}
			ctrl.setData({hasIncomingCall: true, caller: msg.data.from})
			audio.play()
		})

		broker.register('breizbot.rtc.cancel', function(msg) {
			console.log('msg', msg)
			if (msg.hist === true) {
				return
			}
			ctrl.setData({hasIncomingCall: false})
			audio.pause()
		})


		users.getNotifCount().then(updateNotifs)
	}
});
