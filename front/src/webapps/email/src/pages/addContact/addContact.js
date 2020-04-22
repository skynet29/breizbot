$$.control.registerControl('addContactPage', {

	template: {gulp_inject: './addContact.html'},

	deps: ['breizbot.users', 'breizbot.pager'],

	props: {
		from: {}
	},

	init: function(elt, users, pager) {

		const {from} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				from
			},
			events: {
				onSubmit: async function(ev) {
					ev.preventDefault()
					const data = $(this).getFormData()
					console.log('data', data)
					try {
						await users.addContact(data.name, data.email)
						console.log('contact added !')
						pager.popPage('addContact')
					}
					catch(e) {
						$$.ui.showAlert({title: 'Error', content: err.responseText})
					}
				}

			}
		})

		this.getButtons = function() {
			return {
				add: {
					title: 'Add',
					icon: 'fa fa-user-plus',
					onClick: function() {
						ctrl.scope.submit.click()
					}
				}
			}			
		}
	}


});




