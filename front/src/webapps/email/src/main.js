$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['app.mails'],

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
				onMenu: function(ev, data) {
					console.log('onMenu', data)
					if (data.cmd == 'add') {
						$pager.pushPage('accountPage', {
							title: 'Create Mail Account'
						})						
					}
					if (data.cmd == 'new') {
						$pager.pushPage('writeMailPage', {
							title: 'New Message',
							props: {
								accountName: ctrl.model.currentAccount
							}
						})						
					}
				},

				onAccountChange: function() {
					console.log('onAccountChange', $(this).val())
					ctrl.setData({currentAccount: $(this).val()})
					loadMailboxes()
				},

				onTreeActivate: function() {
					console.log('onTreeActivate')
					const tree = $(this).iface()

					const node =  tree.getActiveNode()

					const mailboxName = tree.getNodePath(node)					
					console.log('mailboxName', mailboxName)
					const {currentAccount} = ctrl.model
					$pager.pushPage('mailboxPage', {
						title: node.title,
						props: {
							currentAccount,
							mailboxName
						}
					})
				}

			}
		})


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




