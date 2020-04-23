$$.control.registerControl('rootPage', {

	deps: ['breizbot.users', 'breizbot.broker'],

	template: {gulp_inject: './main.html'},

	init: function(elt, users, broker) {

		const ctrl = $$.viewController(elt, {
			data: {
				notifs: [],
				show1: function(scope) {return typeof scope.n.notif.text === 'string'},
				show2: function(scope) {return scope.n.notif.reply === true},
				text1: function(scope) {return new Date(scope.n.date).toLocaleDateString()},
				text2: function(scope) {return new Date(scope.n.date).toLocaleTimeString()},
				isInvit: function(scope) {return scope.n.notif.type === 'invit'}
			},
			events: {
				onDelete: function() {
					const idx = $(this).closest('li').index()
					const item = ctrl.model.notifs[idx]
					console.log('onDelete', item)
					users.removeNotif(item._id)
				},
				onAccept: async function() {
					const idx = $(this).closest('li').index()
					const item = ctrl.model.notifs[idx]
					console.log('onAccept', item)

					const friendUserName = item.from
					await users.addFriend(friendUserName)
					await users.removeNotif(item._id)
					await users.sendNotif(friendUserName, {text: 'User has accepted your invitation'})
				},
				onDecline: async function() {
					const idx = $(this).closest('li').index()
					const item = ctrl.model.notifs[idx]
					console.log('onDecline', item)
					const friendUserName = item.from

					await users.removeNotif(item._id)
					await users.sendNotif(friendUserName, {text: `User has declined your invitation`})
				},
				onReply: async function(ev) {
					const idx = $(this).closest('li').index()
					const item = ctrl.model.notifs[idx]
					console.log('onReply', item)
					const friendUserName = item.from	
					const text = await $$.ui.showPrompt({title: 'Reply', label: 'Message:'})
					if (text != null) {
						await users.removeNotif(item._id)
						await users.sendNotif(friendUserName, {text, reply:true})
					}
				}
			}
		})	

		async function updateNotifs() {
			const notifs = await users.getNotifs()
			console.log('notifs', notifs)
			ctrl.setData({notifs})
		}

		broker.register('breizbot.notifCount', function(msg) {
			//console.log('msg', msg)
			updateNotifs()
		})

		updateNotifs()

	}
});




