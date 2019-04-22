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
			const {friendUserName, isConnected} = ctrl.scope.friends.getSelection()
			console.log('userName', friendUserName)
			if (!isConnected) {
				$$.ui.showAlert({
					title: 'Error', 
					content: `User <strong>${friendUserName}</strong> is not connected`
				})
			}
			else {
				$pager.popPage(friendUserName)
			}
		}
	}

})