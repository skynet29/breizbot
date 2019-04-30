$$.control.registerControl('imagePage', {

	template: {gulp_inject: './image.html'},

	deps: ['breizbot.mails'],

	props: {
		$pager: null,
		info: '',
		name: '',
		mailboxName: '',
		seqno: ''
	},

	init: function(elt, srvMail) {

		const {$pager, info, name, mailboxName, seqno} = this.props
		const {partID, type, subtype} = info

		const ctrl = $$.viewController(elt, {
			data: {
				url: '',
				wait: true
			},
			events: {
			}
		})

		srvMail.openAttachment(name, mailboxName, seqno, partID).then((message) => {
			//console.log('message', message)
			const url = `data:${type}/${subtype};base64,` + message.data
			ctrl.setData({url, wait:false})

		})


	}


});




