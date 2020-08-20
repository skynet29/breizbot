$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'breizbot.contacts'],


	init: function (elt, pager, contactsSrv) {

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onAddContact: function () {
					//console.log('onAddContact')
					pager.pushPage('breizbot.addContactPage', {
						title: 'Add Contact',
						onReturn: async function (info) {
							await this.addContact(info.data)
							ctrl.scope.contacts.update()
						}
					})
				},
				onContactContextMenu: function (ev, data) {
					//console.log('onContactContextMenu', data)
					const { cmd, info } = data
					if (cmd == 'edit') {
						pager.pushPage('breizbot.addContactPage', {
							title: 'Edit Contact',
							props: { info },
							onReturn: async function (info) {
								console.log('onReturn', info)
								await this.updateContactInfo(info.id, info.data)
								ctrl.scope.contacts.update()
							}
						})

					}

					if (cmd == 'delete') {
						$$.ui.showConfirm({ title: 'Delete Contact', content: 'Are you sure ?' }, async () => {
							await ctrl.scope.contacts.removeContact(info._id)
						})
					}
				}
			}
		})



	}


});




