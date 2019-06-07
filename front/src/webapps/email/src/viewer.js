$$.control.registerControl('viewerPage', {

	template: {gulp_inject: './viewer.html'},

	deps: ['breizbot.mails'],

	props: {
		$pager: null,
		info: '',
		currentAccount: '',
		mailboxName: '',
		seqno: ''
	},

	buttons: [
		{name: 'save', icon: 'fa fa-save'}
	],	

	init: function(elt, srvMail) {

		const {$pager, info, currentAccount, mailboxName, seqno} = this.props
		const {partID, type, subtype} = info

		const ctrl = $$.viewController(elt, {
			data: {
				url: '',
				wait: true,
				type: $$.util.getFileType(info.name)
			},
			events: {
			}
		})

		srvMail.openAttachment(currentAccount, mailboxName, seqno, partID).then((message) => {
			//console.log('message', message)
			const url = `data:${type}/${subtype};base64,` + message.data
			ctrl.setData({wait:false, url})

		})

		this.onAction = function(action) {
			console.log('onAction', action)
			if (action == 'save') {
				ctrl.scope.viewer.save('/download/email', info.name, () => {
					$pager.popPage()
				})
			}
		}
	}


});











