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

					const friendUserName = item.from
					users.addFriend(friendUserName).then(() => {
						return users.removeNotif(item._id).then(() => {
							return users.sendNotif(friendUserName, {text: 'User has accepted your invitation'})
						})
					})
				},
				onDecline: function() {
					const item = $(this).closest('li').data('item')
					console.log('onDecline', item)
					const friendUserName = item.from

					users.removeNotif(item._id).then(() => {
						return users.sendNotif(friendUserName, {text: `User has declined your invitation`})
					})				
				},
				onReply: function(ev) {
					const item = $(this).closest('li').data('item')
					console.log('onReply', item)
					const friendUserName = item.from	
					$$.ui.showPrompt({title: 'Reply', label: 'Message:'}, function(text) {
						users.removeNotif(item._id).then(() => {
							return users.sendNotif(friendUserName, {text, reply:true})
						})
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




