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

		const {$pager, name, mailboxName, item} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				text: '',
				item
			},
			events: {
			}
		})

		srvMail.openMessage(name, mailboxName, item.seqno, item.info).then((message) => {
			console.log('message', message)

			let text = message.text

			// text = text.split('\n').filter((line) => {
			// 	let ret = line.toUpperCase().includes('CONTENT-TYPE:')
			// 	ret |= line.toUpperCase().includes('CONTENT-TRANSFER-ENCODING:')
			// 	return !ret
			// }).join('\n')

			ctrl.setData({text})
		})


	}


});




