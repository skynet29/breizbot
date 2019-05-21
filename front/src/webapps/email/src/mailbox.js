$$.control.registerControl('mailboxPage', {

	template: {gulp_inject: './mailbox.html'},

	deps: ['breizbot.mails'],

	props: {
		$pager: null,
		currentAccount: '',
		mailboxName: ''
	},

	buttons: [
		{name: 'reload', icon: 'fa fa-redo'},
		{name: 'newMail', icon: 'fa fa-envelope'},
		{name: 'move', icon: 'fa fa-file-export'},
		{name: 'delete', icon: 'fa fa-trash'}
	
	],	

	init: function(elt, srvMail) {

		const {$pager, currentAccount, mailboxName} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				messages: [],
				nbMsg: 0,
				pageNo: 0,
				nbPage: 0,
				check: false,
				loading: false,


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
						title: `Message #${ctrl.model.nbMsg - item.seqno + 1}`,
						props: {
							currentAccount,
							mailboxName,
							item							
						}
					})
				},

				onMainCheckBoxClick: function(ev) {
					elt.find('.check').prop('checked', $(this).prop('checked'))
				},

				onPrevPage: function(ev) {
					const {nbPage, pageNo} = ctrl.model

					if (pageNo > 1) {
						load(pageNo - 1)
					}					
				},

				onNextPage: function(ev) {
					const {nbPage, pageNo} = ctrl.model

					if (pageNo < nbPage) {
						load(pageNo + 1)
					}				
				}				
			}
		})

		function load(pageNo) {
			if (pageNo == undefined) {
				pageNo = ctrl.model.pageNo
			}

			ctrl.setData({loading: true})

			srvMail.openMailbox(currentAccount, mailboxName, pageNo).then((data) => {
				console.log('data', data)
				const {messages, nbMsg} = data
				ctrl.setData({
					loading: false,
					check: false,
					pageNo,
					nbPage: Math.ceil(nbMsg / 20),
					nbMsg,
					messages: messages.reverse()
				})
			})			
		}

		function deleteMessage() {
			const items = elt.find('.check:checked')
			console.log('deleteMessage', items.length)
			if (items.length == 0) {
				$$.ui.showAlert({title: 'Delete Message', content: 'Please select one or severall messages !'})
				return
			}
			const seqNos = []
			items.each(function() {
				const data = $(this).closest('tr').data('item')
				seqNos.push(data.seqno)
			})
			console.log('seqNos', seqNos)
			srvMail.deleteMessage(currentAccount, mailboxName, seqNos).then(() => {
				console.log('Messages deleted')
				load()
			})
		}

		function moveMessage() {
			const items = elt.find('.check:checked')
			console.log('deleteMessage', items.length)
			if (items.length == 0) {
				$$.ui.showAlert({title: 'Move Message', content: 'Please select one or severall messages !'})
				return
			}
			const seqNos = []
			items.each(function() {
				const data = $(this).closest('tr').data('item')
				seqNos.push(data.seqno)
			})
			console.log('seqNos', seqNos)
			$pager.pushPage('boxesPage', {
				title: 'Select target mailbox',
				props: {
					currentAccount,
					mailboxName,
					seqNos
				}
			})
			// srvMail.deleteMessage(currentAccount, mailboxName, seqNos).then(() => {
			// 	console.log('Messages deleted')
			// 	load()
			// })
		}		

		load(1)

		function newMessage() {
			$pager.pushPage('writeMailPage', {
				title: 'New Message',
				props: {
					accountName: currentAccount
				}
			})			
		}


		this.onAction = function(action) {
			console.log('onAction', action)
			if (action == 'reload') {
				load(1)
			}

			if (action == 'delete') {
				deleteMessage()
			}

			if (action == 'move') {
				moveMessage()
			}

			if (action == 'newMail') {
				newMessage()
			}			
		}


		this.onReturn = function(data) {
			console.log('onReturn', data)
			load()
		}
	}


});




