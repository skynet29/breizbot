$$.control.registerControl('addContactPage', {

	template: {gulp_inject: './addContact.html'},

	deps: ['breizbot.users', 'breizbot.pager'],

	props: {
		from: {}
	},

	buttons: [
		{name: 'add', icon: 'fa fa-user-plus'}
	],	

	init: function(elt, users, pager) {

		const {from} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				from
			},
			events: {
				onSubmit: function(ev) {
					ev.preventDefault()
					const data = $(this).getFormData()
					console.log('data', data)
					users.addContact(data.name, data.email).then(() => {
						console.log('contact added !')
						pager.popPage('addContact')
					})
					.catch((err) => {
						$$.ui.showAlert({title: 'Error', content: err.responseText})
					})
				}

			}
		})

		this.onAction = function(cmd) {
			console.log('onAction', cmd)
			ctrl.scope.submit.click()
		}



	}


});




