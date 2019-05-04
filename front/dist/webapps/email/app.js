$$.control.registerControl('accountPage', {

	template: "<div class=\"main\">\n	<form bn-event=\"submit: onSubmit\">\n\n		<div bn-control=\"brainjs.inputgroup\">\n			<label>Account Name</label>\n			<input type=\"text\" name=\"name\" required=\"\" autofocus=\"\">			\n		</div>\n\n		<div bn-control=\"brainjs.inputgroup\">\n			<label>User</label>\n			<input type=\"text\" name=\"user\" required=\"\">			\n		</div>\n\n		<div bn-control=\"brainjs.inputgroup\">\n			<label>Password</label>\n			<input type=\"password\" name=\"pwd\" required=\"\">			\n		</div>\n\n		<div bn-control=\"brainjs.inputgroup\">\n			<label>Email</label>\n			<input type=\"email\" name=\"email\" required=\"\">			\n		</div>\n\n		<div bn-control=\"brainjs.inputgroup\">\n			<label>Imap Server</label>\n			<input type=\"text\" name=\"imapHost\" required=\"\">			\n		</div>		\n\n		<div bn-control=\"brainjs.inputgroup\">\n			<label>SMTP Server</label>\n			<input type=\"text\" name=\"smtpHost\" required=\"\">			\n		</div>		\n\n		<input type=\"submit\" hidden=\"\" bn-bind=\"submit\">\n	</form>\n\n</div>",

	deps: ['breizbot.mails'],

	props: {
		$pager: null
	},

	init: function(elt, srvMail) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
			},
			events: {
				onSubmit: function(ev) {
					ev.preventDefault()
					const data = $(this).getFormData()
					srvMail.createMailAccount(data).then(() => {
						$pager.popPage('update')
					})
				}
			}
		})

		this.onAction = function(cmd) {
			ctrl.scope.submit.click()
		}

	}


});





$$.control.registerControl('boxesPage', {

	template: "<div class=\"scrollPanelTree\">\n	<div \n		class=\"tree\" \n		bn-control=\"brainjs.tree\"\n		bn-data=\"{source: mailboxes}\"\n		bn-iface=\"tree\"\n	></div>\n</div>\n\n\n",

	deps: ['breizbot.mails'],

	props: {
		$pager: null,
		currentAccount: '',
		mailboxName: '',
		seqNos: []
	},

	init: function(elt, srvMail) {

		const {$pager, currentAccount, mailboxName, seqNos} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				mailboxes: []
			},
			events: {
			}
		})


		function loadMailboxes() {
			console.log('loadMailboxes')
			srvMail.getMailboxes(currentAccount).then((mailboxes) => {
				console.log('mailboxes', mailboxes)
				ctrl.setData({
					mailboxes
				})
			})
		}

		loadMailboxes()


		this.onAction = function(action) {
			console.log('onAction', action)
			if (action == 'apply') {
				const {tree} = ctrl.scope
				const node = tree.getActiveNode()
				if (node == null) {
					$$.ui.showAlert({title: 'Select Target Mailbox', content: 'Please select a target mailbox'})
					return
				}
				const targetName = tree.getNodePath(node)
				if (targetName == mailboxName) {
					$$.ui.showAlert({title: 'Select Target Mailbox', content: 'Please select a target mailbox different from current mailbox'})
					return
				}

				srvMail.moveMessage(currentAccount, mailboxName, targetName, seqNos).then(() => {
					$pager.popPage()
				})
				
			}
		}

	}


});





