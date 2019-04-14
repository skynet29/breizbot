$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	props: {
		$pager: null
	},

	init: function(elt) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
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

	}
});




