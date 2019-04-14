$$.control.registerControl('rootPage', {

	deps: ['breizbot.users', 'breizbot.broker', 'breizbot.params'],

	template: {gulp_inject: './main.html'},

	init: function(elt, users, broker, params) {

		console.log('params', params)

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

					const friendUserName = item.from
					users.addFriend(friendUserName).then(() => {
						return users.removeNotif(item._id).then(() => {
							return users.sendNotif(friendUserName, `User <strong>${params.$userName}</strong> has accepted your invitation`)
						})
					})
				},
				onDecline: function() {
					const item = $(this).closest('li').data('item')
					console.log('onDecline', item)
					const friendUserName = item.from

					users.removeNotif(item._id).then(() => {
						return users.sendNotif(friendUserName, `User <strong>${params.$userName}</strong> has declined your invitation`)
					})				
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
			//console.log('msg', msg)
			updateNotifs()
		})

		updateNotifs()

	}
});