$$.control.registerControl('imagePage', {

	template: "<div style=\"height: 100%; position: relative; text-align: center;\">\n	<span bn-show=\"wait\" class=\"w3-text-blue\" style=\"position: relative; top: 50%;\"><i class=\"fa fa-redo-alt fa-2x fa-pulse\"></i></span>\n\n	<div bn-show=\"!wait\" bn-control=\"brainjs.image\" bn-data=\"{src: url}\" style=\"height: 100%\" bn-iface=\"image\"></div>	\n</div>\n",

	deps: ['breizbot.mails', 'breizbot.files'],

	props: {
		$pager: null,
		info: '',
		currentAccount: '',
		mailboxName: '',
		seqno: '',
		fileName: ''
	},

	init: function(elt, srvMail, files) {

		const {$pager, info, currentAccount, mailboxName, seqno, fileName} = this.props
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
			files.uploadFile(blob, fileName, '/images/email').then(function(resp) {
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





$$.control.registerControl('mailboxPage', {

	template: "<div class=\"toolbar\">\n	<div>\n		<div bn-show=\"nbMsg > 0\">\n			<span >Page: <span bn-text=\"`${pageNo} / ${nbPage}`\"></span></span>\n			<button class=\"w3-button\" title=\"previous page\" bn-event=\"click: onPrevPage\">\n				<i class=\"fa fa-angle-left\"></i>\n			</button>			\n			<button class=\"w3-button\" title=\"next page\" bn-event=\"click: onNextPage\">\n				<i class=\"fa fa-angle-right\"></i>\n			</button>			\n		</div>\n	</div>\n	<div class=\"nbMsg\"><strong bn-text=\"nbMsg\"></strong>&nbsp;Messages</div>		\n</div>\n\n<div class=\"scrollPanelTable\">\n	<table class=\"w3-table-all w3-hoverable w3-small\">\n		<thead>\n			<tr class=\"w3-green\">\n				<th><input type=\"checkbox\" bn-event=\"click: onMainCheckBoxClick\"></th>\n				<th>From</th>\n				<th>Subject</th>\n				<th title=\"nb Attachments\"><i class=\"fa fa-paperclip\"></i></th>\n				<th>Date</th>\n			</tr>\n		</thead>\n		<tbody bn-each=\"messages\" bn-event=\"click.item: onItemClick\">\n			<tr bn-data=\"{item: $i}\" bn-class=\"{unseen: !isSeen($i.flags)}\">\n				<th><input type=\"checkbox\" class=\"check\" ></th>\n				<td bn-text=\"$i.from.name\" bn-attr=\"{title: $i.from.email}\"></td>\n				<td bn-text=\"$i.subject\" class=\"item\" ></td>\n				<td bn-text=\"$i.nbAttachments\"></td>\n				<td bn-text=\"getDate($i.date)\"></td>\n			</tr>\n		</tbody>\n	</table>\n</div>\n\n\n",

	deps: ['breizbot.mails'],

	props: {
		$pager: null,
		currentAccount: '',
		mailboxName: ''
	},

	init: function(elt, srvMail) {

		const {$pager, currentAccount, mailboxName} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				messages: [],
				nbMsg: 0,
				pageNo: 0,
				nbPage: 0,

				getDate: function(date) {
					//console.log('getDate', date)
					const d = new Date(date)
					//console.log('d', d)
					return d.toLocaleDateString('fr-FR')
				},

				isSeen: function(flags) {
					return flags.includes('\\Seen')
				}

			},
			events: {
				onItemClick: function(ev) {
					// $(this).closest('tbody').find('tr').removeClass('w3-blue')
					// $(this).addClass('w3-blue')
					const item = $(this).closest('tr').data('item')
					$pager.pushPage('messagePage', {
						title: `Message #${item.seqno}`,
						props: {
							currentAccount,
							mailboxName,
							item							
						},
						buttons: [
							{name: 'reply', icon: 'fa fa-reply'}
						]

					})
				},

				onMainCheckBoxClick: function(ev) {
					elt.find('.check').prop('checked', $(this).prop('checked'))
				},

				onPrevPage: function(ev) {
					const {nbPage, pageNo} = ctrl.model

					if (pageNo > 1) {
						load(pageNo - 1)
					}					
				},

				onNextPage: function(ev) {
					const {nbPage, pageNo} = ctrl.model

					if (pageNo < nbPage) {
						load(pageNo + 1)
					}				
				}				
			}
		})

		function load(pageNo) {
			if (pageNo == undefined) {
				pageNo = ctrl.model.pageNo
			}

			srvMail.openMailbox(currentAccount, mailboxName, pageNo).then((data) => {
				console.log('data', data)
				const {messages, nbMsg} = data
				ctrl.setData({
					pageNo,
					nbPage: Math.ceil(nbMsg / 20),
					nbMsg,
					messages: messages.reverse()
				})
			})			
		}

		function deleteMessage() {
			const items = elt.find('.check:checked')
			console.log('deleteMessage', items.length)
			if (items.length == 0) {
				$$.ui.showAlert({title: 'Delete Message', content: 'Please select one or severall messages !'})
				return
			}
			const seqNos = []
			items.each(function() {
				const data = $(this).closest('tr').data('item')
				seqNos.push(data.seqno)
			})
			console.log('seqNos', seqNos)
			srvMail.deleteMessage(currentAccount, mailboxName, seqNos).then(() => {
				console.log('Messages deleted')
				load()
			})
		}

		function moveMessage() {
			const items = elt.find('.check:checked')
			console.log('deleteMessage', items.length)
			if (items.length == 0) {
				$$.ui.showAlert({title: 'Move Message', content: 'Please select one or severall messages !'})
				return
			}
			const seqNos = []
			items.each(function() {
				const data = $(this).closest('tr').data('item')
				seqNos.push(data.seqno)
			})
			console.log('seqNos', seqNos)
			$pager.pushPage('boxesPage', {
				title: 'Select target mailbox',
				props: {
					currentAccount,
					mailboxName,
					seqNos
				},
				buttons: [
					{name: 'apply', icon: 'fa fa-check'}
				]
			})
			// srvMail.deleteMessage(currentAccount, mailboxName, seqNos).then(() => {
			// 	console.log('Messages deleted')
			// 	load()
			// })
		}		

		load(1)


		this.onAction = function(action) {
			console.log('onAction', action)
			if (action == 'reload') {
				load(1)
			}

			if (action == 'delete') {
				deleteMessage()
			}

			if (action == 'move') {
				moveMessage()
			}			
		}


		this.onReturn = function(data) {
			console.log('onReturn', data)
			load()
		}
	}


});





$$.control.registerControl('rootPage', {

	template: "<div class=\"toolbar\">\n	<div class=\"info\">\n		<p bn-show=\"accounts.length == 0\">You have no email account</p>\n		<p bn-show=\"accounts.length > 0\">Account: \n			<select bn-control=\"brainjs.selectmenu\" bn-each=\"accounts\" bn-val=\"currentAccount\"\n				bn-event=\"selectmenuchange: onAccountChange\">\n				<option bn-text=\"$i\"></option>\n			</select>\n		</p>\n		\n	</div>\n	<div>\n		<button \n			class=\"w3-btn w3-blue\" \n			title=\"Create account\"\n			bn-event=\"click: onCreateAccount\"\n		>\n			<i class=\"fa fa-plus\"></i>\n		</button>\n\n		<button \n			class=\"w3-btn w3-blue\" \n			title=\"New email\"\n			bn-event=\"click: onNewEmail\"\n			bn-show=\"accounts.length > 0\"\n		>\n			<i class=\"fa fa-envelope\"></i>\n		</button>\n		\n	</div>\n	\n</div>\n\n<div class=\"scrollPanelTree\">\n	<div \n		class=\"tree\" \n		bn-control=\"brainjs.tree\"\n		bn-data=\"{source: mailboxes}\"\n		bn-event=\"treeactivate: onTreeActivate\"\n		bn-iface=\"tree\"\n	></div>\n</div>\n\n\n",

	deps: ['breizbot.mails'],

	props: {
		$pager: null
	},

	init: function(elt, srvMail) {

		const {$pager} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				accounts: [],
				currentAccount: '',
				mailboxes: [],
			},
			events: {
				onCreateAccount: function() {
					console.log('onCreateAccount')
					$pager.pushPage('accountPage', {
						title: 'Create Mail Account',
						buttons: [{name: 'create', icon: 'fa fa-check'}]
					})
				},
				onAccountChange: function() {
					console.log('onAccountChange', $(this).val())
				},

				onTreeActivate: function() {
					console.log('onTreeActivate')
					const tree = $(this).iface()

					const node =  tree.getActiveNode()

					const mailboxName = tree.getNodePath(node)					
					console.log('mailboxName', mailboxName)
					const {currentAccount} = ctrl.model
					$pager.pushPage('mailboxPage', {
						title: node.title,
						props: {
							currentAccount,
							mailboxName
						},
						buttons: [
							{name: 'reload', icon: 'fa fa-redo'},
							{name: 'move', icon: 'fa fa-file-export'},
							{name: 'delete', icon: 'fa fa-trash'}
						
						]
					})
				},

				onNewEmail: function(ev) {
					console.log('onNewEmail')
					$pager.pushPage('writeMailPage', {
						title: 'New message',
						props: {
							accountName: ctrl.model.currentAccount
						},
						buttons: [
							{name: 'send', icon: 'fa fa-paper-plane'}
						]
					})
				}
			}
		})


		function loadAccount() {
			console.log('loadAccount')
			srvMail.getMailAccount().then((accounts) => {
				console.log('accounts', accounts)
				if (accounts.length == 0) {
					return
				}
				const currentAccount = accounts[0]
				console.log('currentAccount', currentAccount)
				ctrl.setData({accounts, currentAccount})
				loadMailboxes()
			})			
		}

		function loadMailboxes() {
			console.log('loadMailboxes')
			const {currentAccount} = ctrl.model
			srvMail.getMailboxes(currentAccount).then((mailboxes) => {
				console.log('mailboxes', mailboxes)
				ctrl.setData({
					mailboxes
				})
			})
		}

		loadAccount()

		this.onReturn = function(data) {
			console.log('onReturn', data)
			if (data == 'update') {
				loadAccount()
			}
			if (data == undefined) {
				const activeNode = ctrl.scope.tree.getActiveNode()
				if (activeNode != null) {
					activeNode.setActive(false)
				}
			}
		}
	}


});





$$.control.registerControl('messagePage', {

	template: "<div class=\"header w3-blue\">\n	<div><strong>From: </strong><span bn-text=\"item.from.name\"></span></div>\n	<div><strong>Subject: </strong><span bn-text=\"item.subject\"></span></div>\n	<div class=\"attachments\" bn-show=\"attachments.length > 0\">\n		<strong bn-event=\"click: onAttachClick\"><i class=\"fa fa-caret-down\"></i>\n		Attachments</strong>\n		<ul  bn-each=\"attachments\" bn-event=\"click.item: onItemClick\">\n			<li bn-show=\"canOpen($i)\">\n				<a href=\"#\" bn-text=\"$i.name\" class=\"item\" bn-data=\"{item: $i}\"></a>\n				<span bn-text=\"getSize($i.size)\"></span></li>\n			<li bn-show=\"!canOpen($i)\">\n				<span bn-text=\"$i.name\"></span>\n				<span bn-text=\"getSize($i.size)\"></span></li>				\n			</li>\n		</ul>\n	</div>\n	\n</div>\n<div class=\"main\">\n<!-- 	<iframe bn-attr=\"{srcdoc:text}\"></iframe>\n -->\n 	<pre bn-text=\"text\"></pre>\n</div>",

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
						buttons: [
							{name: 'save', icon: 'fa fa-save'},
							{name: 'fit', icon: 'fa fa-expand'}
						]
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

		this.onAction = function(action) {
			console.log('onAction', action)
			if (action == 'reply') {

				$pager.pushPage('writeMailPage', {
					title: 'Reply message',
					props: {
						accountName: currentAccount,
						data: {
							to: item.from.name,
							subject: 'Re: ' + item.subject,
							text: '\n\n----- Original mail -----\n' + ctrl.model.text
						}
					},
					buttons: [
						{name: 'send', icon: 'fa fa-paper-plane'}
					]
				})
			}
		}


	}


});





