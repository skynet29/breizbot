$$.control.registerControl('contactsPage', {

	template: {gulp_inject: './contacts.html'},

	deps: ['breizbot.pager'],

	init: function(elt, pager) {

		const ctrl = $$.viewController(elt)


		this.getButtons = function() {
			return {
				ok: {
					title: 'Apply',
					icon: 'fa fa-check',
					onClick: function() {
						pager.popPage(ctrl.scope.contacts.getSelection())

					}
				}
			}					
		}
	}


});




