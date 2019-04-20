$$.control.registerControl('friendsPage', {

	template: {gulp_inject: './friends.html'},

	props: {
		$pager: null
	},

	init: function(elt) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			events: {
				onFriendSelect: function(ev, data) {
					//console.log('onFriendSelect', data)
				}
			}
		})

		this.onAction = function(cmd) {
			console.log('onAction', cmd)
			const userName = ctrl.scope.friends.getSelection()
			console.log('userName', userName)
			$pager.popPage(userName)
		}
	}

})