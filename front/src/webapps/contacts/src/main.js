$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.pager', 'breizbot.contacts'],


	init: function(elt, pager, contactsSrv) {

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onAddContact: function() {
					//console.log('onAddContact')
					pager.pushPage('breizbot.addContactPage', {
						title: 'Add Contact',
						onReturn: async function(info) {
							await this.addContact(info.data)
							ctrl.scope.contacts.update()
						}
					})
				},
				onContactClicked: function(ev, info) {
					//console.log('onContactClicked', info)
					pager.pushPage('breizbot.addContactPage', {
						title: 'Edit Contact',
						props: {info},
						onReturn: async function(info) {
							console.log('onReturn', info)
							await this.updateContactInfo(info.id, info.data)
							ctrl.scope.contacts.update()
						}
					})
				}
			}
		})



	}


});




