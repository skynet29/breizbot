$$.control.registerControl('addContactPage', {

	template: {gulp_inject: './addContact.html'},

	deps: ['breizbot.users'],

	props: {
		$pager: null,
		from: {}
	},

	init: function(elt, users) {

		const {$pager, from} = this.props

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
						$pager.popPage('update')
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




