$$.control.registerControl('rootPage', {

	template: {gulp_inject: './main.html'},

	deps: ['breizbot.pager', 'breizbot.http'],

	init: function(elt, pager, http) {


		const ctrl = $$.viewController(elt, {
			data: {
				accounts: [],
				formatAmount: function(scope) {
					return scope.$i.finalBalance.toFixed(2)
				},
				hasAccounts:  function() {
					return this.accounts.length > 0
				},
				contextMenu: function() {
					return {
						edit: {
							name: 'Edit',
							icon: 'fas fa-edit'
						},
						delete: {
							name: 'Delete',
							icon: 'fas fa-trash-alt'
						}
					}
				}
			},
			events: {
				onAddAccount: function() {
					console.log('onAddAccount')
					pager.pushPage('addAccount', {
						title: 'Add Account',
						onReturn:  async function(data) {
							//console.log('onReturn', data)
							await http.post('/account', data)
							loadAccounts()
						}
					})
				},
				onContextMenu: function(ev, data) {
					const idx = $(this).index()

					//console.log('onContextMenu', data, idx)

					const accountInfo = ctrl.model.accounts[idx]
					const accountId = accountInfo._id.toString()

					const {cmd} = data
					if (cmd == 'delete') {
						$$.ui.showConfirm({title: 'Delete Account', content: 'Are you sure ?'}, async () => {
							await http.delete(`/account/${accountId}`)
							loadAccounts()
						})
					}
				},
				onItemClick: function(ev) {
					const idx = $(this).index()
					//console.log('onItemClick', idx)
					const accountInfo = ctrl.model.accounts[idx]
					pager.pushPage('transactions', {
						title: `${accountInfo.name} Transactions`,
						props: {
							accountId: accountInfo._id.toString()
						}
					})
				}
			}
			
		})

		async function loadAccounts() {
			const accounts = await http.get('/account')
			//console.log('accounts', accounts)
			ctrl.setData({accounts})
		}

		loadAccounts()

	}


});




