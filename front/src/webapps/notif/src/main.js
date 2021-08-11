//@ts-check
$$.control.registerControl('rootPage', {


	deps: ['breizbot.notifs', 'breizbot.friends', 'breizbot.broker'],

	template: {gulp_inject: './main.html'},

	/**
	 * 
	 * @param {*} elt 
	 * @param {Breizbot.Services.Notif.Interface} notifsSrv 
	 * @param {Breizbot.Services.Friends.Interface} friendsSrv 
	 * @param {Breizbot.Services.Broker.Interface} broker 
	 */
	init: function(elt, notifsSrv, friendsSrv, broker) {

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
					const item = getItem(this)
					console.log('onDelete', item)
					notifsSrv.removeNotif(item._id)
				},
				onAccept: async function() {
					const item = getItem(this)
					console.log('onAccept', item)

					const friendUserName = item.from
					await friendsSrv.addFriend(friendUserName)
					await notifsSrv.removeNotif(item._id)
					await notifsSrv.sendNotif(friendUserName, {text: 'User has accepted your invitation'})
				},
				onDecline: async function() {
					const item = getItem(this)
					console.log('onDecline', item)
					const friendUserName = item.from

					await notifsSrv.removeNotif(item._id)
					await notifsSrv.sendNotif(friendUserName, {text: `User has declined your invitation`})
				},
				onReply: async function(ev) {
					const item = getItem(this)
					console.log('onReply', item)
					const friendUserName = item.from	
					const text = await $$.ui.showPrompt({title: 'Reply', label: 'Message:'})
					if (text != null) {
						await notifsSrv.removeNotif(item._id)
						await notifsSrv.sendNotif(friendUserName, {text, reply:true})
					}
				}
			}
		})	

		function getItem(elt) {
			const idx = Math.trunc($(elt).closest('li').index() / 2)
			return ctrl.model.notifs[idx]
		}

		async function updateNotifs() {
			const notifs = await notifsSrv.getNotifs()
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




