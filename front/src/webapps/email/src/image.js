$$.control.registerControl('imagePage', {

	template: {gulp_inject: './image.html'},

	deps: ['breizbot.mails', 'breizbot.files'],

	props: {
		$pager: null,
		info: '',
		currentAccount: '',
		mailboxName: '',
		seqno: ''
	},

	buttons: [
		{name: 'save', icon: 'fa fa-save'},
		{name: 'fit', icon: 'fa fa-expand'}
	],	

	init: function(elt, srvMail, files) {

		const {$pager, info, currentAccount, mailboxName, seqno} = this.props
		const {partID, type, subtype} = info

		const ctrl = $$.viewController(elt, {
			data: {
				url: '',
				wait: true
			},
			events: {
			}
		})

		srvMail.openAttachment(currentAccount, mailboxName, seqno, partID).then((message) => {
			//console.log('message', message)
			const url = `data:${type}/${subtype};base64,` + message.data
			ctrl.setData({url, wait:false})

		})

		function save() {
			const {url} = ctrl.model
			if (url == '') {
				$$.ui.showAlert({title: 'Error', content: 'Image not loaded, please wait'})
				return
			}
			const blob = $$.util.dataURLtoBlob(url)
			files.uploadFile(blob, info.name, '/images/email').then(function(resp) {
				console.log('resp', resp)
				$pager.popPage()
			})	
			.catch(function(resp) {
				$$.ui.showAlert({
					title: 'Error',
					content: resp.responseText
				})
			})				
		}

		this.onAction = function(action) {
			//console.log('onAction', action)
			if (action == 'save') {
				save()
			}
			if (action == 'fit') {
				ctrl.scope.image.fitImage()
			}
		}
	}


});




