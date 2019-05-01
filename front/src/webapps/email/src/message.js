$$.control.registerControl('messagePage', {

	template: {gulp_inject: './message.html'},

	deps: ['breizbot.mails'],

	props: {
		$pager: null,
		currentAccount: '',
		mailboxName: '',
		item: null
	},

	init: function(elt, srvMail) {

		const {$pager, currentAccount, mailboxName, partID, item} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				text: '',
				item,
				attachments: [],
				canOpen: function(info) {
					return info.type == 'image' && info.encoding.toUpperCase() == 'BASE64'
				},
				getSize: function(size) {
					//console.log('getSize', size)
					size /= 1024
					let unit = 'Ko'
					if (size > 1024) {
						size /= 1024
						unit = 'Mo'
					}

					return ` (${size.toFixed(1)} ${unit})`
				}
			},
			events: {
				onItemClick: function(ev) {
					ev.preventDefault()
					const info = $(this).data('item')
					console.log('onItemClick', info)
					$pager.pushPage('imagePage', {
						title: info.name,
						props: {
							fileName: info.name,
							info,
							currentAccount,
							mailboxName,
							seqno: item.seqno
						},
						buttons: [{name: 'save', label: 'Save'}]
					})
				},
				onAttachClick: function(ev) {
					console.log('onAttachClick')
					const $i = $(this).find('i')
					const $ul = $(this).siblings('ul')
					if ($i.hasClass('fa-caret-right')) {
						$i.removeClass('fa-caret-right').addClass('fa-caret-down')
						$ul.slideDown()
					}
					else {
						$i.removeClass('fa-caret-down').addClass('fa-caret-right')						
						$ul.slideUp()
					}
				}
			}
		})

		srvMail.openMessage(currentAccount, mailboxName, item.seqno, item.partID).then((message) => {
			console.log('message', message)

			//const {text, attachments} = message

			ctrl.setData(message)

		})


	}


});




