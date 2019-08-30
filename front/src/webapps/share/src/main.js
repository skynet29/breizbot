$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.pager'],

	init: function(elt, pager) {

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onSelectFriend: function(ev, data) {
					//console.log('onSelectFriend', data)
					const {userName} = data
					pager.pushPage('filesPage', {
						title: userName,
						props: {
							userName
						}
					})
				}				
			}
		})	

	}
});




