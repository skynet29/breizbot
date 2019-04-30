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
				messages: [],
				nbMsg: 0,

				getDate: function(date) {
					//console.log('getDate', date)
					const d = new Date(date)
					//console.log('d', d)
					return d.toLocaleDateString('fr-FR')
				},

				isSeen: function(flags) {
					return flags.includes('\\Seen')
				}

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
					srvMail.openMailbox(currentAccount, mailboxName).then((data) => {
						console.log('data', data)
						const {messages, nbMsg} = data
						ctrl.setData({
							nbMsg,
							messages: messages.reverse()
						})
					})
				},
				onItemClick: function(ev) {
					// $(this).closest('tbody').find('tr').removeClass('w3-blue')
					// $(this).addClass('w3-blue')
					const mailboxName = getMailboxName()

					const item = $(this).data('item')
					$pager.pushPage('messagePage', {
						title: `Message #${item.seqno}`,
						props: {
							name: ctrl.model.currentAccount,
							mailboxName,
							item							
						}

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

		this.onReturn = function() {
			console.log('onReturn')
			loadAccount()
		}
	}


});




