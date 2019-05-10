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

		const {$pager, currentAccount, mailboxName, item} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				embeddedImages: [],
				isHtml: false,
				loading: true,
				text: '',
				item,
				attachments: [],
				canOpen: function(info) {
					return (info.type == 'image' || info.subtype == 'pdf') && info.encoding.toUpperCase() == 'BASE64'
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
					const props = {
						info,
						currentAccount,
						mailboxName,
						seqno: item.seqno
					}
					if (info.type == 'image') {
						$pager.pushPage('imagePage', {
							title: info.name,
							props,
							buttons: [
								{name: 'save', icon: 'fa fa-save'},
								{name: 'fit', icon: 'fa fa-expand'}
							]
						})						
					}
					if (info.subtype == 'pdf') {
						$pager.pushPage('pdfPage', {
							title: info.name,
							props,
							buttons: [
								{name: 'save', icon: 'fa fa-save'}
							]
						})						
					}

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
				},
				onEmbeddedImages: function(ev) {
					ev.preventDefault()
					//ctrl.setData({embeddedImages: []})
					const $iframe = $(ctrl.scope.iframe.get(0).contentWindow.document)

					const {embeddedImages} = ctrl.model
					ctrl.setData({embeddedImages: []})

					embeddedImages.forEach((e) => {
						const {type, subtype, partID, cid} = e
						srvMail.openAttachment(currentAccount, mailboxName, item.seqno, partID).then((message) => {
							const url = `data:${type}/${subtype};base64,` + message.data
							const $img = $iframe.find(`img[src="cid:${cid}"]`)
							$img.attr('src', url)

						})					

					})

				}
			}
		})

		let partID = item.partID.html
		let isHtml = true
		if (partID == false) {
			partID = item.partID.text
			isHtml = false
		}
		console.log('isHtml', isHtml)


		srvMail.openMessage(currentAccount, mailboxName, item.seqno, partID).then((message) => {
			console.log('message', message)


			const {text, attachments, embeddedImages} = message


			ctrl.setData({text, attachments, embeddedImages, loading:false, isHtml})

		})

		function replyMessage(text) {
			console.log('replyMessage', text)
			$pager.pushPage('writeMailPage', {
				title: 'Reply message',
				props: {
					accountName: currentAccount,
					data: {
						to: item.from.email,
						subject: 'Re: ' + item.subject,
						text
					}
				},
				buttons: [
					{name: 'send', icon: 'fa fa-paper-plane'}
				]
			})			
		}

		this.onAction = function(action) {
			console.log('onAction', action)
			const HEADER = '\n\n----- Original mail -----\n'

			if (action == 'reply') {

				if (ctrl.model.isHtml && item.partID.text != false) {
					srvMail.openMessage(currentAccount, mailboxName, item.seqno, item.partID.text).then((message) => {
						replyMessage(HEADER + message.text)
					})						
				}

				else if (!ctrl.model.isHtml) {
					replyMessage(HEADER + ctrl.model.text)
				}
				else {
					replyMessage('')
				}


			}
		}


	}


});




