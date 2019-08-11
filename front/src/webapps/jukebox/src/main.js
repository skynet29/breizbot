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
				onHome: function() {
					console.log('onHome')
					$pager.pushPage('files', {
						title: 'Home files'					
					})
				},
				onShare: function() {
					console.log('onShare')
					$pager.pushPage('friends', {
						title: 'Shared files'					
					})
				}

			}
		})

	}


});




