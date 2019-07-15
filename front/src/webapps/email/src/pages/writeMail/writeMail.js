$$.control.registerControl('writeMailPage', {

	template: {gulp_inject: './writeMail.html'},

	deps: ['app.mails'],

	props: {
		$pager: null,
		accountName: '',
		data: {}
	},

	buttons: [
		{name: 'attachment', icon: 'fa fa-paperclip'},
		{name: 'send', icon: 'fa fa-paper-plane'}
	],	

	init: function(elt, srvMail) {

		const {$pager, accountName, data} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				data,
				attachments: []
			},
			events: {
				onSend: function(ev) {
					console.log('onSend')
					ev.preventDefault()
					const data = $(this).getFormData()
					const {attachments} = ctrl.model
					if (attachments.length > 0) {
						data.attachments = attachments.map((a) => a.rootDir + a.fileName)
					}

					srvMail.sendMail(accountName, data)
					.then(() => {
						$pager.popPage()
					})
					.catch((e) => {
						$$.ui.showAlert({title: 'Error', content: e.responseText})
					})

				},
				openContact: function() {
					console.log('openContact')
					$pager.pushPage('contactsPage', {
						title: 'Select a contact',
						onReturn: function(friends) {
							const contacts = friends.map((a) => a.contactEmail)
							console.log('contacts', contacts)
							const to = ctrl.scope.to.val()
							console.log('to', to)

							if (to != '') {
								contacts.unshift(to)
							}
							ctrl.setData({data: {to: contacts.join(',')}})							
						}
					})
				},
				onRemoveAttachment: function(ev) {
					const idx = $(this).closest('li').index()
					console.log('onRemoveAttachment', idx)
					ctrl.model.attachments.splice(idx, 1)
					ctrl.update()

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
			if( action == 'attachment') {
				$pager.pushPage('breizbot.files', {
					title: 'Select a file to attach',
					props: {
						showThumbnail: true
					},
					onReturn: function(data) {
						const {fileName, rootDir} = data
						ctrl.model.attachments.push({fileName, rootDir})
						ctrl.update()						
					}
				})
			}
		}

	}
})