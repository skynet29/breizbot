$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'breizbot.http'],

	init: function (elt, pager, http) {


		const ctrl = $$.viewController(elt, {
			data: {
				accounts: [],
				formatAmount: function (scope) {
					return scope.$i.finalBalance.toFixed(2)
				},
				hasAccounts: function () {
					return this.accounts.length > 0
				},
				getDifference: function (scope) {
					const { income, expenses } = scope.$i.synthesis
					return (income - expenses).toFixed(2)
				},
				formatIncome: function(scope) {
					return scope.$i.synthesis.income.toFixed(2)
				},
				formatExpenses: function(scope) {
					return scope.$i.synthesis.expenses.toFixed(2)
				}
			},
			events: {
				onAddAccount: function () {
					console.log('onAddAccount')
					pager.pushPage('addAccount', {
						title: 'Add Account',
						onReturn: async function (data) {
							//console.log('onReturn', data)
							await http.post('/account', data)
							loadAccounts()
						}
					})
				},
				onContextMenu: function (ev, data) {
					const idx = $(this).index()

					//console.log('onContextMenu', data, idx)

					const accountInfo = ctrl.model.accounts[idx]
					//console.log('accountInfo', accountInfo)
					const accountId = accountInfo._id.toString()
					
					const { cmd } = data
					if (cmd == 'delete') {
						$$.ui.showConfirm({ title: 'Delete Account', content: 'Are you sure ?' }, async () => {
							await http.delete(`/account/${accountId}`)
							loadAccounts()
						})
					}
					else if (cmd == 'edit') {
						pager.pushPage('addAccount', {
							title: 'Edit Account',
							props: {
								formData: accountInfo
							},
							onReturn: async function (data) {
								//console.log('onReturn', data)
								const newData =  $.extend(accountInfo, data)
								delete newData._id
								delete newData.synthesis
								await http.put(`/account/${accountId}`, newData)
								loadAccounts()
							}
						})
					}
					else if (cmd == 'recurringTrans') {
						pager.pushPage('recurringTransactions', {
							title: `Recurring Transactions: ${accountInfo.name}`,
							props: {
								accountId
							},
							onBack: function() {
								loadAccounts()
							}
						})
					}
				},
				onItemClick: function (ev) {
					const idx = $(this).index()
					//console.log('onItemClick', idx)
					const accountInfo = ctrl.model.accounts[idx]
					pager.pushPage('transactions', {
						title: `Transactions: ${accountInfo.name}`,
						props: {
							accountId: accountInfo._id.toString()
						},
						onBack: function () {
							loadAccounts()
						}
					})
				}
			}

		})

		async function loadAccounts() {
			const accounts = await http.get('/account', {synthesis: 1})
			//console.log('accounts', accounts)
			ctrl.setData({ accounts })
		}

		loadAccounts()

	}


});




