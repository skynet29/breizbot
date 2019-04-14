$$.control.registerControl('breizbot.friends', {

	deps: ['breizbot.users'],

	template: {gulp_inject: './friends.html'},

	init: function(elt, users) {


		const ctrl = $$.viewController(elt, {
			data: {
				friends: []
			}
		})	

		function updateFriends() {
			users.getFriends().then((friends) => {
				console.log('friends', friends)
				ctrl.setData({friends})
			})				
		}


		updateFriends()

	}
});




