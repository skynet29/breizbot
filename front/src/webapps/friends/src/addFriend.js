//@ts-check
$$.control.registerControl('addFriendPage', {

	deps: ['breizbot.users', 'breizbot.notifs', 'breizbot.params'],

	template: {gulp_inject: './addFriend.html'},

	props: {
		friends: []
	},

	/**
	 * 
	 * @param {*} elt 
	 * @param {Breizbot.Services.User.Interface} users 
	 * @param {Breizbot.Services.Notif.Interface} notifsSrv 
	 * @param {*} params 
	 */
	init: function(elt, users, notifsSrv, params) {

		const currentFriends = this.props.friends

		const ctrl = $$.viewController(elt, {
			data: {
				friends: [],
				show1: function() {return this.friends.length == 0}
			},
			events: {
				onSearch: async function(ev, data) {
					console.log('onSearch', data)
					const friends = await users.match(data.value)
					ctrl.setData({friends: friends.filter((friend) => friend.username != params.$userName)})
				},
				onInvit: async function(ev) {
					const friendUserName = $(this).data('username')
					console.log('onInvit', friendUserName)
					if (currentFriends.includes(friendUserName)) {
						$$.ui.showAlert({title: 'Warning', content: `
							User <strong>${friendUserName}</strong> is already your friend
							`})
						return
					}

					await notifsSrv.sendNotif(friendUserName, {
						type: 'invit',
					})
					$$.ui.showAlert({title: 'Add Friend', content: `An invitation was sent to user <strong>${friendUserName}</strong>`})
				}
			}
		})	

	}
});




