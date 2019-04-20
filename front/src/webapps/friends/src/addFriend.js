$$.control.registerControl('addFriendPage', {

	deps: ['breizbot.users', 'breizbot.params'],

	template: {gulp_inject: './addFriend.html'},

	props: {
		friends: []
	},

	init: function(elt, users, params) {

		const currentFriends = this.props.friends

		const ctrl = $$.viewController(elt, {
			data: {
				friends: []
			},
			events: {
				onSearch: function(ev) {
					console.log('onSearch')
					ev.preventDefault()
					const {search} = $(this).getFormData()
					$(this).resetForm()
					console.log('search', search)
					users.match(search).then((friends) => {
						ctrl.setData({friends: friends.filter((friend) => friend.username != params.$userName)})
					})
				},
				onInvit: function(ev) {
					const friendUserName = $(this).data('username')
					console.log('onInvit', friendUserName)
					if (currentFriends.includes(friendUserName)) {
						$$.ui.showAlert({title: 'Warning', content: `
							User <strong>${friendUserName}</strong> is already your friend
							`})
						return
					}

					users.sendNotif(friendUserName, {
						type: 'invit',
					}).then(() => {
						$$.ui.showAlert({title: 'Add Friend', content: `An invitation was sent to user <strong>${friendUserName}</strong>`})
					})
				}
			}
		})	

	}
});




