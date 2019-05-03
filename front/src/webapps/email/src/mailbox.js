$$.control.registerControl('mailboxPage', {

	template: {gulp_inject: './mailbox.html'},

	deps: ['breizbot.mails'],

	props: {
		$pager: null,
		currentAccount: '',
		mailboxName: ''
	},

	init: function(elt, srvMail) {

		const {$pager, currentAccount, mailboxName} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				messages: [],
				nbMsg: 0,
				pageNo: 0,
				nbPage: 0,

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
				onItemClick: function(ev) {
					// $(this).closest('tbody').find('tr').removeClass('w3-blue')
					// $(this).addClass('w3-blue')
					const item = $(this).closest('tr').data('item')
					$pager.pushPage('messagePage', {
						title: `Message #${item.seqno}`,
						props: {
							currentAccount,
							mailboxName,
							item							
						}

					})
				},
				onMainCheckBoxClick: function(ev) {
					elt.bnFind('.check').prop('checked', $(this).prop('checked'))
				}
			}
		})

		function load(pageNo) {

			srvMail.openMailbox(currentAccount, mailboxName, pageNo).then((data) => {
				console.log('data', data)
				const {messages, nbMsg} = data
				ctrl.setData({
					pageNo,
					nbPage: Math.ceil(nbMsg / 20),
					nbMsg,
					messages: messages.reverse()
				})
			})			
		}

		load(1)


		this.onAction = function(action) {
			console.log('onAction', action)
			const {nbPage, pageNo} = ctrl.model

			if (action == 'next' && pageNo < nbPage) {
				load(pageNo + 1)
			}
			if (action == 'prev' && pageNo > 1) {
				load(pageNo - 1)
			}

		}
	}


});




