$$.control.registerControl('rootPage', {

	deps: ['breizbot.users'],

	template: {gulp_inject: './main.html'},

	props: {
		$pager: null
	},

	init: function(elt, users) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				friends: []
			},
			events: {
				onAddFriend: function(ev) {
					console.log('onAddFriend')
					$pager.pushPage('addFriend', {
						title: 'Add Friend'
					})
				}
				// onDelete: function() {
				// 	var notifId = $(this).closest('li').data('notifId')
				// 	console.log('onDelete', notifId)
				// 	users.removeNotif(notifId)
				// }
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




