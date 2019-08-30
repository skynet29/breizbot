$$.control.registerControl('friends', {

	template: {gulp_inject: './friends.html'},

	deps: ['breizbot.pager'],

	init: function(elt, pager) {

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onSelectFriend: function(ev, data) {
					console.log('onSelectFriend', data)
					const {userName} = data
					pager.pushPage('files', {
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