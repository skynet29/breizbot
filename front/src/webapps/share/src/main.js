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
				onSelectFriend: function(ev, data) {
					console.log('onSelectFriend', data)
					const {userName} = data
					$pager.pushPage('filesPage', {
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




