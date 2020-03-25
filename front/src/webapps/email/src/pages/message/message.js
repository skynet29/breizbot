$$.control.registerControl('messagePage', {

	template: {gulp_inject: './message.html'},

	deps: ['app.mails', 'breizbot.scheduler', 'breizbot.pager', 'breizbot.files'],

	props: {
		currentAccount: '',
		mailboxName: '',
		item: null
	},

	buttons: {
		reply: {icon: 'fa fa-reply', title: 'Reply'},
		replyAll: {icon: 'fa fa-reply-all', title: 'Reply All'},
		forward: {icon: 'fa fa-share-square', title: 'Forward'}
	},	

	init: function(elt, srvMail, scheduler, pager, srvFiles) {

		const {currentAccount, mailboxName, item} = this.props


		const waitDlg = $$.dialogController({
			title: 'Loading ...',
			template: `<div class="w3-center w3-padding-16"><i class="fa fa-redo-alt fa-2x fa-pulse w3-text-blue"></i></div>`,
			width: 100,
			canClose: false
		})


		const ctrl = $$.viewController(elt, {
			data: {
				embeddedImages: [],
				isHtml: false,
				loading: true,
				text: '',
				item,
				attachments: [],
				show1: function() {
					return this.item.to.length > 0
				},
				show2: function() {
					return this.attachments.length > 0
				},
				show3: function() {
					return this.embeddedImages.length > 0
				},
				show4: function() {
					return !this.loading && this.isHtml
				},
				show5: function() {
					return !this.loading && !this.isHtml
				},
				getSize: function(scope) {
					let size = scope.$i.size
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
				openAttachment: function(ev) {
					ev.preventDefault()
					const idx = $(this).closest('li').index()
					const info = ctrl.model.attachments[idx]
					const {partID, type, subtype} = info

					console.log('openAttachments', info)

					if (info.canOpen) {
						waitDlg.show()
						srvMail.openAttachment(currentAccount, mailboxName, item.seqno, partID).then((message) => {
							//console.log('message', message)
							waitDlg.hide()
							const url = `data:${type}/${subtype};base64,` + message.data
							pager.pushPage('breizbot.viewer', {
								title: info.name,
								props: {
									type: $$.util.getFileType(info.name),
									url	
								},
								buttons: {
									save: {
										title: 'Save',
										icon: 'fa fa-save',
										onClick: function() {
											const blob = $$.util.dataURLtoBlob(url)
											srvFiles.uploadFile(blob, info.name, '/apps/email').then(function(resp) {
												console.log('resp', resp)
												pager.popPage()
											})	
											.catch(function(resp) {
												$$.ui.showAlert({
													title: 'Error',
													content: resp.responseText
												})
											})													
										}
									}
								},	
							
							})		
					
						})								
					}
					else {
						$$.ui.showConfirm({
							title: 'Open Attachment', 
							okText: 'Yes',
							cancelText: 'No',
							content: `This attachment cannot be open with NetOS<br>
								Do you want to download it ?`
							},
							function() {
								console.log('OK')
								waitDlg.show()
								srvMail.openAttachment(currentAccount, mailboxName, item.seqno, partID).then((message) => {
									//console.log('message', message)
									waitDlg.hide()
									const url = `data:${type}/${subtype};base64,` + message.data
									$$.util.downloadUrl(url, info.name)

								})

							}
						)
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
					$iframe.find('a')
					.attr('target', '_blank')
					.on('click', function(ev) {
						const href = $(this).attr('href')
						if (href.startsWith('https://youtu.be/')) {
							ev.preventDefault()
							scheduler.openApp('youtube', {url: href})
						}
					})

				},
				onAddContact: function(ev) {
					console.log('onAddContact')
					ev.preventDefault()
					const idx = $(this).closest('li').index()
					const from = ctrl.model.item.to[idx]
					pager.pushPage('addContactPage', {
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

			attachments.forEach((a) => {
				a.canOpen = $$.util.getFileType(a.name) != undefined && a.encoding.toUpperCase() == 'BASE64'

			})


			ctrl.setData({text, attachments, embeddedImages, loading:false, isHtml})

		})

		function replyMessage(text, to) {
			//console.log('replyMessage', text)
			pager.pushPage('writeMailPage', {
				title: 'Reply message',
				props: {
					accountName: currentAccount,
					data: {
						to,
						subject: 'Re: ' + item.subject,
						html: `<pre>${text}</pre>`
					}
				}
			})			
		}

		function forwardMessage(text) {
			//console.log('replyMessage', text)
			pager.pushPage('writeMailPage', {
				title: 'Forward message',
				props: {
					accountName: currentAccount,
					data: {
						subject: 'Fwd: ' + item.subject,
						html: `<pre>${text}</pre>`
					}
				}
			})			
		}

		this.onAction = function(action) {
			console.log('onAction', action, item)

			if (action == 'reply' || action == 'replyAll') {

				const HEADER = '\n\n----- Original mail -----\n'

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

			if (action == 'forward') {
				const HEADER = '\n\n----- Forwarded mail -----\n'


				if (ctrl.model.isHtml && item.partID.text != false) {
					srvMail.openMessage(currentAccount, mailboxName, item.seqno, item.partID.text).then((message) => {
						forwardMessage(HEADER + message.text)
					})						
				}

				else if (!ctrl.model.isHtml) {
					forwardMessage(HEADER + ctrl.model.text)
				}
				else {
					forwardMessage('')
				}

			}
		}


	}


});




