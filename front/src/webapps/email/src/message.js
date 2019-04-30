$$.control.registerControl('messagePage', {

	template: {gulp_inject: './message.html'},

	deps: ['breizbot.mails'],

	props: {
		$pager: null,
		name: '',
		mailboxName: '',
		item: null
	},

	init: function(elt, srvMail) {

		const {$pager, name, mailboxName, partID, item} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				text: '',
				item,
				attachments: [],
				canOpen: function(info) {
					return info.type == 'image' && info.encoding == 'BASE64'
				},
				getSize: function(size) {
					console.log('getSize', size)
					size /= 1024
					return ` (${size.toFixed(1)} Ko)`
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
							info,
							name,
							mailboxName,
							seqno: item.seqno
						}
					})
				}
			}
		})

		srvMail.openMessage(name, mailboxName, item.seqno, item.partID).then((message) => {
			console.log('message', message)

			//const {text, attachments} = message

			ctrl.setData(message)
		})


	}


});




