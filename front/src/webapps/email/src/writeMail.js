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

				},
				openContact: function() {
					console.log('openContact')
					$pager.pushPage('contactsPage', {
						title: 'Select a contact',
						buttons: [
							{name: 'ok', icon: 'fa fa-check'}
						]
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

		this.onReturn = function(data) {
			console.log('onReturn', data)
			if (data != undefined) {
				ctrl.setData({data: {to: data.contactEmail}})
			}
		}
	}
})