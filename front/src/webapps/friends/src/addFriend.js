$$.control.registerControl('addFriend', {

	deps: ['breizbot.users'],

	template: {gulp_inject: './addFriend.html'},

	init: function(elt, users) {

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
						ctrl.setData({friends})
					})
				},
				onInvit: function(ev) {
					const friendUserName = $(this).data('username')

					console.log('onInvit', friendUserName)
					users.sendInvitation(friendUserName)
				}
			}
		})	

	}
});




