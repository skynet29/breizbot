$$.control.registerControl('breizbot.main', {

	deps: ['breizbot.users', 'breizbot.broker'],

	template: {gulp_inject: './main.html'},

	init: function(elt, users, broker) {

		const ctrl = $$.viewController(elt, {
			data: {notifs: []},
			events: {
				onDelete: function() {
					var notifId = $(this).closest('li').data('notifId')
					console.log('onDelete', notifId)
					users.removeNotif(notifId)
				}
			}
		})	

		function updateNotifs() {
			users.getNotifs().then((notifs) => {
				console.log('notifs', notifs)
				ctrl.setData({notifs})
			})				
		}

		broker.register('breizbot.notifCount', function(msg) {
			console.log('msg', msg)
			updateNotifs()
		})

		updateNotifs()

	}
});