$$.control.registerControl('writeMailPage', {

	template: "<form bn-event=\"submit: onSend\" bn-form=\"data\">\n	<div class=\"header\">\n		<div bn-control=\"brainjs.inputgroup\">\n			<label>To:</label>\n			<input type=\"email\" name=\"to\" bn-prop=\"{autofocus: data.text == undefined}\" required=\"\">		\n		</div>\n\n		<div bn-control=\"brainjs.inputgroup\">\n			<label>Subject:</label>\n			<input type=\"text\" name=\"subject\" required=\"\">		\n		</div>	\n	</div>\n	<textarea name=\"text\" bn-bind=\"content\"></textarea>	\n	<input type=\"submit\" hidden=\"\" bn-bind=\"submit\">\n</form>\n",

	deps: ['breizbot.mails'],

	props: {
		$pager: null,
		accountName: '',
		data: {}
	},

	init: function(elt, srvMail) {

		const {$pager, accountName, data} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				data
			},
			events: {
				onSend: function(ev) {
					console.log('onSend')
					ev.preventDefault()
					const data = $(this).getFormData()
					srvMail.sendMail(accountName, data).then(() => {
						$pager.popPage()
					})

				}
			}

		})

		if (data.text != undefined) {
			const content = ctrl.scope.content.get(0)
			content.focus()
			content.setSelectionRange(0, 0)
		}		

		this.onAction = function(action) {
			console.log('onAction', action)
			if (action == 'send') {
				ctrl.scope.submit.click()
			}
		}
	}
})
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjY291bnQuanMiLCJib3hlcy5qcyIsImltYWdlLmpzIiwibWFpbGJveC5qcyIsIm1haW4uanMiLCJtZXNzYWdlLmpzIiwid3JpdGVNYWlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYWNjb3VudFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwibWFpblxcXCI+XFxuXHQ8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblN1Ym1pdFxcXCI+XFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHQ8bGFiZWw+QWNjb3VudCBOYW1lPC9sYWJlbD5cXG5cdFx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwibmFtZVxcXCIgcmVxdWlyZWQ9XFxcIlxcXCIgYXV0b2ZvY3VzPVxcXCJcXFwiPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdDxsYWJlbD5Vc2VyPC9sYWJlbD5cXG5cdFx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwidXNlclxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XHRcdFx0XFxuXHRcdDwvZGl2Plxcblxcblx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdFx0PGxhYmVsPlBhc3N3b3JkPC9sYWJlbD5cXG5cdFx0XHQ8aW5wdXQgdHlwZT1cXFwicGFzc3dvcmRcXFwiIG5hbWU9XFxcInB3ZFxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XHRcdFx0XFxuXHRcdDwvZGl2Plxcblxcblx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdFx0PGxhYmVsPkVtYWlsPC9sYWJlbD5cXG5cdFx0XHQ8aW5wdXQgdHlwZT1cXFwiZW1haWxcXFwiIG5hbWU9XFxcImVtYWlsXFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHQ8bGFiZWw+SW1hcCBTZXJ2ZXI8L2xhYmVsPlxcblx0XHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJpbWFwSG9zdFxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XHRcdFx0XFxuXHRcdDwvZGl2Plx0XHRcXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdDxsYWJlbD5TTVRQIFNlcnZlcjwvbGFiZWw+XFxuXHRcdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcInNtdHBIb3N0XFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cdFx0XHRcXG5cdFx0PC9kaXY+XHRcdFxcblxcblx0XHQ8aW5wdXQgdHlwZT1cXFwic3VibWl0XFxcIiBoaWRkZW49XFxcIlxcXCIgYm4tYmluZD1cXFwic3VibWl0XFxcIj5cXG5cdDwvZm9ybT5cXG5cXG48L2Rpdj5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90Lm1haWxzJ10sXG5cblx0cHJvcHM6IHtcblx0XHQkcGFnZXI6IG51bGxcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydk1haWwpIHtcblxuXHRcdGNvbnN0IHskcGFnZXJ9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblN1Ym1pdDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRcdFx0Y29uc3QgZGF0YSA9ICQodGhpcykuZ2V0Rm9ybURhdGEoKVxuXHRcdFx0XHRcdHNydk1haWwuY3JlYXRlTWFpbEFjY291bnQoZGF0YSkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHQkcGFnZXIucG9wUGFnZSgndXBkYXRlJylcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdHRoaXMub25BY3Rpb24gPSBmdW5jdGlvbihjbWQpIHtcblx0XHRcdGN0cmwuc2NvcGUuc3VibWl0LmNsaWNrKClcblx0XHR9XG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYm94ZXNQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsVHJlZVxcXCI+XFxuXHQ8ZGl2IFxcblx0XHRjbGFzcz1cXFwidHJlZVxcXCIgXFxuXHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMudHJlZVxcXCJcXG5cdFx0Ym4tZGF0YT1cXFwie3NvdXJjZTogbWFpbGJveGVzfVxcXCJcXG5cdFx0Ym4taWZhY2U9XFxcInRyZWVcXFwiXFxuXHQ+PC9kaXY+XFxuPC9kaXY+XFxuXFxuXFxuXCIsXG5cblx0ZGVwczogWydicmVpemJvdC5tYWlscyddLFxuXG5cdHByb3BzOiB7XG5cdFx0JHBhZ2VyOiBudWxsLFxuXHRcdGN1cnJlbnRBY2NvdW50OiAnJyxcblx0XHRtYWlsYm94TmFtZTogJycsXG5cdFx0c2VxTm9zOiBbXVxuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgc3J2TWFpbCkge1xuXG5cdFx0Y29uc3QgeyRwYWdlciwgY3VycmVudEFjY291bnQsIG1haWxib3hOYW1lLCBzZXFOb3N9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRtYWlsYm94ZXM6IFtdXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHR9XG5cdFx0fSlcblxuXG5cdFx0ZnVuY3Rpb24gbG9hZE1haWxib3hlcygpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdsb2FkTWFpbGJveGVzJylcblx0XHRcdHNydk1haWwuZ2V0TWFpbGJveGVzKGN1cnJlbnRBY2NvdW50KS50aGVuKChtYWlsYm94ZXMpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ21haWxib3hlcycsIG1haWxib3hlcylcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRtYWlsYm94ZXNcblx0XHRcdFx0fSlcblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0bG9hZE1haWxib3hlcygpXG5cblxuXHRcdHRoaXMub25BY3Rpb24gPSBmdW5jdGlvbihhY3Rpb24pIHtcblx0XHRcdGNvbnNvbGUubG9nKCdvbkFjdGlvbicsIGFjdGlvbilcblx0XHRcdGlmIChhY3Rpb24gPT0gJ2FwcGx5Jykge1xuXHRcdFx0XHRjb25zdCB7dHJlZX0gPSBjdHJsLnNjb3BlXG5cdFx0XHRcdGNvbnN0IG5vZGUgPSB0cmVlLmdldEFjdGl2ZU5vZGUoKVxuXHRcdFx0XHRpZiAobm9kZSA9PSBudWxsKSB7XG5cdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ1NlbGVjdCBUYXJnZXQgTWFpbGJveCcsIGNvbnRlbnQ6ICdQbGVhc2Ugc2VsZWN0IGEgdGFyZ2V0IG1haWxib3gnfSlcblx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zdCB0YXJnZXROYW1lID0gdHJlZS5nZXROb2RlUGF0aChub2RlKVxuXHRcdFx0XHRpZiAodGFyZ2V0TmFtZSA9PSBtYWlsYm94TmFtZSkge1xuXHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdTZWxlY3QgVGFyZ2V0IE1haWxib3gnLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBhIHRhcmdldCBtYWlsYm94IGRpZmZlcmVudCBmcm9tIGN1cnJlbnQgbWFpbGJveCd9KVxuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XG5cblx0XHRcdFx0c3J2TWFpbC5tb3ZlTWVzc2FnZShjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIHRhcmdldE5hbWUsIHNlcU5vcykudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0JHBhZ2VyLnBvcFBhZ2UoKVxuXHRcdFx0XHR9KVxuXHRcdFx0XHRcblx0XHRcdH1cblx0XHR9XG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnaW1hZ2VQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgc3R5bGU9XFxcImhlaWdodDogMTAwJTsgcG9zaXRpb246IHJlbGF0aXZlOyB0ZXh0LWFsaWduOiBjZW50ZXI7XFxcIj5cXG5cdDxzcGFuIGJuLXNob3c9XFxcIndhaXRcXFwiIGNsYXNzPVxcXCJ3My10ZXh0LWJsdWVcXFwiIHN0eWxlPVxcXCJwb3NpdGlvbjogcmVsYXRpdmU7IHRvcDogNTAlO1xcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXJlZG8tYWx0IGZhLTJ4IGZhLXB1bHNlXFxcIj48L2k+PC9zcGFuPlxcblxcblx0PGRpdiBibi1zaG93PVxcXCIhd2FpdFxcXCIgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbWFnZVxcXCIgYm4tZGF0YT1cXFwie3NyYzogdXJsfVxcXCIgc3R5bGU9XFxcImhlaWdodDogMTAwJVxcXCIgYm4taWZhY2U9XFxcImltYWdlXFxcIj48L2Rpdj5cdFxcbjwvZGl2PlxcblwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QubWFpbHMnLCAnYnJlaXpib3QuZmlsZXMnXSxcblxuXHRwcm9wczoge1xuXHRcdCRwYWdlcjogbnVsbCxcblx0XHRpbmZvOiAnJyxcblx0XHRjdXJyZW50QWNjb3VudDogJycsXG5cdFx0bWFpbGJveE5hbWU6ICcnLFxuXHRcdHNlcW5vOiAnJyxcblx0XHRmaWxlTmFtZTogJydcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydk1haWwsIGZpbGVzKSB7XG5cblx0XHRjb25zdCB7JHBhZ2VyLCBpbmZvLCBjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIHNlcW5vLCBmaWxlTmFtZX0gPSB0aGlzLnByb3BzXG5cdFx0Y29uc3Qge3BhcnRJRCwgdHlwZSwgc3VidHlwZX0gPSBpbmZvXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHVybDogJycsXG5cdFx0XHRcdHdhaXQ6IHRydWVcblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0c3J2TWFpbC5vcGVuQXR0YWNobWVudChjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIHNlcW5vLCBwYXJ0SUQpLnRoZW4oKG1lc3NhZ2UpID0+IHtcblx0XHRcdC8vY29uc29sZS5sb2coJ21lc3NhZ2UnLCBtZXNzYWdlKVxuXHRcdFx0Y29uc3QgdXJsID0gYGRhdGE6JHt0eXBlfS8ke3N1YnR5cGV9O2Jhc2U2NCxgICsgbWVzc2FnZS5kYXRhXG5cdFx0XHRjdHJsLnNldERhdGEoe3VybCwgd2FpdDpmYWxzZX0pXG5cblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gc2F2ZSgpIHtcblx0XHRcdGNvbnN0IHt1cmx9ID0gY3RybC5tb2RlbFxuXHRcdFx0aWYgKHVybCA9PSAnJykge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnRXJyb3InLCBjb250ZW50OiAnSW1hZ2Ugbm90IGxvYWRlZCwgcGxlYXNlIHdhaXQnfSlcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cdFx0XHRjb25zdCBibG9iID0gJCQudXRpbC5kYXRhVVJMdG9CbG9iKHVybClcblx0XHRcdGZpbGVzLnVwbG9hZEZpbGUoYmxvYiwgZmlsZU5hbWUsICcvaW1hZ2VzL2VtYWlsJykudGhlbihmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0JHBhZ2VyLnBvcFBhZ2UoKVxuXHRcdFx0fSlcdFxuXHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJyxcblx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dFxuXHRcdFx0XHR9KVxuXHRcdFx0fSlcdFx0XHRcdFxuXHRcdH1cblxuXHRcdHRoaXMub25BY3Rpb24gPSBmdW5jdGlvbihhY3Rpb24pIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ29uQWN0aW9uJywgYWN0aW9uKVxuXHRcdFx0aWYgKGFjdGlvbiA9PSAnc2F2ZScpIHtcblx0XHRcdFx0c2F2ZSgpXG5cdFx0XHR9XG5cdFx0XHRpZiAoYWN0aW9uID09ICdmaXQnKSB7XG5cdFx0XHRcdGN0cmwuc2NvcGUuaW1hZ2UuZml0SW1hZ2UoKVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnbWFpbGJveFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXHQ8ZGl2Plxcblx0XHQ8ZGl2IGJuLXNob3c9XFxcIm5iTXNnID4gMFxcXCI+XFxuXHRcdFx0PHNwYW4gPlBhZ2U6IDxzcGFuIGJuLXRleHQ9XFxcImAke3BhZ2VOb30gLyAke25iUGFnZX1gXFxcIj48L3NwYW4+PC9zcGFuPlxcblx0XHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcInByZXZpb3VzIHBhZ2VcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25QcmV2UGFnZVxcXCI+XFxuXHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtYW5nbGUtbGVmdFxcXCI+PC9pPlxcblx0XHRcdDwvYnV0dG9uPlx0XHRcdFxcblx0XHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIm5leHQgcGFnZVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbk5leHRQYWdlXFxcIj5cXG5cdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1hbmdsZS1yaWdodFxcXCI+PC9pPlxcblx0XHRcdDwvYnV0dG9uPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2Plxcblx0PGRpdiBjbGFzcz1cXFwibmJNc2dcXFwiPjxzdHJvbmcgYm4tdGV4dD1cXFwibmJNc2dcXFwiPjwvc3Ryb25nPiZuYnNwO01lc3NhZ2VzPC9kaXY+XHRcdFxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsVGFibGVcXFwiPlxcblx0PHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZS1hbGwgdzMtaG92ZXJhYmxlIHczLXNtYWxsXFxcIj5cXG5cdFx0PHRoZWFkPlxcblx0XHRcdDx0ciBjbGFzcz1cXFwidzMtZ3JlZW5cXFwiPlxcblx0XHRcdFx0PHRoPjxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbk1haW5DaGVja0JveENsaWNrXFxcIj48L3RoPlxcblx0XHRcdFx0PHRoPkZyb208L3RoPlxcblx0XHRcdFx0PHRoPlN1YmplY3Q8L3RoPlxcblx0XHRcdFx0PHRoIHRpdGxlPVxcXCJuYiBBdHRhY2htZW50c1xcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBhcGVyY2xpcFxcXCI+PC9pPjwvdGg+XFxuXHRcdFx0XHQ8dGg+RGF0ZTwvdGg+XFxuXHRcdFx0PC90cj5cXG5cdFx0PC90aGVhZD5cXG5cdFx0PHRib2R5IGJuLWVhY2g9XFxcIm1lc3NhZ2VzXFxcIiBibi1ldmVudD1cXFwiY2xpY2suaXRlbTogb25JdGVtQ2xpY2tcXFwiPlxcblx0XHRcdDx0ciBibi1kYXRhPVxcXCJ7aXRlbTogJGl9XFxcIiBibi1jbGFzcz1cXFwie3Vuc2VlbjogIWlzU2VlbigkaS5mbGFncyl9XFxcIj5cXG5cdFx0XHRcdDx0aD48aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGNsYXNzPVxcXCJjaGVja1xcXCIgPjwvdGg+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJGkuZnJvbS5uYW1lXFxcIiBibi1hdHRyPVxcXCJ7dGl0bGU6ICRpLmZyb20uZW1haWx9XFxcIj48L3RkPlxcblx0XHRcdFx0PHRkIGJuLXRleHQ9XFxcIiRpLnN1YmplY3RcXFwiIGNsYXNzPVxcXCJpdGVtXFxcIiA+PC90ZD5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkaS5uYkF0dGFjaG1lbnRzXFxcIj48L3RkPlxcblx0XHRcdFx0PHRkIGJuLXRleHQ9XFxcImdldERhdGUoJGkuZGF0ZSlcXFwiPjwvdGQ+XFxuXHRcdFx0PC90cj5cXG5cdFx0PC90Ym9keT5cXG5cdDwvdGFibGU+XFxuPC9kaXY+XFxuXFxuXFxuXCIsXG5cblx0ZGVwczogWydicmVpemJvdC5tYWlscyddLFxuXG5cdHByb3BzOiB7XG5cdFx0JHBhZ2VyOiBudWxsLFxuXHRcdGN1cnJlbnRBY2NvdW50OiAnJyxcblx0XHRtYWlsYm94TmFtZTogJydcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydk1haWwpIHtcblxuXHRcdGNvbnN0IHskcGFnZXIsIGN1cnJlbnRBY2NvdW50LCBtYWlsYm94TmFtZX0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdG1lc3NhZ2VzOiBbXSxcblx0XHRcdFx0bmJNc2c6IDAsXG5cdFx0XHRcdHBhZ2VObzogMCxcblx0XHRcdFx0bmJQYWdlOiAwLFxuXG5cdFx0XHRcdGdldERhdGU6IGZ1bmN0aW9uKGRhdGUpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdnZXREYXRlJywgZGF0ZSlcblx0XHRcdFx0XHRjb25zdCBkID0gbmV3IERhdGUoZGF0ZSlcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdkJywgZClcblx0XHRcdFx0XHRyZXR1cm4gZC50b0xvY2FsZURhdGVTdHJpbmcoJ2ZyLUZSJylcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRpc1NlZW46IGZ1bmN0aW9uKGZsYWdzKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZsYWdzLmluY2x1ZGVzKCdcXFxcU2VlbicpXG5cdFx0XHRcdH1cblxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkl0ZW1DbGljazogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHQvLyAkKHRoaXMpLmNsb3Nlc3QoJ3Rib2R5JykuZmluZCgndHInKS5yZW1vdmVDbGFzcygndzMtYmx1ZScpXG5cdFx0XHRcdFx0Ly8gJCh0aGlzKS5hZGRDbGFzcygndzMtYmx1ZScpXG5cdFx0XHRcdFx0Y29uc3QgaXRlbSA9ICQodGhpcykuY2xvc2VzdCgndHInKS5kYXRhKCdpdGVtJylcblx0XHRcdFx0XHQkcGFnZXIucHVzaFBhZ2UoJ21lc3NhZ2VQYWdlJywge1xuXHRcdFx0XHRcdFx0dGl0bGU6IGBNZXNzYWdlICMke2l0ZW0uc2Vxbm99YCxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdGN1cnJlbnRBY2NvdW50LFxuXHRcdFx0XHRcdFx0XHRtYWlsYm94TmFtZSxcblx0XHRcdFx0XHRcdFx0aXRlbVx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0YnV0dG9uczogW1xuXHRcdFx0XHRcdFx0XHR7bmFtZTogJ3JlcGx5JywgaWNvbjogJ2ZhIGZhLXJlcGx5J31cblx0XHRcdFx0XHRcdF1cblxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25NYWluQ2hlY2tCb3hDbGljazogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRlbHQuZmluZCgnLmNoZWNrJykucHJvcCgnY2hlY2tlZCcsICQodGhpcykucHJvcCgnY2hlY2tlZCcpKVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uUHJldlBhZ2U6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3Qge25iUGFnZSwgcGFnZU5vfSA9IGN0cmwubW9kZWxcblxuXHRcdFx0XHRcdGlmIChwYWdlTm8gPiAxKSB7XG5cdFx0XHRcdFx0XHRsb2FkKHBhZ2VObyAtIDEpXG5cdFx0XHRcdFx0fVx0XHRcdFx0XHRcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbk5leHRQYWdlOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnN0IHtuYlBhZ2UsIHBhZ2VOb30gPSBjdHJsLm1vZGVsXG5cblx0XHRcdFx0XHRpZiAocGFnZU5vIDwgbmJQYWdlKSB7XG5cdFx0XHRcdFx0XHRsb2FkKHBhZ2VObyArIDEpXG5cdFx0XHRcdFx0fVx0XHRcdFx0XG5cdFx0XHRcdH1cdFx0XHRcdFxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiBsb2FkKHBhZ2VObykge1xuXHRcdFx0aWYgKHBhZ2VObyA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cGFnZU5vID0gY3RybC5tb2RlbC5wYWdlTm9cblx0XHRcdH1cblxuXHRcdFx0c3J2TWFpbC5vcGVuTWFpbGJveChjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIHBhZ2VObykudGhlbigoZGF0YSkgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZGF0YScsIGRhdGEpXG5cdFx0XHRcdGNvbnN0IHttZXNzYWdlcywgbmJNc2d9ID0gZGF0YVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdHBhZ2VObyxcblx0XHRcdFx0XHRuYlBhZ2U6IE1hdGguY2VpbChuYk1zZyAvIDIwKSxcblx0XHRcdFx0XHRuYk1zZyxcblx0XHRcdFx0XHRtZXNzYWdlczogbWVzc2FnZXMucmV2ZXJzZSgpXG5cdFx0XHRcdH0pXG5cdFx0XHR9KVx0XHRcdFxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGRlbGV0ZU1lc3NhZ2UoKSB7XG5cdFx0XHRjb25zdCBpdGVtcyA9IGVsdC5maW5kKCcuY2hlY2s6Y2hlY2tlZCcpXG5cdFx0XHRjb25zb2xlLmxvZygnZGVsZXRlTWVzc2FnZScsIGl0ZW1zLmxlbmd0aClcblx0XHRcdGlmIChpdGVtcy5sZW5ndGggPT0gMCkge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnRGVsZXRlIE1lc3NhZ2UnLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBvbmUgb3Igc2V2ZXJhbGwgbWVzc2FnZXMgISd9KVxuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnN0IHNlcU5vcyA9IFtdXG5cdFx0XHRpdGVtcy5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjb25zdCBkYXRhID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmRhdGEoJ2l0ZW0nKVxuXHRcdFx0XHRzZXFOb3MucHVzaChkYXRhLnNlcW5vKVxuXHRcdFx0fSlcblx0XHRcdGNvbnNvbGUubG9nKCdzZXFOb3MnLCBzZXFOb3MpXG5cdFx0XHRzcnZNYWlsLmRlbGV0ZU1lc3NhZ2UoY3VycmVudEFjY291bnQsIG1haWxib3hOYW1lLCBzZXFOb3MpLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnTWVzc2FnZXMgZGVsZXRlZCcpXG5cdFx0XHRcdGxvYWQoKVxuXHRcdFx0fSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBtb3ZlTWVzc2FnZSgpIHtcblx0XHRcdGNvbnN0IGl0ZW1zID0gZWx0LmZpbmQoJy5jaGVjazpjaGVja2VkJylcblx0XHRcdGNvbnNvbGUubG9nKCdkZWxldGVNZXNzYWdlJywgaXRlbXMubGVuZ3RoKVxuXHRcdFx0aWYgKGl0ZW1zLmxlbmd0aCA9PSAwKSB7XG5cdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdNb3ZlIE1lc3NhZ2UnLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBvbmUgb3Igc2V2ZXJhbGwgbWVzc2FnZXMgISd9KVxuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblx0XHRcdGNvbnN0IHNlcU5vcyA9IFtdXG5cdFx0XHRpdGVtcy5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjb25zdCBkYXRhID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmRhdGEoJ2l0ZW0nKVxuXHRcdFx0XHRzZXFOb3MucHVzaChkYXRhLnNlcW5vKVxuXHRcdFx0fSlcblx0XHRcdGNvbnNvbGUubG9nKCdzZXFOb3MnLCBzZXFOb3MpXG5cdFx0XHQkcGFnZXIucHVzaFBhZ2UoJ2JveGVzUGFnZScsIHtcblx0XHRcdFx0dGl0bGU6ICdTZWxlY3QgdGFyZ2V0IG1haWxib3gnLFxuXHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdGN1cnJlbnRBY2NvdW50LFxuXHRcdFx0XHRcdG1haWxib3hOYW1lLFxuXHRcdFx0XHRcdHNlcU5vc1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRidXR0b25zOiBbXG5cdFx0XHRcdFx0e25hbWU6ICdhcHBseScsIGljb246ICdmYSBmYS1jaGVjayd9XG5cdFx0XHRcdF1cblx0XHRcdH0pXG5cdFx0XHQvLyBzcnZNYWlsLmRlbGV0ZU1lc3NhZ2UoY3VycmVudEFjY291bnQsIG1haWxib3hOYW1lLCBzZXFOb3MpLnRoZW4oKCkgPT4ge1xuXHRcdFx0Ly8gXHRjb25zb2xlLmxvZygnTWVzc2FnZXMgZGVsZXRlZCcpXG5cdFx0XHQvLyBcdGxvYWQoKVxuXHRcdFx0Ly8gfSlcblx0XHR9XHRcdFxuXG5cdFx0bG9hZCgxKVxuXG5cblx0XHR0aGlzLm9uQWN0aW9uID0gZnVuY3Rpb24oYWN0aW9uKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnb25BY3Rpb24nLCBhY3Rpb24pXG5cdFx0XHRpZiAoYWN0aW9uID09ICdyZWxvYWQnKSB7XG5cdFx0XHRcdGxvYWQoMSlcblx0XHRcdH1cblxuXHRcdFx0aWYgKGFjdGlvbiA9PSAnZGVsZXRlJykge1xuXHRcdFx0XHRkZWxldGVNZXNzYWdlKClcblx0XHRcdH1cblxuXHRcdFx0aWYgKGFjdGlvbiA9PSAnbW92ZScpIHtcblx0XHRcdFx0bW92ZU1lc3NhZ2UoKVxuXHRcdFx0fVx0XHRcdFxuXHRcdH1cblxuXG5cdFx0dGhpcy5vblJldHVybiA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdvblJldHVybicsIGRhdGEpXG5cdFx0XHRsb2FkKClcblx0XHR9XG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblx0PGRpdiBjbGFzcz1cXFwiaW5mb1xcXCI+XFxuXHRcdDxwIGJuLXNob3c9XFxcImFjY291bnRzLmxlbmd0aCA9PSAwXFxcIj5Zb3UgaGF2ZSBubyBlbWFpbCBhY2NvdW50PC9wPlxcblx0XHQ8cCBibi1zaG93PVxcXCJhY2NvdW50cy5sZW5ndGggPiAwXFxcIj5BY2NvdW50OiBcXG5cdFx0XHQ8c2VsZWN0IGJuLWNvbnRyb2w9XFxcImJyYWluanMuc2VsZWN0bWVudVxcXCIgYm4tZWFjaD1cXFwiYWNjb3VudHNcXFwiIGJuLXZhbD1cXFwiY3VycmVudEFjY291bnRcXFwiXFxuXHRcdFx0XHRibi1ldmVudD1cXFwic2VsZWN0bWVudWNoYW5nZTogb25BY2NvdW50Q2hhbmdlXFxcIj5cXG5cdFx0XHRcdDxvcHRpb24gYm4tdGV4dD1cXFwiJGlcXFwiPjwvb3B0aW9uPlxcblx0XHRcdDwvc2VsZWN0Plxcblx0XHQ8L3A+XFxuXHRcdFxcblx0PC9kaXY+XFxuXHQ8ZGl2Plxcblx0XHQ8YnV0dG9uIFxcblx0XHRcdGNsYXNzPVxcXCJ3My1idG4gdzMtYmx1ZVxcXCIgXFxuXHRcdFx0dGl0bGU9XFxcIkNyZWF0ZSBhY2NvdW50XFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25DcmVhdGVBY2NvdW50XFxcIlxcblx0XHQ+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXBsdXNcXFwiPjwvaT5cXG5cdFx0PC9idXR0b24+XFxuXFxuXHRcdDxidXR0b24gXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ0biB3My1ibHVlXFxcIiBcXG5cdFx0XHR0aXRsZT1cXFwiTmV3IGVtYWlsXFxcIlxcblx0XHRcdGJuLWV2ZW50PVxcXCJjbGljazogb25OZXdFbWFpbFxcXCJcXG5cdFx0XHRibi1zaG93PVxcXCJhY2NvdW50cy5sZW5ndGggPiAwXFxcIlxcblx0XHQ+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWVudmVsb3BlXFxcIj48L2k+XFxuXHRcdDwvYnV0dG9uPlxcblx0XHRcXG5cdDwvZGl2Plxcblx0XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxUcmVlXFxcIj5cXG5cdDxkaXYgXFxuXHRcdGNsYXNzPVxcXCJ0cmVlXFxcIiBcXG5cdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy50cmVlXFxcIlxcblx0XHRibi1kYXRhPVxcXCJ7c291cmNlOiBtYWlsYm94ZXN9XFxcIlxcblx0XHRibi1ldmVudD1cXFwidHJlZWFjdGl2YXRlOiBvblRyZWVBY3RpdmF0ZVxcXCJcXG5cdFx0Ym4taWZhY2U9XFxcInRyZWVcXFwiXFxuXHQ+PC9kaXY+XFxuPC9kaXY+XFxuXFxuXFxuXCIsXG5cblx0ZGVwczogWydicmVpemJvdC5tYWlscyddLFxuXG5cdHByb3BzOiB7XG5cdFx0JHBhZ2VyOiBudWxsXG5cdH0sXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBzcnZNYWlsKSB7XG5cblx0XHRjb25zdCB7JHBhZ2VyfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0YWNjb3VudHM6IFtdLFxuXHRcdFx0XHRjdXJyZW50QWNjb3VudDogJycsXG5cdFx0XHRcdG1haWxib3hlczogW10sXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uQ3JlYXRlQWNjb3VudDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQ3JlYXRlQWNjb3VudCcpXG5cdFx0XHRcdFx0JHBhZ2VyLnB1c2hQYWdlKCdhY2NvdW50UGFnZScsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnQ3JlYXRlIE1haWwgQWNjb3VudCcsXG5cdFx0XHRcdFx0XHRidXR0b25zOiBbe25hbWU6ICdjcmVhdGUnLCBpY29uOiAnZmEgZmEtY2hlY2snfV1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkFjY291bnRDaGFuZ2U6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkFjY291bnRDaGFuZ2UnLCAkKHRoaXMpLnZhbCgpKVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uVHJlZUFjdGl2YXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25UcmVlQWN0aXZhdGUnKVxuXHRcdFx0XHRcdGNvbnN0IHRyZWUgPSAkKHRoaXMpLmlmYWNlKClcblxuXHRcdFx0XHRcdGNvbnN0IG5vZGUgPSAgdHJlZS5nZXRBY3RpdmVOb2RlKClcblxuXHRcdFx0XHRcdGNvbnN0IG1haWxib3hOYW1lID0gdHJlZS5nZXROb2RlUGF0aChub2RlKVx0XHRcdFx0XHRcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnbWFpbGJveE5hbWUnLCBtYWlsYm94TmFtZSlcblx0XHRcdFx0XHRjb25zdCB7Y3VycmVudEFjY291bnR9ID0gY3RybC5tb2RlbFxuXHRcdFx0XHRcdCRwYWdlci5wdXNoUGFnZSgnbWFpbGJveFBhZ2UnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogbm9kZS50aXRsZSxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdGN1cnJlbnRBY2NvdW50LFxuXHRcdFx0XHRcdFx0XHRtYWlsYm94TmFtZVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdGJ1dHRvbnM6IFtcblx0XHRcdFx0XHRcdFx0e25hbWU6ICdyZWxvYWQnLCBpY29uOiAnZmEgZmEtcmVkbyd9LFxuXHRcdFx0XHRcdFx0XHR7bmFtZTogJ21vdmUnLCBpY29uOiAnZmEgZmEtZmlsZS1leHBvcnQnfSxcblx0XHRcdFx0XHRcdFx0e25hbWU6ICdkZWxldGUnLCBpY29uOiAnZmEgZmEtdHJhc2gnfVxuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRdXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbk5ld0VtYWlsOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbk5ld0VtYWlsJylcblx0XHRcdFx0XHQkcGFnZXIucHVzaFBhZ2UoJ3dyaXRlTWFpbFBhZ2UnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ05ldyBtZXNzYWdlJyxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdGFjY291bnROYW1lOiBjdHJsLm1vZGVsLmN1cnJlbnRBY2NvdW50XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0YnV0dG9uczogW1xuXHRcdFx0XHRcdFx0XHR7bmFtZTogJ3NlbmQnLCBpY29uOiAnZmEgZmEtcGFwZXItcGxhbmUnfVxuXHRcdFx0XHRcdFx0XVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cblx0XHRmdW5jdGlvbiBsb2FkQWNjb3VudCgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdsb2FkQWNjb3VudCcpXG5cdFx0XHRzcnZNYWlsLmdldE1haWxBY2NvdW50KCkudGhlbigoYWNjb3VudHMpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FjY291bnRzJywgYWNjb3VudHMpXG5cdFx0XHRcdGlmIChhY2NvdW50cy5sZW5ndGggPT0gMCkge1xuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnN0IGN1cnJlbnRBY2NvdW50ID0gYWNjb3VudHNbMF1cblx0XHRcdFx0Y29uc29sZS5sb2coJ2N1cnJlbnRBY2NvdW50JywgY3VycmVudEFjY291bnQpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7YWNjb3VudHMsIGN1cnJlbnRBY2NvdW50fSlcblx0XHRcdFx0bG9hZE1haWxib3hlcygpXG5cdFx0XHR9KVx0XHRcdFxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGxvYWRNYWlsYm94ZXMoKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnbG9hZE1haWxib3hlcycpXG5cdFx0XHRjb25zdCB7Y3VycmVudEFjY291bnR9ID0gY3RybC5tb2RlbFxuXHRcdFx0c3J2TWFpbC5nZXRNYWlsYm94ZXMoY3VycmVudEFjY291bnQpLnRoZW4oKG1haWxib3hlcykgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnbWFpbGJveGVzJywgbWFpbGJveGVzKVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdG1haWxib3hlc1xuXHRcdFx0XHR9KVxuXHRcdFx0fSlcblx0XHR9XG5cblx0XHRsb2FkQWNjb3VudCgpXG5cblx0XHR0aGlzLm9uUmV0dXJuID0gZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ29uUmV0dXJuJywgZGF0YSlcblx0XHRcdGlmIChkYXRhID09ICd1cGRhdGUnKSB7XG5cdFx0XHRcdGxvYWRBY2NvdW50KClcblx0XHRcdH1cblx0XHRcdGlmIChkYXRhID09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRjb25zdCBhY3RpdmVOb2RlID0gY3RybC5zY29wZS50cmVlLmdldEFjdGl2ZU5vZGUoKVxuXHRcdFx0XHRpZiAoYWN0aXZlTm9kZSAhPSBudWxsKSB7XG5cdFx0XHRcdFx0YWN0aXZlTm9kZS5zZXRBY3RpdmUoZmFsc2UpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ21lc3NhZ2VQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcImhlYWRlciB3My1ibHVlXFxcIj5cXG5cdDxkaXY+PHN0cm9uZz5Gcm9tOiA8L3N0cm9uZz48c3BhbiBibi10ZXh0PVxcXCJpdGVtLmZyb20ubmFtZVxcXCI+PC9zcGFuPjwvZGl2Plxcblx0PGRpdj48c3Ryb25nPlN1YmplY3Q6IDwvc3Ryb25nPjxzcGFuIGJuLXRleHQ9XFxcIml0ZW0uc3ViamVjdFxcXCI+PC9zcGFuPjwvZGl2Plxcblx0PGRpdiBjbGFzcz1cXFwiYXR0YWNobWVudHNcXFwiIGJuLXNob3c9XFxcImF0dGFjaG1lbnRzLmxlbmd0aCA+IDBcXFwiPlxcblx0XHQ8c3Ryb25nIGJuLWV2ZW50PVxcXCJjbGljazogb25BdHRhY2hDbGlja1xcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWNhcmV0LWRvd25cXFwiPjwvaT5cXG5cdFx0QXR0YWNobWVudHM8L3N0cm9uZz5cXG5cdFx0PHVsICBibi1lYWNoPVxcXCJhdHRhY2htZW50c1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLml0ZW06IG9uSXRlbUNsaWNrXFxcIj5cXG5cdFx0XHQ8bGkgYm4tc2hvdz1cXFwiY2FuT3BlbigkaSlcXFwiPlxcblx0XHRcdFx0PGEgaHJlZj1cXFwiI1xcXCIgYm4tdGV4dD1cXFwiJGkubmFtZVxcXCIgY2xhc3M9XFxcIml0ZW1cXFwiIGJuLWRhdGE9XFxcIntpdGVtOiAkaX1cXFwiPjwvYT5cXG5cdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldFNpemUoJGkuc2l6ZSlcXFwiPjwvc3Bhbj48L2xpPlxcblx0XHRcdDxsaSBibi1zaG93PVxcXCIhY2FuT3BlbigkaSlcXFwiPlxcblx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJGkubmFtZVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0U2l6ZSgkaS5zaXplKVxcXCI+PC9zcGFuPjwvbGk+XHRcdFx0XHRcXG5cdFx0XHQ8L2xpPlxcblx0XHQ8L3VsPlxcblx0PC9kaXY+XFxuXHRcXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJtYWluXFxcIj5cXG48IS0tIFx0PGlmcmFtZSBibi1hdHRyPVxcXCJ7c3JjZG9jOnRleHR9XFxcIj48L2lmcmFtZT5cXG4gLS0+XFxuIFx0PHByZSBibi10ZXh0PVxcXCJ0ZXh0XFxcIj48L3ByZT5cXG48L2Rpdj5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90Lm1haWxzJ10sXG5cblx0cHJvcHM6IHtcblx0XHQkcGFnZXI6IG51bGwsXG5cdFx0Y3VycmVudEFjY291bnQ6ICcnLFxuXHRcdG1haWxib3hOYW1lOiAnJyxcblx0XHRpdGVtOiBudWxsXG5cdH0sXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBzcnZNYWlsKSB7XG5cblx0XHRjb25zdCB7JHBhZ2VyLCBjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIHBhcnRJRCwgaXRlbX0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHRleHQ6ICcnLFxuXHRcdFx0XHRpdGVtLFxuXHRcdFx0XHRhdHRhY2htZW50czogW10sXG5cdFx0XHRcdGNhbk9wZW46IGZ1bmN0aW9uKGluZm8pIHtcblx0XHRcdFx0XHRyZXR1cm4gaW5mby50eXBlID09ICdpbWFnZScgJiYgaW5mby5lbmNvZGluZy50b1VwcGVyQ2FzZSgpID09ICdCQVNFNjQnXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldFNpemU6IGZ1bmN0aW9uKHNpemUpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdnZXRTaXplJywgc2l6ZSlcblx0XHRcdFx0XHRzaXplIC89IDEwMjRcblx0XHRcdFx0XHRsZXQgdW5pdCA9ICdLbydcblx0XHRcdFx0XHRpZiAoc2l6ZSA+IDEwMjQpIHtcblx0XHRcdFx0XHRcdHNpemUgLz0gMTAyNFxuXHRcdFx0XHRcdFx0dW5pdCA9ICdNbydcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXR1cm4gYCAoJHtzaXplLnRvRml4ZWQoMSl9ICR7dW5pdH0pYFxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uSXRlbUNsaWNrOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gJCh0aGlzKS5kYXRhKCdpdGVtJylcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25JdGVtQ2xpY2snLCBpbmZvKVxuXHRcdFx0XHRcdCRwYWdlci5wdXNoUGFnZSgnaW1hZ2VQYWdlJywge1xuXHRcdFx0XHRcdFx0dGl0bGU6IGluZm8ubmFtZSxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdGZpbGVOYW1lOiBpbmZvLm5hbWUsXG5cdFx0XHRcdFx0XHRcdGluZm8sXG5cdFx0XHRcdFx0XHRcdGN1cnJlbnRBY2NvdW50LFxuXHRcdFx0XHRcdFx0XHRtYWlsYm94TmFtZSxcblx0XHRcdFx0XHRcdFx0c2Vxbm86IGl0ZW0uc2Vxbm9cblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRidXR0b25zOiBbXG5cdFx0XHRcdFx0XHRcdHtuYW1lOiAnc2F2ZScsIGljb246ICdmYSBmYS1zYXZlJ30sXG5cdFx0XHRcdFx0XHRcdHtuYW1lOiAnZml0JywgaWNvbjogJ2ZhIGZhLWV4cGFuZCd9XG5cdFx0XHRcdFx0XHRdXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25BdHRhY2hDbGljazogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25BdHRhY2hDbGljaycpXG5cdFx0XHRcdFx0Y29uc3QgJGkgPSAkKHRoaXMpLmZpbmQoJ2knKVxuXHRcdFx0XHRcdGNvbnN0ICR1bCA9ICQodGhpcykuc2libGluZ3MoJ3VsJylcblx0XHRcdFx0XHRpZiAoJGkuaGFzQ2xhc3MoJ2ZhLWNhcmV0LXJpZ2h0JykpIHtcblx0XHRcdFx0XHRcdCRpLnJlbW92ZUNsYXNzKCdmYS1jYXJldC1yaWdodCcpLmFkZENsYXNzKCdmYS1jYXJldC1kb3duJylcblx0XHRcdFx0XHRcdCR1bC5zbGlkZURvd24oKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdCRpLnJlbW92ZUNsYXNzKCdmYS1jYXJldC1kb3duJykuYWRkQ2xhc3MoJ2ZhLWNhcmV0LXJpZ2h0JylcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdCR1bC5zbGlkZVVwKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0c3J2TWFpbC5vcGVuTWVzc2FnZShjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIGl0ZW0uc2Vxbm8sIGl0ZW0ucGFydElEKS50aGVuKChtZXNzYWdlKSA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZygnbWVzc2FnZScsIG1lc3NhZ2UpXG5cblx0XHRcdC8vY29uc3Qge3RleHQsIGF0dGFjaG1lbnRzfSA9IG1lc3NhZ2VcblxuXHRcdFx0Y3RybC5zZXREYXRhKG1lc3NhZ2UpXG5cblx0XHR9KVxuXG5cdFx0dGhpcy5vbkFjdGlvbiA9IGZ1bmN0aW9uKGFjdGlvbikge1xuXHRcdFx0Y29uc29sZS5sb2coJ29uQWN0aW9uJywgYWN0aW9uKVxuXHRcdFx0aWYgKGFjdGlvbiA9PSAncmVwbHknKSB7XG5cblx0XHRcdFx0JHBhZ2VyLnB1c2hQYWdlKCd3cml0ZU1haWxQYWdlJywge1xuXHRcdFx0XHRcdHRpdGxlOiAnUmVwbHkgbWVzc2FnZScsXG5cdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdGFjY291bnROYW1lOiBjdXJyZW50QWNjb3VudCxcblx0XHRcdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRcdFx0dG86IGl0ZW0uZnJvbS5uYW1lLFxuXHRcdFx0XHRcdFx0XHRzdWJqZWN0OiAnUmU6ICcgKyBpdGVtLnN1YmplY3QsXG5cdFx0XHRcdFx0XHRcdHRleHQ6ICdcXG5cXG4tLS0tLSBPcmlnaW5hbCBtYWlsIC0tLS0tXFxuJyArIGN0cmwubW9kZWwudGV4dFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0YnV0dG9uczogW1xuXHRcdFx0XHRcdFx0e25hbWU6ICdzZW5kJywgaWNvbjogJ2ZhIGZhLXBhcGVyLXBsYW5lJ31cblx0XHRcdFx0XHRdXG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0fVxuXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnd3JpdGVNYWlsUGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblNlbmRcXFwiIGJuLWZvcm09XFxcImRhdGFcXFwiPlxcblx0PGRpdiBjbGFzcz1cXFwiaGVhZGVyXFxcIj5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdDxsYWJlbD5Ubzo8L2xhYmVsPlxcblx0XHRcdDxpbnB1dCB0eXBlPVxcXCJlbWFpbFxcXCIgbmFtZT1cXFwidG9cXFwiIGJuLXByb3A9XFxcInthdXRvZm9jdXM6IGRhdGEudGV4dCA9PSB1bmRlZmluZWR9XFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cdFx0XFxuXHRcdDwvZGl2Plxcblxcblx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdFx0PGxhYmVsPlN1YmplY3Q6PC9sYWJlbD5cXG5cdFx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwic3ViamVjdFxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XHRcdFxcblx0XHQ8L2Rpdj5cdFxcblx0PC9kaXY+XFxuXHQ8dGV4dGFyZWEgbmFtZT1cXFwidGV4dFxcXCIgYm4tYmluZD1cXFwiY29udGVudFxcXCI+PC90ZXh0YXJlYT5cdFxcblx0PGlucHV0IHR5cGU9XFxcInN1Ym1pdFxcXCIgaGlkZGVuPVxcXCJcXFwiIGJuLWJpbmQ9XFxcInN1Ym1pdFxcXCI+XFxuPC9mb3JtPlxcblwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QubWFpbHMnXSxcblxuXHRwcm9wczoge1xuXHRcdCRwYWdlcjogbnVsbCxcblx0XHRhY2NvdW50TmFtZTogJycsXG5cdFx0ZGF0YToge31cblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydk1haWwpIHtcblxuXHRcdGNvbnN0IHskcGFnZXIsIGFjY291bnROYW1lLCBkYXRhfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZGF0YVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblNlbmQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uU2VuZCcpXG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdGNvbnN0IGRhdGEgPSAkKHRoaXMpLmdldEZvcm1EYXRhKClcblx0XHRcdFx0XHRzcnZNYWlsLnNlbmRNYWlsKGFjY291bnROYW1lLCBkYXRhKS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdCRwYWdlci5wb3BQYWdlKClcblx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdH0pXG5cblx0XHRpZiAoZGF0YS50ZXh0ICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0Y29uc3QgY29udGVudCA9IGN0cmwuc2NvcGUuY29udGVudC5nZXQoMClcblx0XHRcdGNvbnRlbnQuZm9jdXMoKVxuXHRcdFx0Y29udGVudC5zZXRTZWxlY3Rpb25SYW5nZSgwLCAwKVxuXHRcdH1cdFx0XG5cblx0XHR0aGlzLm9uQWN0aW9uID0gZnVuY3Rpb24oYWN0aW9uKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnb25BY3Rpb24nLCBhY3Rpb24pXG5cdFx0XHRpZiAoYWN0aW9uID09ICdzZW5kJykge1xuXHRcdFx0XHRjdHJsLnNjb3BlLnN1Ym1pdC5jbGljaygpXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59KSJdfQ==
