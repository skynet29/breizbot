$$.control.registerControl('accountPage', {

	template: {gulp_inject: './account.html'},

	deps: ['breizbot.mails'],

	props: {
		$pager: null
	},

	init: function(elt, srvMail) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onSubmit: function(ev) {
					ev.preventDefault()
					const data = $(this).getFormData()
					srvMail.createMailAccount(data).then(() => {
						$pager.popPage('update')
					})
				}
			}
		})

		this.onAction = function(cmd) {
			ctrl.scope.submit.click()
		}

	}


});




