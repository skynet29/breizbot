$$.control.registerControl('boxesPage', {

	template: {gulp_inject: './boxes.html'},

	deps: ['app.mails'],

	props: {
		$pager: null,
		currentAccount: '',
		mailboxName: '',
		seqNos: []
	},

	buttons: [
		{name: 'apply', icon: 'fa fa-check'}
	],
	
	init: function(elt, srvMail) {

		const {$pager, currentAccount, mailboxName, seqNos} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				mailboxes: []
			},
			events: {
			}
		})


		function loadMailboxes() {
			console.log('loadMailboxes')
			srvMail.getMailboxes(currentAccount).then((mailboxes) => {
				console.log('mailboxes', mailboxes)
				ctrl.setData({
					mailboxes
				})
			})
		}

		loadMailboxes()


		this.onAction = function(action) {
			console.log('onAction', action)
			if (action == 'apply') {
				const {tree} = ctrl.scope
				const node = tree.getActiveNode()
				if (node == null) {
					$$.ui.showAlert({title: 'Select Target Mailbox', content: 'Please select a target mailbox'})
					return
				}
				const targetName = tree.getNodePath(node)
				if (targetName == mailboxName) {
					$$.ui.showAlert({title: 'Select Target Mailbox', content: 'Please select a target mailbox different from current mailbox'})
					return
				}

				srvMail.moveMessage(currentAccount, mailboxName, targetName, seqNos).then(() => {
					$pager.popPage()
				})
				
			}
		}

	}


});




