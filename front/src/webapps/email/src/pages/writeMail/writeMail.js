//@ts-check
$$.control.registerControl('writeMailPage', {

	template: { gulp_inject: './writeMail.html' },

	deps: ['app.mails', 'breizbot.pager'],

	props: {
		accountName: '',
		data: {}
	},

	/**
	 * 
	 * @param {AppEmail.Interface} srvMail 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 */
	init: function (elt, srvMail, pager) {

		const { accountName, data } = this.props
		console.log('data', data)

		const ctrl = $$.viewController(elt, {
			data: {
				data,
				attachments: [],
				show1: function () { return this.attachments.length > 0 },
				prop1: function () { return { autofocus: this.data.html == undefined } }
			},
			events: {
				onKeyPress: function (ev) {
					//console.log('onKeyPress', ev.which)
					if (ev.which == '13') {
						ev.preventDefault()
					}
				},
				onSend: async function (ev) {
					console.log('onSend')
					ev.preventDefault()
					const data = $(this).getFormData()
					console.log('data', data)
					const { attachments } = ctrl.model
					data.attachments = attachments.map((fileName) => {
						return { path: fileName }
					})

					const $html = $('<div>').append(data.html)
					$html.find('img').each(function () {
						const src = $(this).attr('src')
						const urlParams = src.split('?')[1]
						const { fileName } = $$.url.parseUrlParams(urlParams)
						//console.log('fileName', fileName)
						const cid = 'IMG' + Date.now()
						data.attachments.push({
							path: fileName,
							cid
						})
						$(this).attr('src', 'cid:' + cid)
					})

					data.html = $html.html()


					//console.log('html', data)

					try {
						await srvMail.sendMail(accountName, data)
						pager.popPage()
					}
					catch (e) {
						$$.ui.showAlert({ title: 'Error', content: e.responseText })
					}

				},
				openContact: function () {
					console.log('openContact')
					pager.pushPage('breizbot.contacts', {
						title: 'Select a contact',
						props: {
							showSelection: true
						},
						buttons: {
							ok: {
								title: 'Apply',
								icon: 'fa fa-check',
								onClick: function () {
									pager.popPage(this.getSelection())

								}
							}
						},
						onReturn: function (friends) {
							const contacts = friends.map((a) => a.email)
							console.log('contacts', contacts)
							const to = ctrl.scope.to.val()
							console.log('to', to)

							if (to != '') {
								contacts.unshift(to)
							}
							ctrl.setData({ data: { to: contacts.join(',') } })
						}
					})
				},
				onRemoveAttachment: function (ev) {
					const idx = $(this).closest('li').index()
					console.log('onRemoveAttachment', idx)
					ctrl.model.attachments.splice(idx, 1)
					ctrl.update()

				}
			}

		})

		if (data.html != undefined) {
			ctrl.scope.content.focus()
		}

		this.getButtons = function () {
			return {
				attachment: {
					icon: 'fa fa-paperclip',
					title: 'Add attachment',
					onClick: function () {
						pager.pushPage('breizbot.files', {
							title: 'Select a file to attach',
							/**@type {Breizbot.Controls.Files.Props} */				
							props: {
								selectionEnabled: true,
								folderSelectionEnabled: false
							},
							onReturn: function (fileNames) {
								console.log('data', data)
								ctrl.model.attachments = ctrl.model.attachments.concat(fileNames)
								ctrl.update()
							},
							buttons: {
								apply: {
									icon: 'fa fa-check',
									title: 'Apply',
									onClick: function() {
										console.log('onApply')
										pager.popPage(this.getSelFileNames())
									}	
								}
							}
						})

					}
				},
				send: {
					icon: 'fa fa-paper-plane',
					title: 'Send Message',
					onClick: function () {
						ctrl.scope.submit.click()
					}
				}
			}
		}

	}
})