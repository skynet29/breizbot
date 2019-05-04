$$.control.registerControl('writeMailPage', {

	template: {gulp_inject: './writeMail.html'},

	deps: ['breizbot.mails'],

	props: {
		$pager: null,
		accountName: '',
		data: {}
	},

	init: function(elt, srvMail) {

		const {$pager, accountName, data} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				data
			},
			events: {
				onSend: function(ev) {
					console.log('onSend')
					ev.preventDefault()
					const data = $(this).getFormData()
					srvMail.sendMail(accountName, data).then(() => {
						$pager.popPage()
					})

				}
			}

		})

		if (data.text != undefined) {
			const content = ctrl.scope.content.get(0)
			content.focus()
			content.setSelectionRange(0, 0)
		}		

		this.onAction = function(action) {
			console.log('onAction', action)
			if (action == 'send') {
				ctrl.scope.submit.click()
			}
		}
	}
})