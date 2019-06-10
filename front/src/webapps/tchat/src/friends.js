$$.control.registerControl('friendsPage', {

	template: {gulp_inject: './friends.html'},

	props: {
		$pager: null
	},

	buttons: [
		{name: 'call', icon: 'fa fa-comments'}
	],

	init: function(elt) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt)

		this.onAction = function(cmd) {
			console.log('onAction', cmd)
			const selection = ctrl.scope.friends.getSelection()
			if (selection == undefined) {
				$$.ui.showAlert({title: 'Error', content: 'Please select a friend'})
				return
			}
			const {friendUserName, isConnected} = selection
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