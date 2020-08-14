$$.control.registerControl('mailboxPage', {

	template: { gulp_inject: './mailbox.html' },

	deps: ['app.mails', 'breizbot.pager'],

	props: {
		currentAccount: '',
		mailboxName: ''
	},

	init: function (elt, srvMail, pager) {

		const { currentAccount, mailboxName } = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				messages: [],
				getMessages: async function (idx) {
					//console.log('getMessages', idx)
					return load(idx + 1)
				},
				nbMsg: 0,
				check: false,
				loading: false,
				mailboxName,
				text2: function (scope) {
					return scope.$i.to[0] && scope.$i.to[0].name
				},
				attr1: function (scope) {
					return { title: scope.$i.to[0] && scope.$i.to[0].email }
				},

				getDate: function (scope) {
					//console.log('getDate', date)
					const date = scope.$i.date
					const d = new Date(date)
					//console.log('d', d)
					return d.toLocaleDateString('fr-FR')
				},

				isSeen: function (scope) {
					return scope.$i.flags.includes('\\Seen')
				},

				isSentBox: function () {
					return this.mailboxName == 'Sent'
				}

			},
			events: {
				onFromClick: function () {
					//console.log('onFromClick')
					const check = $(this).closest('tr').find('.check')
					check.click()
				},
				onCheckClick: function () {
					ctrl.setData({ check: false })
					updateButtonState()
				},
				onItemClick: function (ev) {
					// $(this).closest('tbody').find('tr').removeClass('w3-blue')
					// $(this).addClass('w3-blue')
					const idx = $(this).closest('tr').index()
					const item = ctrl.model.messages[idx]
					//console.log('onItemClick', idx, item)
					pager.pushPage('messagePage', {
						title: item.subject,
						props: {
							currentAccount,
							mailboxName,
							item
						},
						onBack: function () {
							console.log('onBack')
							item.flags = ['\\Seen']
							ctrl.updateArrayItem('messages', idx, item)
						}
					})
				},

				onMainCheckBoxClick: function (ev) {
					elt.find('.check').prop('checked', $(this).prop('checked'))
					updateButtonState()
				},

			}
		})


		function updateButtonState() {
			const nbChecked = elt.find('.check:checked').length
			//console.log('nbChecked', nbChecked)
			const enabled = (nbChecked != 0)
			pager.setButtonEnabled({ move: enabled, delete: enabled, reload: true, newMail: true })


		}

		async function load(idx) {
			console.log('load', idx)

			if (idx != 1 && ctrl.model.messages.length == ctrl.model.nbMsg) {
				console.log('No more data')
				return null
			}

			ctrl.setData({ loading: true })
			pager.setButtonEnabled(false)

			const data = await srvMail.openMailbox(currentAccount, mailboxName, idx)
			console.log('data', data)
			let { messages, nbMsg } = data
			messages.forEach((i) => { i.checked = ctrl.model.check })
			if (idx == 1) {
				ctrl.enableNode('messages', true)
				ctrl.setData({
					loading: false,
					nbMsg,
					messages
				})
				ctrl.enableNode('messages', false)
				updateButtonState()

			}
			else {
				//ctrl.enableNode('messages', false)
				ctrl.model.messages = ctrl.model.messages.concat(messages)
				ctrl.setData({ loading: false })
				updateButtonState()
				console.log('nbLoadedMessages', ctrl.model.messages.length)
				return messages
			}
		}

		function getSeqNos() {
			const items = elt.find('.check:checked')
			const seqNos = []
			items.each(function () {
				const idx = $(this).closest('tr').index()
				seqNos.push({ seqno: ctrl.model.messages[idx].seqno, idx })
			})
			//console.log('seqNos', seqNos)
			return seqNos
		}

		function update(seqNos) {
			ctrl.removeArrayItem('messages', seqNos.map((i) => i.idx), 'messages')
			ctrl.model.nbMsg -= seqNos.length
			ctrl.update()
			const { nbMsg, messages } = ctrl.model
			console.log('nbMsg', nbMsg, 'length', messages.length)
			if (nbMsg == 0) {
				ctrl.setData({ check: false })
			}
			if (messages.length == 0 && nbMsg > 0) {
				load(1)
			}

		}

		async function deleteMessage() {
			const seqNos = getSeqNos()
			if (seqNos.length == 0) {
				$$.ui.showAlert({ title: 'Delete Message', content: 'Please select one or severall messages !' })
				return
			}

			await srvMail.deleteMessage(currentAccount, mailboxName, seqNos.map((i) => i.seqno))
			console.log('Messages deleted')
			update(seqNos)
		}

		function moveMessage() {
			const seqNos = getSeqNos()
			if (seqNos.length == 0) {
				$$.ui.showAlert({ title: 'Move Message', content: 'Please select one or severall messages !' })
				return
			}

			pager.pushPage('boxesPage', {
				title: 'Select target mailbox',
				props: {
					currentAccount
				},
				onReturn: async function (targetName) {
					if (targetName == mailboxName) {
						$$.ui.showAlert({ title: 'Select Target Mailbox', content: 'Target mailbox must be different from current mailbox' })
						return
					}

					await srvMail.moveMessage(currentAccount, mailboxName, targetName, seqNos.map((i) => i.seqno))
					update(seqNos)
				}
			})
		}

		load(1)

		function newMessage() {
			pager.pushPage('writeMailPage', {
				title: 'New Message',
				props: {
					accountName: currentAccount
				},
				onReturn: function () {
					if (mailboxName == 'Sent') {
						load()
					}
				}
			})
		}

		this.getButtons = function () {
			return {
				reload: {
					icon: 'fa fa-sync-alt',
					title: 'Update',
					enabled: false,
					onClick: function () {
						ctrl.enableNode('messages', true)
						load(1)
					}
				},
				newMail: {
					icon: 'fa fa-envelope',
					title: 'New Message',
					enabled: false,
					onClick: newMessage
				},
				move: {
					icon: 'fa fa-file-export',
					title: 'Move selected messages',
					enabled: false,
					onClick: moveMessage
				},
				delete: {
					icon: 'fa fa-trash',
					title: 'Delete selected messages',
					enabled: false,
					onClick: deleteMessage
				}
			}

		}

	}


});




