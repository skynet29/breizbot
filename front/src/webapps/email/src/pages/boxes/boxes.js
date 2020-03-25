$$.control.registerControl('boxesPage', {

	template: {gulp_inject: './boxes.html'},

	deps: ['app.mails', 'breizbot.pager'],

	props: {
		currentAccount: '',
		showForm: false
	},

	buttons: {
		apply: {title: 'Apply', icon: 'fa fa-check'}
	},
	
	init: function(elt, srvMail, pager) {

		const {currentAccount, showForm} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				mailboxes: [],
				showForm
			},
			events: {
				onSubmit: function(ev) {
					ev.preventDefault()
					const {name} = $(this).getFormData()
					//console.log('onSubmit', name)

					const {tree} = ctrl.scope
					const node = tree.getActiveNode()
					if (node == null) {
						$$.ui.showAlert({title: 'Warning', content: 'Please select a target mailbox'})
						return
					}
					let targetName = tree.getNodePath(node) + '/' + name
					//console.log('targetName', targetName)
					const token = targetName.split('/')
					token.shift()
					targetName = token.join('/')
					//console.log('targetName', targetName)


					pager.popPage(targetName)					
				}
			}
		})


		function loadMailboxes() {
			console.log('loadMailboxes')
			srvMail.getMailboxes(currentAccount).then((mailboxes) => {
				console.log('mailboxes', mailboxes)
				if (showForm) {
					ctrl.setData({
						mailboxes: [{
							title: 'Folders',
							folder: true,
							children: mailboxes,
							expanded: true
						}]
					})
				}
				else {
					ctrl.setData({
						mailboxes
					})
				}
			})
		}

		loadMailboxes()


		this.onAction = function(action) {
			console.log('onAction', action)
			if (action == 'apply') {

				if (showForm) {
					ctrl.scope.submit.click()
					return
				}

				const {tree} = ctrl.scope
				const node = tree.getActiveNode()
				if (node == null) {
					$$.ui.showAlert({title: 'Select Target Mailbox', content: 'Please select a target mailbox'})
					return
				}
				const targetName = tree.getNodePath(node)

				pager.popPage(targetName)
			}
		}

	}


});




