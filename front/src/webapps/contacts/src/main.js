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
				onAddContact: function() {
					console.log('onAddContact')
					$pager.pushPage('addContactPage', {
						title: 'Add Contact',
						buttons: [
							{name: 'add', icon: 'fa fa-user-plus'}
						]
					})
				}
			}
		})

		this.onReturn = function(data) {
			if (data == 'update') {
				ctrl.scope.contacts.update()
			}
		}


	}


});




