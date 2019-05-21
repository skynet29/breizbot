$$.control.registerControl('messagePage', {

	template: {gulp_inject: './message.html'},

	deps: ['breizbot.mails', 'breizbot.users'],

	props: {
		$pager: null,
		currentAccount: '',
		mailboxName: '',
		item: null
	},

	buttons: [
		{name: 'reply', icon: 'fa fa-reply'},
		{name: 'replyAll', icon: 'fa fa-reply-all'}
	],	

	init: function(elt, srvMail, users) {

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
					return (info.type == 'image' || info.subtype == 'pdf' || info.name.endsWith('.pdf')) && info.encoding.toUpperCase() == 'BASE64'
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
							props
						})						
					}
					if (info.subtype == 'pdf' || info.name.endsWith('.pdf')) {
						$pager.pushPage('pdfPage', {
							title: info.name,
							props
						})						
					}

				},
				onToggleDiv: function(ev) {
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

				},
				onFrameLoaded: function(ev) {
					console.log('onFrameLoaded')
					const $iframe = $(this.contentWindow.document)
					$iframe.find('a').attr('target', '_blank')

				},
				onAddContact: function(ev) {
					console.log('onAddContact')
					ev.preventDefault()
					const from = $(this).data('addr')
					$pager.pushPage('addContactPage', {
						title: 'Add Contact',
						props: {
							from
						}
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

		function replyMessage(text, to) {
			//console.log('replyMessage', text)
			$pager.pushPage('writeMailPage', {
				title: 'Reply message',
				props: {
					accountName: currentAccount,
					data: {
						to,
						subject: 'Re: ' + item.subject,
						text
					}
				}
			})			
		}

		this.onAction = function(action) {
			console.log('onAction', action, item)
			const HEADER = '\n\n----- Original mail -----\n'

			if (action == 'reply' || action == 'replyAll') {

				let to = item.from.email

				if (action == 'replyAll' && item.to.length > 0) {					
					to += ',' + item.to.map((a) => a.email).join(',')
				}

				if (ctrl.model.isHtml && item.partID.text != false) {
					srvMail.openMessage(currentAccount, mailboxName, item.seqno, item.partID.text).then((message) => {
						replyMessage(HEADER + message.text, to)
					})						
				}

				else if (!ctrl.model.isHtml) {
					replyMessage(HEADER + ctrl.model.text, to)
				}
				else {
					replyMessage('', to)
				}


			}
		}


	}


});




