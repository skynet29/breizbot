$$.control.registerControl('contactsPage', {

	template: {gulp_inject: './contacts.html'},

	deps: ['breizbot.pager'],

	buttons: {
		ok: {title: 'Apply', icon: 'fa fa-check'}
	},
	
	init: function(elt, pager) {

		const ctrl = $$.viewController(elt)


		this.onAction = function(action) {
			console.log('onAction', action)
			if (action == 'ok') {
				pager.popPage(ctrl.scope.contacts.getSelection())
			}
		}
	}


});




