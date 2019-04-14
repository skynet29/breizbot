$$.control.registerControl('rootPage', {

	deps: ['breizbot.users', 'breizbot.broker'],

	template: {gulp_inject: './main.html'},

	init: function(elt, users, broker) {

		const ctrl = $$.viewController(elt, {
			data: {notifs: []},
			events: {
				onDelete: function() {
					const item = $(this).closest('li').data('item')
					console.log('onDelete', item)
					users.removeNotif(item._id)
				},
				onAccept: function() {
					const item = $(this).closest('li').data('item')
					console.log('onAccept', item)

					const friendUserName = item.notif.from
					users.addFriend(friendUserName).then(() => {
						return users.removeNotif(item._id)
					})
				},
				onDecline: function() {
					const item = $(this).closest('li').data('item')
					console.log('onDecline', item)
					users.removeNotif(item._id)				}
			}
		})	

		function updateNotifs() {
			users.getNotifs().then((notifs) => {
				console.log('notifs', notifs)
				ctrl.setData({notifs})
			})				
		}

		broker.register('breizbot.notifCount', function(msg) {
			//console.log('msg', msg)
			updateNotifs()
		})

		updateNotifs()

	}
});




