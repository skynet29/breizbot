//@ts-check
$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['app.mails', 'breizbot.pager'],

	/**
	 * 
	 * @param {AppEmail.Interface} srvMail 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, srvMail, pager) {

		const ctrl = $$.viewController(elt, {
			data: {
				accounts: [],
				hasAccounts: function() {
					return this.accounts.length > 0
				}

			},
			events: {
				onAddAccount: function() {
					console.log('onAddAccount')
					pager.pushPage('accountPage', {
						title: 'Add Mail Account',
						onReturn: loadAccount
					})

				},
				onItemContextMenu: async function (ev, data) {
					const idx = $(this).closest('.item').index()
					//console.log('onItemContextMenu', idx, data)
					const account = ctrl.model.accounts[idx]
					//console.log('account', account)
					if (data.cmd == 'delete') {

						$$.ui.showConfirm({
							title: 'Delete Account',
							content: `Do you really want to delete <strong>'${account}'</strong> account`
						},
							async () => {
								await srvMail.removeMailAccount(account)
								loadAccount()

							})
					}
					else if (data.cmd == 'edit') {
						const data = await srvMail.getMailAccount(account)
						pager.pushPage('accountPage', {
							title: 'Edit Mail Account',
							props: {
								data
							}
						})

					}


				},

				onItemClick: function (ev, data) {
					const idx = $(this).closest('.item').index()
					//console.log('onItemClick', idx)
					const accountName = ctrl.model.accounts[idx]
					pager.pushPage('mailboxes', {
						title: accountName,
						props: {
							accountName
						}
					})


				}

			}
		})


		async function loadAccount() {
			//console.log('loadAccount')
			try {
				const accounts = await srvMail.getMailAccounts()
				//console.log('accounts', accounts)
				ctrl.setData({ accounts })
			}
			catch (err) {
				$$.ui.showAlert({ title: 'Error', content: err })
			}
		}


		loadAccount()

	}


});




