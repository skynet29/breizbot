$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.mails'],

	props: {
		$pager: null
	},

	init: function(elt, srvMail) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				accounts: [],
				currentAccount: '',
				mailboxes: [],
			},
			events: {
				onCreateAccount: function() {
					console.log('onCreateAccount')
					$pager.pushPage('accountPage', {
						title: 'Create Mail Account',
						buttons: [{name: 'create', label: 'Create'}]
					})
				},
				onAccountChange: function() {
					console.log('onAccountChange', $(this).val())
				},

				onTreeActivate: function() {
					console.log('onTreeActivate')
					const mailboxName = getMailboxName()
					console.log('mailboxName', mailboxName)
					const {currentAccount} = ctrl.model
					$pager.pushPage('mailboxPage', {
						title: mailboxName,
						props: {
							currentAccount,
							mailboxName
						},
						buttons: [
							{name: 'delete', icon: 'fa fa-trash'},
							{name: 'prev', icon: 'fa fa-angle-left'},
							{name: 'next', icon: 'fa fa-angle-right'}
						]
					})
				}
			}
		})

		function getMailboxName() {
			const {tree} = ctrl.scope

			const node =  tree.getActiveNode()
			return tree.getNodePath(node)
		}

		function loadAccount() {
			console.log('loadAccount')
			srvMail.getMailAccount().then((accounts) => {
				console.log('accounts', accounts)
				if (accounts.length == 0) {
					return
				}
				const currentAccount = accounts[0]
				console.log('currentAccount', currentAccount)
				ctrl.setData({accounts, currentAccount})
				loadMailboxes()
			})			
		}

		function loadMailboxes() {
			console.log('loadMailboxes')
			const {currentAccount} = ctrl.model
			srvMail.getMailboxes(currentAccount).then((mailboxes) => {
				console.log('mailboxes', mailboxes)
				ctrl.setData({
					mailboxes
				})
			})
		}

		loadAccount()

		this.onReturn = function(data) {
			console.log('onReturn', data)
			if (data == 'update') {
				loadAccount()
			}
			if (data == undefined) {
				const activeNode = ctrl.scope.tree.getActiveNode()
				if (activeNode != null) {
					activeNode.setActive(false)
				}
			}
		}
	}


});




