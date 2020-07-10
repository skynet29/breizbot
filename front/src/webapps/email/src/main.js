$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['app.mails', 'breizbot.pager'],


	init: function (elt, srvMail, pager) {

		const ctrl = $$.viewController(elt, {
			data: {
				accounts: [],
				currentAccount: '',
				mailboxes: [],
				show1: function () {
					return this.accounts.length == 0
				},
				show2: function () {
					return this.accounts.length > 0
				},
				show3: function () {
					return this.mailboxes.length > 0
				},
				getItems: function () {
					if (this.accounts.length == 0) {
						return {
							add: { name: 'Add Account', icon: 'fas fa-plus' },
						}
					}
					return {
						add: { name: 'Add account', icon: 'fas fa-plus' },
						edit: { name: 'Edit selected account', icon: 'fas fa-edit' },
						delete: { name: 'Delete selected account', icon: 'fas fa-trash' },
						sep2: '------',
						newFolder: { name: 'New Folder', icon: 'fas fa-folder-plus' },
						sep: '------',
						new: { name: 'New Message', icon: 'fas fa-envelope' }
					}
				}
			},
			events: {
				onMenu: function (ev, data) {
					console.log('onMenu', data)
					if (data.cmd == 'delete') {
						const { currentAccount } = ctrl.model
						$$.ui.showConfirm({
							title: 'Delete Account',
							content: `Do you really want to delete <strong>'${currentAccount}'</strong> account`
						},
							async () => {
								await srvMail.removeMailAccount(currentAccount)
								loadAccount()

							})
					}
					if (data.cmd == 'add') {
						pager.pushPage('accountPage', {
							title: 'Add Mail Account',
							onReturn: loadAccount
						})
					}
					if (data.cmd == 'new') {
						pager.pushPage('writeMailPage', {
							title: 'New Message',
							props: {
								accountName: ctrl.model.currentAccount
							}
						})
					}
					if (data.cmd == 'edit') {
						srvMail.getMailAccount(ctrl.model.currentAccount).then((data) => {
							pager.pushPage('accountPage', {
								title: 'Edit Mail Account',
								props: {
									data
								}
							})

						})
					}
					if (data.cmd == 'newFolder') {
						pager.pushPage('boxesPage', {
							title: 'Add new folder',
							props: {
								currentAccount: ctrl.model.currentAccount,
								showForm: true
							},
							onReturn: function (targetName) {
								console.log('onReturn', targetName)
								srvMail.addMailbox(ctrl.model.currentAccount, targetName).then(() => {
									loadMailboxes()
								})

							}
						})
					}
				},

				onAccountChange: function () {
					console.log('onAccountChange', $(this).getValue())
					ctrl.setData({ currentAccount: $(this).getValue() })
					loadMailboxes()
				},

				onTreeActivate: function () {
					console.log('onTreeActivate')
					const tree = $(this).iface()

					const node = tree.getActiveNode()

					const mailboxName = tree.getNodePath(node, (node) => node.data.name)
					console.log('mailboxName', mailboxName)
					const { currentAccount } = ctrl.model
					pager.pushPage('mailboxPage', {
						title: node.data.name,
						props: {
							currentAccount,
							mailboxName
						},
						onBack: function () {
							if (mailboxName == 'INBOX') {
								loadMailboxes()
							}
							const activeNode = ctrl.scope.tree.getActiveNode()
							if (activeNode != null) {
								activeNode.setActive(false)
							}
						}
					})
				}

			}
		})


		async function loadAccount() {
			console.log('loadAccount')
			try {
				const accounts = await srvMail.getMailAccounts()
				console.log('accounts', accounts)
				if (accounts.length == 0) {
					return
				}
				const currentAccount = accounts[0]
				console.log('currentAccount', currentAccount)
				ctrl.setData({ accounts, currentAccount })
				loadMailboxes()
			}
			catch (err) {
				$$.ui.showAlert({ title: 'Error', content: err })
			}
		}

		async function loadMailboxes() {
			console.log('loadMailboxes')
			const { currentAccount } = ctrl.model
			try {
				const mailboxes = await srvMail.getMailboxes(currentAccount)
				console.log('mailboxes', mailboxes)

				ctrl.setData({
					mailboxes
				})

			}
			catch (e) {
				ctrl.setData({mailboxes:[]})
				$$.ui.showAlert({title: 'Error', content: e.responseText})
			}
		}

		loadAccount()

	}


});




