$$.control.registerControl('writeMailPage', {

	template: {gulp_inject: './writeMail.html'},

	deps: ['app.mails', 'breizbot.pager'],

	props: {
		accountName: '',
		data: {}
	},

	buttons: {
		attachment: {icon: 'fa fa-paperclip', title: 'Add attachment'},
		send: {icon: 'fa fa-paper-plane', title: 'Send Message'}
	},	

	init: function(elt, srvMail, pager) {

		const {accountName, data} = this.props
		console.log('data', data)

		const ctrl = $$.viewController(elt, {
			data: {
				data,
				attachments: [],
				show1: function() {return this.attachments.length > 0},
				prop1: function() {return {autofocus: this.data.html == undefined}}
			},
			events: {
				onSend: function(ev) {
					console.log('onSend')
					ev.preventDefault()
					const data = $(this).getFormData()
					console.log('data', data)
					const {attachments} = ctrl.model
					if (attachments.length > 0) {
						data.attachments = attachments.map((a) => a.rootDir + a.fileName)
					}

					srvMail.sendMail(accountName, data)
					.then(() => {
						pager.popPage()
					})
					.catch((e) => {
						$$.ui.showAlert({title: 'Error', content: e.responseText})
					})

				},
				openContact: function() {
					console.log('openContact')
					pager.pushPage('contactsPage', {
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

		if (data.html != undefined) {
			ctrl.scope.content.focus()
		}		

		this.onAction = function(action) {
			console.log('onAction', action)
			if (action == 'send') {
				ctrl.scope.submit.click()
			}
			if( action == 'attachment') {
				pager.pushPage('breizbot.files', {
					title: 'Select a file to attach',
					props: {
						showThumbnail: true
					},
					events: {
						fileclick: function(ev, data) {
							pager.popPage(data)
						}
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