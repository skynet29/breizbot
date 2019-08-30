$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.pager'],

	init: function(elt, pager) {

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onAddFriend: function(ev) {
					console.log('onAddFriend')
					pager.pushPage('addFriendPage', {
						title: 'Add Friend',
						props: {
							friends: ctrl.scope.friends.getFriends()
						}
					})
				},
				onUpdate: function() {
					ctrl.scope.friends.update()
				}

			}
		})	

	}
});




