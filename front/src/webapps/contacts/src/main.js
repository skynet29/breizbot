$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.pager'],


	init: function(elt, pager) {

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onAddContact: function() {
					console.log('onAddContact')
					pager.pushPage('addContactPage', {
						title: 'Add Contact',
						onReturn: function(data) {
							ctrl.scope.contacts.update()
						}
					})
				}
			}
		})



	}


});




