$$.control.registerControl('contactsPage', {

	template: {gulp_inject: './contacts.html'},

	props: {
		$pager: null,
	},

	buttons: [
		{name: 'ok', icon: 'fa fa-check'}
	],
	
	init: function(elt) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt)


		this.onAction = function(action) {
			console.log('onAction', action)
			if (action == 'ok') {
				$pager.popPage(ctrl.scope.contacts.getSelection())
			}
		}
	}


});




