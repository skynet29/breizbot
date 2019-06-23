$$.control.registerControl('accountPage', {

	template: {gulp_inject: './account.html'},

	deps: ['app.mails'],

	props: {
		$pager: null
	},

	buttons: [
		{name: 'create', icon: 'fa fa-check'}
	],

	init: function(elt, srvMail) {

		const {$pager} = this.props

		const map = {
			'Gmail': {
				imapHost: 'imap.gmail.com',
				smtpHost: 'smtp.gmail.com'
			},
			'Outlook': {
				imapHost: 'imap.outlook.com',
				smtpHost: 'smtp.outlook.com'
			},
			'Free': {
				imapHost: 'imap.free.fr',
				smtpHost: 'smtp.free.fr'
			},
			'SFR': {
				imapHost: 'imap.sfr.fr',
				smtpHost: 'smtp.sfr.fr'
			},
			'Orange': {
				imapHost: 'imap.orange.fr',
				smtpHost: 'smtp.orange.fr'
			},
			'Bouygues Telecom': {
				imapHost: 'imap.bbox.fr',
				smtpHost: 'smtp.bbox.fr'
			},
			'Other': {
				imapHost: '',
				smtpHost: ''
			},
		}

		const ctrl = $$.viewController(elt, {
			data: {
				provider: 'Gmail',
				providers: Object.keys(map)
			},
			events: {
				onSubmit: function(ev) {
					ev.preventDefault()
					const data = $(this).getFormData()
					console.log('data', data)
					srvMail.createMailAccount(data).then(() => {
						$pager.popPage('update')
					})
				},
				onProviderChange: function() {
					const provider = $(this).val()
					console.log('onProviderChange', provider)
					ctrl.setData({provider})

					ctrl.scope.form.setFormData(map[provider])
				}
			}
		})

		ctrl.scope.form.setFormData(map[ctrl.model.provider])

		this.onAction = function(cmd) {
			ctrl.scope.submit.click()
		}



	}


});




