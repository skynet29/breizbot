//@ts-check
$$.control.registerControl('mailboxes', {

	template: { gulp_inject: './mailboxes.html' },

	deps: ['app.mails', 'breizbot.pager'],

	props: {
		accountName: ''

	},

	/**
	 * 
	 * @param {AppEmail.Interface} srvMail 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, srvMail, pager) {

		const { accountName } = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				mailboxes: [],
				show3: function () {
					return this.mailboxes.length > 0
				},
			},
			events: {

				onTreeActivate: function () {
					//console.log('onTreeActivate')
					/**@type {Brainjs.Controls.Tree.Interface} */
					const tree = $(this).iface()

					const node = tree.getActiveNode()

					const mailboxName = tree.getNodePath(node, (node) => node.data.name)
					//console.log('mailboxName', mailboxName)
					pager.pushPage('mailboxPage', {
						title: `${accountName} / ${node.data.name}`,
						props: {
							currentAccount: accountName,
							mailboxName
						},
						onBack: function () {

							loadMailboxes()
							const activeNode = ctrl.scope.tree.getActiveNode()
							if (activeNode != null) {
								activeNode.setActive(false)
							}
						}
					})
				}

			}
		})


		async function loadMailboxes() {
			//console.log('loadMailboxes')
			try {
				const mailboxes = await srvMail.getMailboxes(accountName, true)
				//console.log('mailboxes', mailboxes)

				ctrl.setData({
					mailboxes
				})

			}
			catch (e) {
				ctrl.setData({ mailboxes: [] })
				$$.ui.showAlert({ title: 'Error', content: e.responseText })
			}
		}

		this.getButtons = function () {
			return {
				reload: {
					icon: 'fa fa-sync-alt',
					title: 'Update',
					onClick: function () {
						loadMailboxes()
					}
				},

				newMessage: {
					title: 'New Message',
					icon: 'fas fa-envelope',
					onClick: function () {
						pager.pushPage('writeMailPage', {
							title: 'New Message',
							props: {
								accountName
							}
						})
					}
				},

				newFolder: {
					title: 'New Folder',
					icon: 'fas fa-folder-plus',
					onClick: function () {
						pager.pushPage('boxesPage', {
							title: 'Add new folder',
							props: {
								currentAccount: accountName,
								showForm: true
							},
							onReturn: async function (targetName) {
								console.log('onReturn', targetName)
								await srvMail.addMailbox(accountName, targetName)
								loadMailboxes()
							}
						})

					}
				}


			}
		}

		loadMailboxes()

	}


});




