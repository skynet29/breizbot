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

		srvMail.openMailbox(currentAccount, mailboxName).then((data) => {
			console.log('data', data)
			const {messages, nbMsg} = data
			ctrl.setData({
				nbMsg,
				messages: messages.reverse()
			})
		})


	}


});




