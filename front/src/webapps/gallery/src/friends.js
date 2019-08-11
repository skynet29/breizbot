$$.control.registerControl('friends', {

	template: {gulp_inject: './friends.html'},

	props: {
		$pager: null
	},

	init: function(elt) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onSelectFriend: function(ev, data) {
					console.log('onSelectFriend', data)
					const {userName} = data
					$pager.pushPage('files', {
						title: userName,
						props: {
							friendUser: userName
						}
					})
				}				
			}
		})	

	}
});