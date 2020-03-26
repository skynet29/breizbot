$$.control.registerControl('rootPage', {

	template: "<div class=\"toolbar\">\n	<div class=\"info\">\n		<span bn-show=\"show1\">You have no email account</span>\n		<div bn-show=\"show2\" class=\"account\">\n			<span>Account:&nbsp;</span> \n			<div \n				bn-control=\"brainjs.selectmenu\" \n				bn-data=\"{items: accounts}\" \n				bn-val=\"currentAccount\"\n				bn-event=\"selectmenuchange: onAccountChange\">\n			</div>\n		</div>\n		\n	</div>\n	<div>\n		<div bn-control=\"brainjs.contextmenu\" \n			bn-data=\"{items: getItems}\" \n			data-trigger=\"left\" \n			class=\"w3-button w3-blue\" \n			bn-event=\"contextmenuchange: onMenu\"\n			>\n				<i class=\"fa fa-ellipsis-v\"></i>\n    	\n		</div>		\n		\n	</div>\n	\n</div>\n\n<div>\n	Select folder to open:\n</div>\n\n<div class=\"scrollPanelTree\">\n	<div \n		class=\"tree\" \n		bn-control=\"brainjs.tree\"\n		bn-data=\"{source: mailboxes}\"\n		bn-event=\"treeactivate: onTreeActivate\"\n		bn-iface=\"tree\"\n	></div>\n</div>\n\n\n",

	deps: ['app.mails', 'breizbot.pager'],


	init: function(elt, srvMail, pager) {

		const ctrl = $$.viewController(elt, {
			data: {
				accounts: [],
				currentAccount: '',
				mailboxes: [],
				show1: function() {
					return this.accounts.length == 0
				},
				show2: function() {
					return this.accounts.length > 0
				},
				getItems: function() {
					if (this.accounts.length == 0) {
						return {
							add: {name: 'Add Account', icon: 'fas fa-plus'},
						}
					}
					return {
						add: {name: 'Add Account', icon: 'fas fa-plus'},
						edit: {name: 'Edit Selected Account', icon: 'fas fa-edit'},
						sep2: '------',
						newFolder: {name: 'New Folder', icon: 'fas fa-folder-plus'},
						sep: '------',
						new: {name: 'New Message', icon: 'fas fa-envelope'}					
					}
				}
			},
			events: {
				onMenu: function(ev, data) {
					console.log('onMenu', data)
					if (data.cmd == 'add') {
						pager.pushPage('accountPage', {
							title: 'Add Mail Account',
							onReturn: loadAccount
						})						
					}
					if (data.cmd == 'new') {
						pager.pushPage('writeMailPage', {
							title: 'New Message',
							props: {
								accountName: ctrl.model.currentAccount
							}
						})						
					}
					if (data.cmd == 'edit') {
						srvMail.getMailAccount(ctrl.model.currentAccount).then((data) => {
							pager.pushPage('accountPage', {
								title: 'Edit Mail Account',
								props: {
									data
								}
							})						

						})
					}
					if (data.cmd == 'newFolder') {
						pager.pushPage('boxesPage', {
							title: 'Add new folder',
							props: {
								currentAccount: ctrl.model.currentAccount,
								showForm: true
							},
							onReturn: function(targetName) {
								console.log('onReturn', targetName)
								srvMail.addMailbox(ctrl.model.currentAccount, targetName).then(() => {
									loadMailboxes()
								})

							}
						})
					}
				},

				onAccountChange: function() {
					console.log('onAccountChange', $(this).getValue())
					ctrl.setData({currentAccount: $(this).getValue()})
					loadMailboxes()
				},

				onTreeActivate: function() {
					console.log('onTreeActivate')
					const tree = $(this).iface()

					const node =  tree.getActiveNode()

					const mailboxName = tree.getNodePath(node)					
					console.log('mailboxName', mailboxName)
					const {currentAccount} = ctrl.model
					pager.pushPage('mailboxPage', {
						title: node.title,
						props: {
							currentAccount,
							mailboxName
						},
						onBack: function() {
							const activeNode = ctrl.scope.tree.getActiveNode()
							if (activeNode != null) {
								activeNode.setActive(false)
							}
						}
					})
				}

			}
		})


		function loadAccount() {
			console.log('loadAccount')
			srvMail.getMailAccounts().then((accounts) => {
				console.log('accounts', accounts)
				if (accounts.length == 0) {
					return
				}
				const currentAccount = accounts[0]
				console.log('currentAccount', currentAccount)
				ctrl.setData({accounts, currentAccount})
				loadMailboxes()
			}).catch((err) => {
				$$.ui.showAlert({title: 'Error', content: err})
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

	}


});





$$.service.registerService('app.mails', {

	deps: ['breizbot.http'],

	init: function(config, http) {

		return {
			getMailAccounts: function() {
				return http.get('/getMailAccounts')
			},

			getMailAccount: function(name) {
				return http.post('/getMailAccount', {name})
			},

			createMailAccount: function(data) {
				return http.post('/createMailAccount', data)
			},

			updateMailAccount: function(data) {
				return http.post('/updateMailAccount', data)
			},

			getMailboxes: function(name) {
				return http.post(`/getMailboxes`, {name})
			},

			addMailbox: function(name, mailboxName) {
				return http.post(`/addMailbox`, {name, mailboxName})
			},

			openMailbox: function(name, mailboxName, pageNo) {
				return http.post(`/openMailbox`, {name, mailboxName, pageNo})
			},

			openMessage: function(name, mailboxName, seqNo, partID)	{
				return http.post(`/openMessage`, {name, mailboxName, seqNo, partID})
			},

			openAttachment: function(name, mailboxName, seqNo, partID)	{
				return http.post(`/openAttachment`, {name, mailboxName, seqNo, partID})
			},

			deleteMessage: function(name, mailboxName, seqNos)	{
				return http.post(`/deleteMessage`, {name, mailboxName, seqNos})
			},	

			moveMessage: function(name, mailboxName, targetName, seqNos)	{
				return http.post(`/moveMessage`, {name, mailboxName, targetName, seqNos})
			},						
					

			sendMail: function(accountName, data) {
				return http.post(`/sendMail`, {accountName, data})
			}
		}
	},

	$iface: `
		getMailAccount():Promise;
		createMaiAccount(data):Promise;
		getMailboxes(name):Promise;
		openMailbox(name, mailboxName, pageNo):Promise;
		openMessage(name, mailboxName, seqNo, partID):Promise;
		openAttachment(name, mailboxName, seqNo, partID):Promise;
		deleteMessage(name, mailboxName, seqNos):Promise;
		moveMessage(name, mailboxName, targetName, seqNos):Promise
		`
});

$$.control.registerControl('accountPage', {

	template: "<div class=\"main\">\n	<form bn-event=\"submit: onSubmit\" bn-bind=\"form\" bn-form=\"data\">\n\n		<div bn-control=\"brainjs.inputgroup\">\n			<label>Provider</label>\n			<span bn-control=\"brainjs.selectmenu\" \n				bn-event=\"selectmenuchange: onProviderChange\" bn-val=\"provider\"\n				bn-data=\"{items: providers}\"\n				bn-prop=\"{disabled: isEdit}\"\n			>\n			</span>		\n		</div>			\n\n		<div bn-control=\"brainjs.inputgroup\">\n			<label>Account Name</label>\n			<input type=\"text\" name=\"name\" required=\"\" autofocus=\"\" bn-prop=\"{disabled: isEdit}\">			\n		</div>\n\n		<div bn-control=\"brainjs.inputgroup\">\n			<label>User</label>\n			<input type=\"text\" name=\"user\" required=\"\">			\n		</div>\n\n		<div bn-control=\"brainjs.inputgroup\">\n			<label>Password</label>\n			<input type=\"password\" name=\"pwd\" required=\"\">			\n		</div>\n\n		<div bn-control=\"brainjs.inputgroup\">\n			<label>Email</label>\n			<input type=\"email\" name=\"email\" required=\"\">			\n		</div>\n\n	\n\n		<div bn-control=\"brainjs.inputgroup\" bn-show=\"show1\">\n			<label>IMAP Server</label>\n			<input type=\"text\" name=\"imapHost\" required=\"\">			\n		</div>		\n\n		<div bn-control=\"brainjs.inputgroup\"  bn-show=\"show1\">\n			<label>SMTP Server</label>\n			<input type=\"text\" name=\"smtpHost\" required=\"\">			\n		</div>		\n\n		<div class=\"copySent\">\n			<label>Make a copy of sent mail in Sent folder</label>\n			<div bn-control=\"brainjs.flipswitch\" bn-data=\"data1\" name=\"makeCopy\"></div>\n		</div>\n\n		<input type=\"submit\" hidden=\"\" bn-bind=\"submit\">\n	</form>\n\n</div>",

	deps: ['app.mails', 'breizbot.pager'],

	props: {
		data: null
	},

	init: function(elt, srvMail, pager) {

		const {data} = this.props

		const map = {
			'Gmail': {
				imapHost: 'imap.gmail.com',
				smtpHost: 'smtp.gmail.com'
			},
			'Outlook': {
				imapHost: 'imap.outlook.com',
				smtpHost: 'smtp.outlook.com'
			},
			'Free': {
				imapHost: 'imap.free.fr',
				smtpHost: 'smtp.free.fr'
			},
			'SFR': {
				imapHost: 'imap.sfr.fr',
				smtpHost: 'smtp.sfr.fr'
			},
			'Orange': {
				imapHost: 'imap.orange.fr',
				smtpHost: 'smtp.orange.fr'
			},
			'Bouygues Telecom': {
				imapHost: 'imap.bbox.fr',
				smtpHost: 'smtp.bbox.fr'
			},
			'Other': {
				imapHost: '',
				smtpHost: ''
			},
		}

		function getProvider(info) {
			for(let k in map) {
				if (map[k].imapHost == info.imapHost) {
					return k
				}
			}
			return 'Other'
		}

		const ctrl = $$.viewController(elt, {
			data: {
				provider: (data != null) ? getProvider(data) : 'Gmail',
				providers: Object.keys(map),
				data,
				isEdit: data != null,
				show1: function() {return this.provider == 'Other'},
				data1: function() {
					return {height: 25, width: 100, texts: {left: 'YES', right: 'NO'}}
				}
			},
			events: {
				onSubmit: function(ev) {
					ev.preventDefault()
					const formData = $(this).getFormData()
					console.log('formData', formData)
					if (data == null) {
						srvMail.createMailAccount(formData).then(() => {
							pager.popPage()
						})						
					}
					else {
						srvMail.updateMailAccount(formData).then(() => {
							pager.popPage()
						})												
					}

				},
				onProviderChange: function() {
					const provider = $(this).getValue()
					console.log('onProviderChange', provider)
					ctrl.setData({provider})

					ctrl.scope.form.setFormData(map[provider])
				}
			}
		})

		ctrl.scope.form.setFormData(map[ctrl.model.provider])

		this.getButtons = function() {
			return {
				apply: {
					title: 'Apply',
					icon: 'fa fa-check',
					onClick: function() {
						ctrl.scope.submit.click()
					}
				}
			}				
		}

	}

});





$$.control.registerControl('addContactPage', {

	template: "<form bn-event=\"submit: onSubmit\" bn-form=\"from\">\n	<div bn-control=\"brainjs.inputgroup\">\n		<label>Name:</label><br>\n		<input type=\"text\" name=\"name\" style=\"min-width: 300px\" required=\"\">	\n	</div>\n	<br>\n\n	<div bn-control=\"brainjs.inputgroup\">\n		<label>Email:</label><br>\n		<input type=\"email\" name=\"email\" style=\"min-width: 300px\" required=\"\">	\n	</div>	\n\n	<input type=\"submit\" bn-bind=\"submit\" hidden=\"\">\n</form>\n",

	deps: ['breizbot.users', 'breizbot.pager'],

	props: {
		from: {}
	},

	init: function(elt, users, pager) {

		const {from} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				from
			},
			events: {
				onSubmit: function(ev) {
					ev.preventDefault()
					const data = $(this).getFormData()
					console.log('data', data)
					users.addContact(data.name, data.email).then(() => {
						console.log('contact added !')
						pager.popPage('addContact')
					})
					.catch((err) => {
						$$.ui.showAlert({title: 'Error', content: err.responseText})
					})
				}

			}
		})

		this.getButtons = function() {
			return {
				add: {
					title: 'Add',
					icon: 'fa fa-user-plus',
					onClick: function() {
						ctrl.scope.submit.click()
					}
				}
			}			
		}
	}


});





$$.control.registerControl('boxesPage', {

	template: "<div bn-show=\"showForm\">\n	<form bn-event=\"submit: onSubmit\">\n		<div bn-control=\"brainjs.inputgroup\">\n			<label>Name:</label>\n			<input type=\"text\" name=\"name\" required=\"\" autofocus=\"\">			\n		</div>\n		<input type=\"submit\" hidden=\"\" bn-bind=\"submit\">\n	</form>\n\n	<p>Select target folder:</p>\n</div>\n\n<div class=\"scrollPanelTree\">\n	<div \n		class=\"tree\" \n		bn-control=\"brainjs.tree\"\n		bn-data=\"{source: mailboxes}\"\n		bn-iface=\"tree\"\n	></div>\n</div>\n\n\n",

	deps: ['app.mails', 'breizbot.pager'],

	props: {
		currentAccount: '',
		showForm: false
	},

	init: function(elt, srvMail, pager) {

		const {currentAccount, showForm} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				mailboxes: [],
				showForm
			},
			events: {
				onSubmit: function(ev) {
					ev.preventDefault()
					const {name} = $(this).getFormData()
					//console.log('onSubmit', name)

					const {tree} = ctrl.scope
					const node = tree.getActiveNode()
					if (node == null) {
						$$.ui.showAlert({title: 'Warning', content: 'Please select a target mailbox'})
						return
					}
					let targetName = tree.getNodePath(node) + '/' + name
					//console.log('targetName', targetName)
					const token = targetName.split('/')
					token.shift()
					targetName = token.join('/')
					//console.log('targetName', targetName)


					pager.popPage(targetName)					
				}
			}
		})


		function loadMailboxes() {
			console.log('loadMailboxes')
			srvMail.getMailboxes(currentAccount).then((mailboxes) => {
				console.log('mailboxes', mailboxes)
				if (showForm) {
					ctrl.setData({
						mailboxes: [{
							title: 'Folders',
							folder: true,
							children: mailboxes,
							expanded: true
						}]
					})
				}
				else {
					ctrl.setData({
						mailboxes
					})
				}
			})
		}

		loadMailboxes()

		this.getButtons = function() {
			return {
				apply: {
					title: 'Apply',
					icon: 'fa fa-check',
					onClick: function() {
						if (showForm) {
							ctrl.scope.submit.click()
							return
						}
		
						const {tree} = ctrl.scope
						const node = tree.getActiveNode()
						if (node == null) {
							$$.ui.showAlert({title: 'Select Target Mailbox', content: 'Please select a target mailbox'})
							return
						}
						const targetName = tree.getNodePath(node)
		
						pager.popPage(targetName)
		
					}
				}
			}					
		}

	}


});





$$.control.registerControl('mailboxPage', {

	template: "<div class=\"toolbar\">\n	<div>\n		<div bn-show=\"show1\">\n			<span >Page: <span bn-text=\"text1\"></span></span>\n			<button class=\"w3-button\" title=\"previous page\" bn-event=\"click: onPrevPage\">\n				<i class=\"fa fa-angle-left\"></i>\n			</button>			\n			<button class=\"w3-button\" title=\"next page\" bn-event=\"click: onNextPage\">\n				<i class=\"fa fa-angle-right\"></i>\n			</button>			\n		</div>\n		<div bn-show=\"loading\" class=\"loading\">\n			<i class=\"fa fa-spinner fa-pulse\"></i>\n			loading ...\n		</div>\n	</div>\n	<div class=\"nbMsg\"><strong bn-text=\"nbMsg\"></strong>&nbsp;Messages</div>		\n</div>\n\n<div class=\"scrollPanelTable\">\n	<table class=\"w3-table-all w3-hoverable w3-small\">\n		<thead>\n			<tr class=\"w3-green\">\n				<th><input type=\"checkbox\" bn-event=\"click: onMainCheckBoxClick\" bn-val=\"check\" bn-update=\"click\"></th>\n				<th bn-show=\"!isSentBox\">From</th>\n				<th bn-show=\"isSentBox\">To</th>\n				<th>Subject</th>\n				<th title=\"nb Attachments\"><i class=\"fa fa-paperclip\"></i></th>\n				<th>Date</th>\n			</tr>\n		</thead>\n		<tbody bn-each=\"messages\" bn-event=\"click.item: onItemClick\">\n			<tr bn-class=\"{unseen: !isSeen}\">\n				<th><input type=\"checkbox\" class=\"check\" ></th>\n				<td bn-text=\"$scope.$i.from.name\" bn-attr=\"{title: $scope.$i.from.email}\" bn-show=\"!isSentBox\"></td>\n				<td bn-text=\"text2\" bn-attr=\"attr1\" bn-show=\"isSentBox\"></td>\n				<td bn-text=\"$scope.$i.subject\" class=\"item\" ></td>\n				<td bn-text=\"$scope.$i.nbAttachments\"></td>\n				<td bn-text=\"getDate\"></td>\n			</tr>\n		</tbody>\n	</table>\n</div>\n\n\n",

	deps: ['app.mails', 'breizbot.pager'],

	props: {
		currentAccount: '',
		mailboxName: ''
	},

	init: function(elt, srvMail, pager) {

		const {currentAccount, mailboxName} = this.props

		const ctrl = $$.viewController(elt, {
			data: {
				messages: [],
				nbMsg: 0,
				pageNo: 0,
				nbPage: 0,
				check: false,
				loading: false,
				mailboxName,
				show1: function() {
					return !this.loading && this.nbMsg > 0
				},
				text1: function() {
					return `${this.pageNo} / ${this.nbPage}`
				},
				text2: function(scope) {
					return scope.$i.to[0] && scope.$i.to[0].name
				},
				attr1: function(scope) {
					return {title: scope.$i.to[0] && scope.$i.to[0].email}
				},

				getDate: function(scope) {
					//console.log('getDate', date)
					const date = scope.$i.date
					const d = new Date(date)
					//console.log('d', d)
					return d.toLocaleDateString('fr-FR')
				},

				isSeen: function(scope) {
					return scope.$i.flags.includes('\\Seen')
				},

				isSentBox: function() {
					return this.mailboxName == 'Sent'
				}

			},
			events: {
				onItemClick: function(ev) {
					// $(this).closest('tbody').find('tr').removeClass('w3-blue')
					// $(this).addClass('w3-blue')
					const idx = $(this).closest('tr').index()
					const item = ctrl.model.messages[idx]
					pager.pushPage('messagePage', {
						title: `Message #${ctrl.model.nbMsg - item.seqno + 1}`,
						props: {
							currentAccount,
							mailboxName,
							item							
						},
						onBack: load
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

			ctrl.setData({loading: true})

			srvMail.openMailbox(currentAccount, mailboxName, pageNo).then((data) => {
				console.log('data', data)
				const {messages, nbMsg} = data
				ctrl.setData({
					loading: false,
					check: false,
					pageNo,
					nbPage: Math.ceil(nbMsg / 20),
					nbMsg,
					messages: messages.reverse()
				})
			})			
		}

		function getSeqNos() {
			const items = elt.find('.check:checked')
			const seqNos = []
			items.each(function() {
				const idx = $(this).closest('tr').index()
				seqNos.push(ctrl.model.messages[idx].seqno)
			})
			console.log('seqNos', seqNos)
			return seqNos
		}

		function deleteMessage() {
			const seqNos = getSeqNos()
			if (seqNos.length == 0) {
				$$.ui.showAlert({title: 'Delete Message', content: 'Please select one or severall messages !'})
				return
			}

			srvMail.deleteMessage(currentAccount, mailboxName, seqNos).then(() => {
				console.log('Messages deleted')
				load()
			})
		}

		function moveMessage() {
			const seqNos = getSeqNos()
			if (seqNos.length == 0) {
				$$.ui.showAlert({title: 'Move Message', content: 'Please select one or severall messages !'})
				return
			}

			pager.pushPage('boxesPage', {
				title: 'Select target mailbox',
				props: {
					currentAccount
				},
				onReturn: function(targetName) {
					if (targetName == mailboxName) {
						$$.ui.showAlert({title: 'Select Target Mailbox', content: 'Target mailbox must be different from current mailbox'})
						return
					}

					srvMail.moveMessage(currentAccount, mailboxName, targetName, seqNos)
					.then(() => {
						load()
					})
				}
			})
			// srvMail.deleteMessage(currentAccount, mailboxName, seqNos).then(() => {
			// 	console.log('Messages deleted')
			// 	load()
			// })
		}		

		load(1)

		function newMessage() {
			pager.pushPage('writeMailPage', {
				title: 'New Message',
				props: {
					accountName: currentAccount
				},
				onReturn: function() {
					if (mailboxName == 'Sent') {
						load()
					}
				}
			})			
		}

		this.getButtons = function() {
			return {
				reload: {
					icon: 'fa fa-sync-alt',
					title: 'Update',
					onClick: function() {
						load(1)
					}
				},
				newMail: {
					icon: 'fa fa-envelope',
					title: 'New Message',
					onClick: newMessage
				},
				move: {
					icon: 'fa fa-file-export',
					title: 'Move selected messages',
					onClick: moveMessage
				},
				delete: {
					icon: 'fa fa-trash',
					title: 'Delete selected messages',
					onClick: deleteMessage
				}	
			}	
				
		}

	}


});





$$.control.registerControl('contactsPage', {

	template: "<div class=\"scrollPanel\">\n	<div bn-control=\"breizbot.contacts\" data-show-selection=\"true\" bn-iface=\"contacts\"></div>\n	\n</div>\n\n\n",

	deps: ['breizbot.pager'],

	init: function(elt, pager) {

		const ctrl = $$.viewController(elt)


		this.getButtons = function() {
			return {
				ok: {
					title: 'Apply',
					icon: 'fa fa-check',
					onClick: function() {
						pager.popPage(ctrl.scope.contacts.getSelection())

					}
				}
			}					
		}
	}


});





$$.control.registerControl('messagePage', {

	template: "<div bn-show=\"loading\" class=\"loading\">\n	<i class=\"fa fa-spinner fa-pulse\"></i>\n	loading ...\n</div>\n<div class=\"header w3-blue\" bn-show=\"!loading\">\n	<div class=\"from\"><strong>From:</strong><a href=\"#\" bn-text=\"item.from.name\" bn-event=\"click: onAddContact\" bn-data=\"{addr: item.from}\"></a></div>\n	<div class=\"subject\"><strong>Subject:</strong><span bn-text=\"item.subject\" ></span></div>\n	<div bn-show=\"show1\" class=\"to\">\n		<strong bn-event=\"click: onToggleDiv\"><i class=\"fa fa-caret-down fa-fw\"></i>\n		To</strong>\n		<ul bn-each=\"item.to\" bn-event=\"click.contact: onAddContact\">\n			<li>\n				<a href=\"#\" bn-text=\"$scope.$i.name\" class=\"contact\"></a>				\n			</li>\n		</ul>\n	</div>\n	<div class=\"attachments\" bn-show=\"show2\">\n		<strong bn-event=\"click: onToggleDiv\"><i class=\"fa fa-caret-down fa-fw\"></i>\n		Attachments</strong>\n		<ul  bn-each=\"attachments\" bn-event=\"click.item: openAttachment\">\n			<li>\n				<a href=\"#\" bn-text=\"$scope.$i.name\" class=\"item\"></a>\n				<span bn-text=\"getSize\"></span>\n			</li>\n		</ul>\n	</div>\n	\n</div>\n\n<div class=\"mainHtml\" bn-show=\"show4\">\n	<div bn-show=\"show3\" class=\"embeddedImages w3-pale-yellow\">\n		<a href=\"#\" bn-event=\"click: onEmbeddedImages\">Download embedded images</a>\n	</div>\n	<iframe bn-attr=\"{srcdoc:text}\" bn-bind=\"iframe\" bn-event=\"load: onFrameLoaded\"></iframe>\n</div>\n\n<div class=\"mainText\" bn-show=\"show5\">\n 	<pre bn-text=\"text\"></pre>\n</div>",

	deps: ['app.mails', 'breizbot.scheduler', 'breizbot.pager', 'breizbot.files'],

	props: {
		currentAccount: '',
		mailboxName: '',
		item: null
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
					const {item} = ctrl.model
					const idx = $(this).closest('li').index()
					let from = (idx < 0) ? item.from : item.to[idx]
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

		this.getButtons = function() {
			return {
				reply: {
					icon: 'fa fa-reply',
					title: 'Reply',
					onClick: function() {
						reply('reply')
					}
				},
				replyAll: {
					icon: 'fa fa-reply-all',
					title: 'Reply All',
					onClick: function() {
						reply('replyAll')
					}
				},
				forward: {
					icon: 'fa fa-share-square',
					title: 'Forward',
					onClick: function() {
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
		}
		
		function reply(action) {
			console.log('reply')

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

		}


	}


});





$$.control.registerControl('writeMailPage', {

	template: "<form bn-event=\"submit: onSend\" bn-form=\"data\">\n	<div class=\"header\">\n		<div bn-control=\"brainjs.inputgroup\">\n			<div class=\"openContactPanel\">\n				<a bn-event=\"click: openContact\" href=\"#\" class=\"w3-text-indigo\">To:</a>\n			</div>\n			<input type=\"email\" multiple=\"true\" name=\"to\" bn-prop=\"prop1\" required=\"\" bn-bind=\"to\">		\n		</div>\n\n		<div bn-control=\"brainjs.inputgroup\">\n			<label>Subject:</label>\n			<input type=\"text\" name=\"subject\" required=\"\">		\n		</div>	\n\n		<div bn-show=\"show1\" class=\"attachments\">\n			<label><i class=\"fa fa-paperclip\"></i></label>			\n			<ul bn-each=\"attachments\" bn-event=\"click.delete: onRemoveAttachment\">\n				<li>\n					<span bn-text=\"$scope.$i.fileName\"></span>\n					<i class=\"fa fa-times delete\"></i>\n				</li>\n			</ul>\n		</div>\n	</div>\n	<div bn-control=\"brainjs.htmleditor\" class=\"content\" name=\"html\" bn-iface=\"content\"></div>\n<!-- 	<textarea name=\"text\" bn-bind=\"content\"></textarea>	\n -->	<input type=\"submit\" hidden=\"\" bn-bind=\"submit\">\n</form>\n",

	deps: ['app.mails', 'breizbot.pager'],

	props: {
		accountName: '',
		data: {}
	},

	init: function(elt, srvMail, pager) {

		const {accountName, data} = this.props
		console.log('data', data)

		const ctrl = $$.viewController(elt, {
			data: {
				data,
				attachments: [],
				show1: function() {return this.attachments.length > 0},
				prop1: function() {return {autofocus: this.data.html == undefined}}
			},
			events: {
				onSend: function(ev) {
					console.log('onSend')
					ev.preventDefault()
					const data = $(this).getFormData()
					console.log('data', data)
					const {attachments} = ctrl.model
					if (attachments.length > 0) {
						data.attachments = attachments.map((a) => a.rootDir + a.fileName)
					}

					srvMail.sendMail(accountName, data)
					.then(() => {
						pager.popPage()
					})
					.catch((e) => {
						$$.ui.showAlert({title: 'Error', content: e.responseText})
					})

				},
				openContact: function() {
					console.log('openContact')
					pager.pushPage('contactsPage', {
						title: 'Select a contact',
						onReturn: function(friends) {
							const contacts = friends.map((a) => a.contactEmail)
							console.log('contacts', contacts)
							const to = ctrl.scope.to.val()
							console.log('to', to)

							if (to != '') {
								contacts.unshift(to)
							}
							ctrl.setData({data: {to: contacts.join(',')}})							
						}
					})
				},
				onRemoveAttachment: function(ev) {
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

		this.getButtons = function() {
			return {
				attachment: {
					icon: 'fa fa-paperclip',
					title: 'Add attachment',
					onClick: function() {
						pager.pushPage('breizbot.files', {
							title: 'Select a file to attach',
							props: {
								showThumbnail: true
							},
							events: {
								fileclick: function(ev, data) {
									pager.popPage(data)
								}
							},
							onReturn: function(data) {
								const {fileName, rootDir} = data
								ctrl.model.attachments.push({fileName, rootDir})
								ctrl.update()						
							}
						})
		
					}
				},
				send: {
					icon: 'fa fa-paper-plane',
					title: 'Send Message',
					onClick: function() {
						ctrl.scope.submit.click()
					}
				}
			}				
		}

	}
})
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJzZXJ2aWNlcy9tYWlscy5qcyIsInBhZ2VzL2FjY291bnQvYWNjb3VudC5qcyIsInBhZ2VzL2FkZENvbnRhY3QvYWRkQ29udGFjdC5qcyIsInBhZ2VzL2JveGVzL2JveGVzLmpzIiwicGFnZXMvbWFpbGJveC9tYWlsYm94LmpzIiwicGFnZXMvY29udGFjdHMvY29udGFjdHMuanMiLCJwYWdlcy9tZXNzYWdlL21lc3NhZ2UuanMiLCJwYWdlcy93cml0ZU1haWwvd3JpdGVNYWlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNU5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdFVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdyb290UGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cdDxkaXYgY2xhc3M9XFxcImluZm9cXFwiPlxcblx0XHQ8c3BhbiBibi1zaG93PVxcXCJzaG93MVxcXCI+WW91IGhhdmUgbm8gZW1haWwgYWNjb3VudDwvc3Bhbj5cXG5cdFx0PGRpdiBibi1zaG93PVxcXCJzaG93MlxcXCIgY2xhc3M9XFxcImFjY291bnRcXFwiPlxcblx0XHRcdDxzcGFuPkFjY291bnQ6Jm5ic3A7PC9zcGFuPiBcXG5cdFx0XHQ8ZGl2IFxcblx0XHRcdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy5zZWxlY3RtZW51XFxcIiBcXG5cdFx0XHRcdGJuLWRhdGE9XFxcIntpdGVtczogYWNjb3VudHN9XFxcIiBcXG5cdFx0XHRcdGJuLXZhbD1cXFwiY3VycmVudEFjY291bnRcXFwiXFxuXHRcdFx0XHRibi1ldmVudD1cXFwic2VsZWN0bWVudWNoYW5nZTogb25BY2NvdW50Q2hhbmdlXFxcIj5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0PC9kaXY+XFxuXHRcdFxcblx0PC9kaXY+XFxuXHQ8ZGl2Plxcblx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuY29udGV4dG1lbnVcXFwiIFxcblx0XHRcdGJuLWRhdGE9XFxcIntpdGVtczogZ2V0SXRlbXN9XFxcIiBcXG5cdFx0XHRkYXRhLXRyaWdnZXI9XFxcImxlZnRcXFwiIFxcblx0XHRcdGNsYXNzPVxcXCJ3My1idXR0b24gdzMtYmx1ZVxcXCIgXFxuXHRcdFx0Ym4tZXZlbnQ9XFxcImNvbnRleHRtZW51Y2hhbmdlOiBvbk1lbnVcXFwiXFxuXHRcdFx0Plxcblx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWVsbGlwc2lzLXZcXFwiPjwvaT5cXG4gICAgXHRcXG5cdFx0PC9kaXY+XHRcdFxcblx0XHRcXG5cdDwvZGl2Plxcblx0XFxuPC9kaXY+XFxuXFxuPGRpdj5cXG5cdFNlbGVjdCBmb2xkZXIgdG8gb3BlbjpcXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFRyZWVcXFwiPlxcblx0PGRpdiBcXG5cdFx0Y2xhc3M9XFxcInRyZWVcXFwiIFxcblx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLnRyZWVcXFwiXFxuXHRcdGJuLWRhdGE9XFxcIntzb3VyY2U6IG1haWxib3hlc31cXFwiXFxuXHRcdGJuLWV2ZW50PVxcXCJ0cmVlYWN0aXZhdGU6IG9uVHJlZUFjdGl2YXRlXFxcIlxcblx0XHRibi1pZmFjZT1cXFwidHJlZVxcXCJcXG5cdD48L2Rpdj5cXG48L2Rpdj5cXG5cXG5cXG5cIixcblxuXHRkZXBzOiBbJ2FwcC5tYWlscycsICdicmVpemJvdC5wYWdlciddLFxuXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBzcnZNYWlsLCBwYWdlcikge1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRhY2NvdW50czogW10sXG5cdFx0XHRcdGN1cnJlbnRBY2NvdW50OiAnJyxcblx0XHRcdFx0bWFpbGJveGVzOiBbXSxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmFjY291bnRzLmxlbmd0aCA9PSAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5hY2NvdW50cy5sZW5ndGggPiAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldEl0ZW1zOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRpZiAodGhpcy5hY2NvdW50cy5sZW5ndGggPT0gMCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdFx0YWRkOiB7bmFtZTogJ0FkZCBBY2NvdW50JywgaWNvbjogJ2ZhcyBmYS1wbHVzJ30sXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRhZGQ6IHtuYW1lOiAnQWRkIEFjY291bnQnLCBpY29uOiAnZmFzIGZhLXBsdXMnfSxcblx0XHRcdFx0XHRcdGVkaXQ6IHtuYW1lOiAnRWRpdCBTZWxlY3RlZCBBY2NvdW50JywgaWNvbjogJ2ZhcyBmYS1lZGl0J30sXG5cdFx0XHRcdFx0XHRzZXAyOiAnLS0tLS0tJyxcblx0XHRcdFx0XHRcdG5ld0ZvbGRlcjoge25hbWU6ICdOZXcgRm9sZGVyJywgaWNvbjogJ2ZhcyBmYS1mb2xkZXItcGx1cyd9LFxuXHRcdFx0XHRcdFx0c2VwOiAnLS0tLS0tJyxcblx0XHRcdFx0XHRcdG5ldzoge25hbWU6ICdOZXcgTWVzc2FnZScsIGljb246ICdmYXMgZmEtZW52ZWxvcGUnfVx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25NZW51OiBmdW5jdGlvbihldiwgZGF0YSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbk1lbnUnLCBkYXRhKVxuXHRcdFx0XHRcdGlmIChkYXRhLmNtZCA9PSAnYWRkJykge1xuXHRcdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2FjY291bnRQYWdlJywge1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ0FkZCBNYWlsIEFjY291bnQnLFxuXHRcdFx0XHRcdFx0XHRvblJldHVybjogbG9hZEFjY291bnRcblx0XHRcdFx0XHRcdH0pXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChkYXRhLmNtZCA9PSAnbmV3Jykge1xuXHRcdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ3dyaXRlTWFpbFBhZ2UnLCB7XG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnTmV3IE1lc3NhZ2UnLFxuXHRcdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRcdGFjY291bnROYW1lOiBjdHJsLm1vZGVsLmN1cnJlbnRBY2NvdW50XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChkYXRhLmNtZCA9PSAnZWRpdCcpIHtcblx0XHRcdFx0XHRcdHNydk1haWwuZ2V0TWFpbEFjY291bnQoY3RybC5tb2RlbC5jdXJyZW50QWNjb3VudCkudGhlbigoZGF0YSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYWNjb3VudFBhZ2UnLCB7XG5cdFx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFZGl0IE1haWwgQWNjb3VudCcsXG5cdFx0XHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGFcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0pXHRcdFx0XHRcdFx0XG5cblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChkYXRhLmNtZCA9PSAnbmV3Rm9sZGVyJykge1xuXHRcdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JveGVzUGFnZScsIHtcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdBZGQgbmV3IGZvbGRlcicsXG5cdFx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdFx0Y3VycmVudEFjY291bnQ6IGN0cmwubW9kZWwuY3VycmVudEFjY291bnQsXG5cdFx0XHRcdFx0XHRcdFx0c2hvd0Zvcm06IHRydWVcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0b25SZXR1cm46IGZ1bmN0aW9uKHRhcmdldE5hbWUpIHtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25SZXR1cm4nLCB0YXJnZXROYW1lKVxuXHRcdFx0XHRcdFx0XHRcdHNydk1haWwuYWRkTWFpbGJveChjdHJsLm1vZGVsLmN1cnJlbnRBY2NvdW50LCB0YXJnZXROYW1lKS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRcdGxvYWRNYWlsYm94ZXMoKVxuXHRcdFx0XHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25BY2NvdW50Q2hhbmdlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25BY2NvdW50Q2hhbmdlJywgJCh0aGlzKS5nZXRWYWx1ZSgpKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7Y3VycmVudEFjY291bnQ6ICQodGhpcykuZ2V0VmFsdWUoKX0pXG5cdFx0XHRcdFx0bG9hZE1haWxib3hlcygpXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25UcmVlQWN0aXZhdGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblRyZWVBY3RpdmF0ZScpXG5cdFx0XHRcdFx0Y29uc3QgdHJlZSA9ICQodGhpcykuaWZhY2UoKVxuXG5cdFx0XHRcdFx0Y29uc3Qgbm9kZSA9ICB0cmVlLmdldEFjdGl2ZU5vZGUoKVxuXG5cdFx0XHRcdFx0Y29uc3QgbWFpbGJveE5hbWUgPSB0cmVlLmdldE5vZGVQYXRoKG5vZGUpXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdtYWlsYm94TmFtZScsIG1haWxib3hOYW1lKVxuXHRcdFx0XHRcdGNvbnN0IHtjdXJyZW50QWNjb3VudH0gPSBjdHJsLm1vZGVsXG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ21haWxib3hQYWdlJywge1xuXHRcdFx0XHRcdFx0dGl0bGU6IG5vZGUudGl0bGUsXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRjdXJyZW50QWNjb3VudCxcblx0XHRcdFx0XHRcdFx0bWFpbGJveE5hbWVcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRvbkJhY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRjb25zdCBhY3RpdmVOb2RlID0gY3RybC5zY29wZS50cmVlLmdldEFjdGl2ZU5vZGUoKVxuXHRcdFx0XHRcdFx0XHRpZiAoYWN0aXZlTm9kZSAhPSBudWxsKSB7XG5cdFx0XHRcdFx0XHRcdFx0YWN0aXZlTm9kZS5zZXRBY3RpdmUoZmFsc2UpXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cblx0XHRmdW5jdGlvbiBsb2FkQWNjb3VudCgpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdsb2FkQWNjb3VudCcpXG5cdFx0XHRzcnZNYWlsLmdldE1haWxBY2NvdW50cygpLnRoZW4oKGFjY291bnRzKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdhY2NvdW50cycsIGFjY291bnRzKVxuXHRcdFx0XHRpZiAoYWNjb3VudHMubGVuZ3RoID09IDApIHtcblx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zdCBjdXJyZW50QWNjb3VudCA9IGFjY291bnRzWzBdXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdjdXJyZW50QWNjb3VudCcsIGN1cnJlbnRBY2NvdW50KVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe2FjY291bnRzLCBjdXJyZW50QWNjb3VudH0pXG5cdFx0XHRcdGxvYWRNYWlsYm94ZXMoKVxuXHRcdFx0fSkuY2F0Y2goKGVycikgPT4ge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnRXJyb3InLCBjb250ZW50OiBlcnJ9KVxuXHRcdFx0fSlcdFx0XHRcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBsb2FkTWFpbGJveGVzKCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2xvYWRNYWlsYm94ZXMnKVxuXHRcdFx0Y29uc3Qge2N1cnJlbnRBY2NvdW50fSA9IGN0cmwubW9kZWxcblx0XHRcdHNydk1haWwuZ2V0TWFpbGJveGVzKGN1cnJlbnRBY2NvdW50KS50aGVuKChtYWlsYm94ZXMpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ21haWxib3hlcycsIG1haWxib3hlcylcblxuXHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdG1haWxib3hlc1xuXHRcdFx0XHR9KVxuXHRcdFx0fSlcblx0XHR9XG5cblx0XHRsb2FkQWNjb3VudCgpXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIkJC5zZXJ2aWNlLnJlZ2lzdGVyU2VydmljZSgnYXBwLm1haWxzJywge1xuXG5cdGRlcHM6IFsnYnJlaXpib3QuaHR0cCddLFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgaHR0cCkge1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGdldE1haWxBY2NvdW50czogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLmdldCgnL2dldE1haWxBY2NvdW50cycpXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXRNYWlsQWNjb3VudDogZnVuY3Rpb24obmFtZSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvZ2V0TWFpbEFjY291bnQnLCB7bmFtZX0pXG5cdFx0XHR9LFxuXG5cdFx0XHRjcmVhdGVNYWlsQWNjb3VudDogZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvY3JlYXRlTWFpbEFjY291bnQnLCBkYXRhKVxuXHRcdFx0fSxcblxuXHRcdFx0dXBkYXRlTWFpbEFjY291bnQ6IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL3VwZGF0ZU1haWxBY2NvdW50JywgZGF0YSlcblx0XHRcdH0sXG5cblx0XHRcdGdldE1haWxib3hlczogZnVuY3Rpb24obmFtZSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvZ2V0TWFpbGJveGVzYCwge25hbWV9KVxuXHRcdFx0fSxcblxuXHRcdFx0YWRkTWFpbGJveDogZnVuY3Rpb24obmFtZSwgbWFpbGJveE5hbWUpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2FkZE1haWxib3hgLCB7bmFtZSwgbWFpbGJveE5hbWV9KVxuXHRcdFx0fSxcblxuXHRcdFx0b3Blbk1haWxib3g6IGZ1bmN0aW9uKG5hbWUsIG1haWxib3hOYW1lLCBwYWdlTm8pIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL29wZW5NYWlsYm94YCwge25hbWUsIG1haWxib3hOYW1lLCBwYWdlTm99KVxuXHRcdFx0fSxcblxuXHRcdFx0b3Blbk1lc3NhZ2U6IGZ1bmN0aW9uKG5hbWUsIG1haWxib3hOYW1lLCBzZXFObywgcGFydElEKVx0e1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvb3Blbk1lc3NhZ2VgLCB7bmFtZSwgbWFpbGJveE5hbWUsIHNlcU5vLCBwYXJ0SUR9KVxuXHRcdFx0fSxcblxuXHRcdFx0b3BlbkF0dGFjaG1lbnQ6IGZ1bmN0aW9uKG5hbWUsIG1haWxib3hOYW1lLCBzZXFObywgcGFydElEKVx0e1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvb3BlbkF0dGFjaG1lbnRgLCB7bmFtZSwgbWFpbGJveE5hbWUsIHNlcU5vLCBwYXJ0SUR9KVxuXHRcdFx0fSxcblxuXHRcdFx0ZGVsZXRlTWVzc2FnZTogZnVuY3Rpb24obmFtZSwgbWFpbGJveE5hbWUsIHNlcU5vcylcdHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2RlbGV0ZU1lc3NhZ2VgLCB7bmFtZSwgbWFpbGJveE5hbWUsIHNlcU5vc30pXG5cdFx0XHR9LFx0XG5cblx0XHRcdG1vdmVNZXNzYWdlOiBmdW5jdGlvbihuYW1lLCBtYWlsYm94TmFtZSwgdGFyZ2V0TmFtZSwgc2VxTm9zKVx0e1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvbW92ZU1lc3NhZ2VgLCB7bmFtZSwgbWFpbGJveE5hbWUsIHRhcmdldE5hbWUsIHNlcU5vc30pXG5cdFx0XHR9LFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFxuXG5cdFx0XHRzZW5kTWFpbDogZnVuY3Rpb24oYWNjb3VudE5hbWUsIGRhdGEpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL3NlbmRNYWlsYCwge2FjY291bnROYW1lLCBkYXRhfSlcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0JGlmYWNlOiBgXG5cdFx0Z2V0TWFpbEFjY291bnQoKTpQcm9taXNlO1xuXHRcdGNyZWF0ZU1haUFjY291bnQoZGF0YSk6UHJvbWlzZTtcblx0XHRnZXRNYWlsYm94ZXMobmFtZSk6UHJvbWlzZTtcblx0XHRvcGVuTWFpbGJveChuYW1lLCBtYWlsYm94TmFtZSwgcGFnZU5vKTpQcm9taXNlO1xuXHRcdG9wZW5NZXNzYWdlKG5hbWUsIG1haWxib3hOYW1lLCBzZXFObywgcGFydElEKTpQcm9taXNlO1xuXHRcdG9wZW5BdHRhY2htZW50KG5hbWUsIG1haWxib3hOYW1lLCBzZXFObywgcGFydElEKTpQcm9taXNlO1xuXHRcdGRlbGV0ZU1lc3NhZ2UobmFtZSwgbWFpbGJveE5hbWUsIHNlcU5vcyk6UHJvbWlzZTtcblx0XHRtb3ZlTWVzc2FnZShuYW1lLCBtYWlsYm94TmFtZSwgdGFyZ2V0TmFtZSwgc2VxTm9zKTpQcm9taXNlXG5cdFx0YFxufSk7XG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYWNjb3VudFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwibWFpblxcXCI+XFxuXHQ8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblN1Ym1pdFxcXCIgYm4tYmluZD1cXFwiZm9ybVxcXCIgYm4tZm9ybT1cXFwiZGF0YVxcXCI+XFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHQ8bGFiZWw+UHJvdmlkZXI8L2xhYmVsPlxcblx0XHRcdDxzcGFuIGJuLWNvbnRyb2w9XFxcImJyYWluanMuc2VsZWN0bWVudVxcXCIgXFxuXHRcdFx0XHRibi1ldmVudD1cXFwic2VsZWN0bWVudWNoYW5nZTogb25Qcm92aWRlckNoYW5nZVxcXCIgYm4tdmFsPVxcXCJwcm92aWRlclxcXCJcXG5cdFx0XHRcdGJuLWRhdGE9XFxcIntpdGVtczogcHJvdmlkZXJzfVxcXCJcXG5cdFx0XHRcdGJuLXByb3A9XFxcIntkaXNhYmxlZDogaXNFZGl0fVxcXCJcXG5cdFx0XHQ+XFxuXHRcdFx0PC9zcGFuPlx0XHRcXG5cdFx0PC9kaXY+XHRcdFx0XFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHQ8bGFiZWw+QWNjb3VudCBOYW1lPC9sYWJlbD5cXG5cdFx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwibmFtZVxcXCIgcmVxdWlyZWQ9XFxcIlxcXCIgYXV0b2ZvY3VzPVxcXCJcXFwiIGJuLXByb3A9XFxcIntkaXNhYmxlZDogaXNFZGl0fVxcXCI+XHRcdFx0XFxuXHRcdDwvZGl2Plxcblxcblx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdFx0PGxhYmVsPlVzZXI8L2xhYmVsPlxcblx0XHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJ1c2VyXFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHQ8bGFiZWw+UGFzc3dvcmQ8L2xhYmVsPlxcblx0XHRcdDxpbnB1dCB0eXBlPVxcXCJwYXNzd29yZFxcXCIgbmFtZT1cXFwicHdkXFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHQ8bGFiZWw+RW1haWw8L2xhYmVsPlxcblx0XHRcdDxpbnB1dCB0eXBlPVxcXCJlbWFpbFxcXCIgbmFtZT1cXFwiZW1haWxcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cXG5cdFxcblxcblx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCIgYm4tc2hvdz1cXFwic2hvdzFcXFwiPlxcblx0XHRcdDxsYWJlbD5JTUFQIFNlcnZlcjwvbGFiZWw+XFxuXHRcdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcImltYXBIb3N0XFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cdFx0XHRcXG5cdFx0PC9kaXY+XHRcdFxcblxcblx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCIgIGJuLXNob3c9XFxcInNob3cxXFxcIj5cXG5cdFx0XHQ8bGFiZWw+U01UUCBTZXJ2ZXI8L2xhYmVsPlxcblx0XHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJzbXRwSG9zdFxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XHRcdFx0XFxuXHRcdDwvZGl2Plx0XHRcXG5cXG5cdFx0PGRpdiBjbGFzcz1cXFwiY29weVNlbnRcXFwiPlxcblx0XHRcdDxsYWJlbD5NYWtlIGEgY29weSBvZiBzZW50IG1haWwgaW4gU2VudCBmb2xkZXI8L2xhYmVsPlxcblx0XHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5mbGlwc3dpdGNoXFxcIiBibi1kYXRhPVxcXCJkYXRhMVxcXCIgbmFtZT1cXFwibWFrZUNvcHlcXFwiPjwvZGl2Plxcblx0XHQ8L2Rpdj5cXG5cXG5cdFx0PGlucHV0IHR5cGU9XFxcInN1Ym1pdFxcXCIgaGlkZGVuPVxcXCJcXFwiIGJuLWJpbmQ9XFxcInN1Ym1pdFxcXCI+XFxuXHQ8L2Zvcm0+XFxuXFxuPC9kaXY+XCIsXG5cblx0ZGVwczogWydhcHAubWFpbHMnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHRcdGRhdGE6IG51bGxcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydk1haWwsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCB7ZGF0YX0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBtYXAgPSB7XG5cdFx0XHQnR21haWwnOiB7XG5cdFx0XHRcdGltYXBIb3N0OiAnaW1hcC5nbWFpbC5jb20nLFxuXHRcdFx0XHRzbXRwSG9zdDogJ3NtdHAuZ21haWwuY29tJ1xuXHRcdFx0fSxcblx0XHRcdCdPdXRsb29rJzoge1xuXHRcdFx0XHRpbWFwSG9zdDogJ2ltYXAub3V0bG9vay5jb20nLFxuXHRcdFx0XHRzbXRwSG9zdDogJ3NtdHAub3V0bG9vay5jb20nXG5cdFx0XHR9LFxuXHRcdFx0J0ZyZWUnOiB7XG5cdFx0XHRcdGltYXBIb3N0OiAnaW1hcC5mcmVlLmZyJyxcblx0XHRcdFx0c210cEhvc3Q6ICdzbXRwLmZyZWUuZnInXG5cdFx0XHR9LFxuXHRcdFx0J1NGUic6IHtcblx0XHRcdFx0aW1hcEhvc3Q6ICdpbWFwLnNmci5mcicsXG5cdFx0XHRcdHNtdHBIb3N0OiAnc210cC5zZnIuZnInXG5cdFx0XHR9LFxuXHRcdFx0J09yYW5nZSc6IHtcblx0XHRcdFx0aW1hcEhvc3Q6ICdpbWFwLm9yYW5nZS5mcicsXG5cdFx0XHRcdHNtdHBIb3N0OiAnc210cC5vcmFuZ2UuZnInXG5cdFx0XHR9LFxuXHRcdFx0J0JvdXlndWVzIFRlbGVjb20nOiB7XG5cdFx0XHRcdGltYXBIb3N0OiAnaW1hcC5iYm94LmZyJyxcblx0XHRcdFx0c210cEhvc3Q6ICdzbXRwLmJib3guZnInXG5cdFx0XHR9LFxuXHRcdFx0J090aGVyJzoge1xuXHRcdFx0XHRpbWFwSG9zdDogJycsXG5cdFx0XHRcdHNtdHBIb3N0OiAnJ1xuXHRcdFx0fSxcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRQcm92aWRlcihpbmZvKSB7XG5cdFx0XHRmb3IobGV0IGsgaW4gbWFwKSB7XG5cdFx0XHRcdGlmIChtYXBba10uaW1hcEhvc3QgPT0gaW5mby5pbWFwSG9zdCkge1xuXHRcdFx0XHRcdHJldHVybiBrXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiAnT3RoZXInXG5cdFx0fVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRwcm92aWRlcjogKGRhdGEgIT0gbnVsbCkgPyBnZXRQcm92aWRlcihkYXRhKSA6ICdHbWFpbCcsXG5cdFx0XHRcdHByb3ZpZGVyczogT2JqZWN0LmtleXMobWFwKSxcblx0XHRcdFx0ZGF0YSxcblx0XHRcdFx0aXNFZGl0OiBkYXRhICE9IG51bGwsXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbigpIHtyZXR1cm4gdGhpcy5wcm92aWRlciA9PSAnT3RoZXInfSxcblx0XHRcdFx0ZGF0YTE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB7aGVpZ2h0OiAyNSwgd2lkdGg6IDEwMCwgdGV4dHM6IHtsZWZ0OiAnWUVTJywgcmlnaHQ6ICdOTyd9fVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uU3VibWl0OiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHRjb25zdCBmb3JtRGF0YSA9ICQodGhpcykuZ2V0Rm9ybURhdGEoKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdmb3JtRGF0YScsIGZvcm1EYXRhKVxuXHRcdFx0XHRcdGlmIChkYXRhID09IG51bGwpIHtcblx0XHRcdFx0XHRcdHNydk1haWwuY3JlYXRlTWFpbEFjY291bnQoZm9ybURhdGEpLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKClcblx0XHRcdFx0XHRcdH0pXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0c3J2TWFpbC51cGRhdGVNYWlsQWNjb3VudChmb3JtRGF0YSkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoKVxuXHRcdFx0XHRcdFx0fSlcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25Qcm92aWRlckNoYW5nZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgcHJvdmlkZXIgPSAkKHRoaXMpLmdldFZhbHVlKClcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25Qcm92aWRlckNoYW5nZScsIHByb3ZpZGVyKVxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7cHJvdmlkZXJ9KVxuXG5cdFx0XHRcdFx0Y3RybC5zY29wZS5mb3JtLnNldEZvcm1EYXRhKG1hcFtwcm92aWRlcl0pXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0Y3RybC5zY29wZS5mb3JtLnNldEZvcm1EYXRhKG1hcFtjdHJsLm1vZGVsLnByb3ZpZGVyXSlcblxuXHRcdHRoaXMuZ2V0QnV0dG9ucyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0YXBwbHk6IHtcblx0XHRcdFx0XHR0aXRsZTogJ0FwcGx5Jyxcblx0XHRcdFx0XHRpY29uOiAnZmEgZmEtY2hlY2snLFxuXHRcdFx0XHRcdG9uQ2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0Y3RybC5zY29wZS5zdWJtaXQuY2xpY2soKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVx0XHRcdFx0XG5cdFx0fVxuXG5cdH1cblxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdhZGRDb250YWN0UGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblN1Ym1pdFxcXCIgYm4tZm9ybT1cXFwiZnJvbVxcXCI+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdDxsYWJlbD5OYW1lOjwvbGFiZWw+PGJyPlxcblx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwibmFtZVxcXCIgc3R5bGU9XFxcIm1pbi13aWR0aDogMzAwcHhcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlx0XFxuXHQ8L2Rpdj5cXG5cdDxicj5cXG5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0PGxhYmVsPkVtYWlsOjwvbGFiZWw+PGJyPlxcblx0XHQ8aW5wdXQgdHlwZT1cXFwiZW1haWxcXFwiIG5hbWU9XFxcImVtYWlsXFxcIiBzdHlsZT1cXFwibWluLXdpZHRoOiAzMDBweFxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XHRcXG5cdDwvZGl2Plx0XFxuXFxuXHQ8aW5wdXQgdHlwZT1cXFwic3VibWl0XFxcIiBibi1iaW5kPVxcXCJzdWJtaXRcXFwiIGhpZGRlbj1cXFwiXFxcIj5cXG48L2Zvcm0+XFxuXCIsXG5cblx0ZGVwczogWydicmVpemJvdC51c2VycycsICdicmVpemJvdC5wYWdlciddLFxuXG5cdHByb3BzOiB7XG5cdFx0ZnJvbToge31cblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHVzZXJzLCBwYWdlcikge1xuXG5cdFx0Y29uc3Qge2Zyb219ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRmcm9tXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uU3VibWl0OiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHRjb25zdCBkYXRhID0gJCh0aGlzKS5nZXRGb3JtRGF0YSgpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ2RhdGEnLCBkYXRhKVxuXHRcdFx0XHRcdHVzZXJzLmFkZENvbnRhY3QoZGF0YS5uYW1lLCBkYXRhLmVtYWlsKS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdjb250YWN0IGFkZGVkICEnKVxuXHRcdFx0XHRcdFx0cGFnZXIucG9wUGFnZSgnYWRkQ29udGFjdCcpXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQuY2F0Y2goKGVycikgPT4ge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0Vycm9yJywgY29udGVudDogZXJyLnJlc3BvbnNlVGV4dH0pXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdHRoaXMuZ2V0QnV0dG9ucyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0YWRkOiB7XG5cdFx0XHRcdFx0dGl0bGU6ICdBZGQnLFxuXHRcdFx0XHRcdGljb246ICdmYSBmYS11c2VyLXBsdXMnLFxuXHRcdFx0XHRcdG9uQ2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0Y3RybC5zY29wZS5zdWJtaXQuY2xpY2soKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVx0XHRcdFxuXHRcdH1cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYm94ZXNQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgYm4tc2hvdz1cXFwic2hvd0Zvcm1cXFwiPlxcblx0PGZvcm0gYm4tZXZlbnQ9XFxcInN1Ym1pdDogb25TdWJtaXRcXFwiPlxcblx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdFx0PGxhYmVsPk5hbWU6PC9sYWJlbD5cXG5cdFx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwibmFtZVxcXCIgcmVxdWlyZWQ9XFxcIlxcXCIgYXV0b2ZvY3VzPVxcXCJcXFwiPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cdFx0PGlucHV0IHR5cGU9XFxcInN1Ym1pdFxcXCIgaGlkZGVuPVxcXCJcXFwiIGJuLWJpbmQ9XFxcInN1Ym1pdFxcXCI+XFxuXHQ8L2Zvcm0+XFxuXFxuXHQ8cD5TZWxlY3QgdGFyZ2V0IGZvbGRlcjo8L3A+XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxUcmVlXFxcIj5cXG5cdDxkaXYgXFxuXHRcdGNsYXNzPVxcXCJ0cmVlXFxcIiBcXG5cdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy50cmVlXFxcIlxcblx0XHRibi1kYXRhPVxcXCJ7c291cmNlOiBtYWlsYm94ZXN9XFxcIlxcblx0XHRibi1pZmFjZT1cXFwidHJlZVxcXCJcXG5cdD48L2Rpdj5cXG48L2Rpdj5cXG5cXG5cXG5cIixcblxuXHRkZXBzOiBbJ2FwcC5tYWlscycsICdicmVpemJvdC5wYWdlciddLFxuXG5cdHByb3BzOiB7XG5cdFx0Y3VycmVudEFjY291bnQ6ICcnLFxuXHRcdHNob3dGb3JtOiBmYWxzZVxuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgc3J2TWFpbCwgcGFnZXIpIHtcblxuXHRcdGNvbnN0IHtjdXJyZW50QWNjb3VudCwgc2hvd0Zvcm19ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRtYWlsYm94ZXM6IFtdLFxuXHRcdFx0XHRzaG93Rm9ybVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblN1Ym1pdDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRcdFx0Y29uc3Qge25hbWV9ID0gJCh0aGlzKS5nZXRGb3JtRGF0YSgpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25TdWJtaXQnLCBuYW1lKVxuXG5cdFx0XHRcdFx0Y29uc3Qge3RyZWV9ID0gY3RybC5zY29wZVxuXHRcdFx0XHRcdGNvbnN0IG5vZGUgPSB0cmVlLmdldEFjdGl2ZU5vZGUoKVxuXHRcdFx0XHRcdGlmIChub2RlID09IG51bGwpIHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdXYXJuaW5nJywgY29udGVudDogJ1BsZWFzZSBzZWxlY3QgYSB0YXJnZXQgbWFpbGJveCd9KVxuXHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGxldCB0YXJnZXROYW1lID0gdHJlZS5nZXROb2RlUGF0aChub2RlKSArICcvJyArIG5hbWVcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCd0YXJnZXROYW1lJywgdGFyZ2V0TmFtZSlcblx0XHRcdFx0XHRjb25zdCB0b2tlbiA9IHRhcmdldE5hbWUuc3BsaXQoJy8nKVxuXHRcdFx0XHRcdHRva2VuLnNoaWZ0KClcblx0XHRcdFx0XHR0YXJnZXROYW1lID0gdG9rZW4uam9pbignLycpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygndGFyZ2V0TmFtZScsIHRhcmdldE5hbWUpXG5cblxuXHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UodGFyZ2V0TmFtZSlcdFx0XHRcdFx0XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cblx0XHRmdW5jdGlvbiBsb2FkTWFpbGJveGVzKCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2xvYWRNYWlsYm94ZXMnKVxuXHRcdFx0c3J2TWFpbC5nZXRNYWlsYm94ZXMoY3VycmVudEFjY291bnQpLnRoZW4oKG1haWxib3hlcykgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnbWFpbGJveGVzJywgbWFpbGJveGVzKVxuXHRcdFx0XHRpZiAoc2hvd0Zvcm0pIHtcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdFx0bWFpbGJveGVzOiBbe1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ0ZvbGRlcnMnLFxuXHRcdFx0XHRcdFx0XHRmb2xkZXI6IHRydWUsXG5cdFx0XHRcdFx0XHRcdGNoaWxkcmVuOiBtYWlsYm94ZXMsXG5cdFx0XHRcdFx0XHRcdGV4cGFuZGVkOiB0cnVlXG5cdFx0XHRcdFx0XHR9XVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRcdG1haWxib3hlc1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0bG9hZE1haWxib3hlcygpXG5cblx0XHR0aGlzLmdldEJ1dHRvbnMgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGFwcGx5OiB7XG5cdFx0XHRcdFx0dGl0bGU6ICdBcHBseScsXG5cdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLWNoZWNrJyxcblx0XHRcdFx0XHRvbkNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGlmIChzaG93Rm9ybSkge1xuXHRcdFx0XHRcdFx0XHRjdHJsLnNjb3BlLnN1Ym1pdC5jbGljaygpXG5cdFx0XHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHRcdFx0fVxuXHRcdFxuXHRcdFx0XHRcdFx0Y29uc3Qge3RyZWV9ID0gY3RybC5zY29wZVxuXHRcdFx0XHRcdFx0Y29uc3Qgbm9kZSA9IHRyZWUuZ2V0QWN0aXZlTm9kZSgpXG5cdFx0XHRcdFx0XHRpZiAobm9kZSA9PSBudWxsKSB7XG5cdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdTZWxlY3QgVGFyZ2V0IE1haWxib3gnLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBhIHRhcmdldCBtYWlsYm94J30pXG5cdFx0XHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Y29uc3QgdGFyZ2V0TmFtZSA9IHRyZWUuZ2V0Tm9kZVBhdGgobm9kZSlcblx0XHRcblx0XHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UodGFyZ2V0TmFtZSlcblx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cdFx0XHRcdFx0XG5cdFx0fVxuXG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ21haWxib3hQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblx0PGRpdj5cXG5cdFx0PGRpdiBibi1zaG93PVxcXCJzaG93MVxcXCI+XFxuXHRcdFx0PHNwYW4gPlBhZ2U6IDxzcGFuIGJuLXRleHQ9XFxcInRleHQxXFxcIj48L3NwYW4+PC9zcGFuPlxcblx0XHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcInByZXZpb3VzIHBhZ2VcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25QcmV2UGFnZVxcXCI+XFxuXHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtYW5nbGUtbGVmdFxcXCI+PC9pPlxcblx0XHRcdDwvYnV0dG9uPlx0XHRcdFxcblx0XHRcdDxidXR0b24gY2xhc3M9XFxcInczLWJ1dHRvblxcXCIgdGl0bGU9XFxcIm5leHQgcGFnZVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbk5leHRQYWdlXFxcIj5cXG5cdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1hbmdsZS1yaWdodFxcXCI+PC9pPlxcblx0XHRcdDwvYnV0dG9uPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cdFx0PGRpdiBibi1zaG93PVxcXCJsb2FkaW5nXFxcIiBjbGFzcz1cXFwibG9hZGluZ1xcXCI+XFxuXHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXNwaW5uZXIgZmEtcHVsc2VcXFwiPjwvaT5cXG5cdFx0XHRsb2FkaW5nIC4uLlxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2Plxcblx0PGRpdiBjbGFzcz1cXFwibmJNc2dcXFwiPjxzdHJvbmcgYm4tdGV4dD1cXFwibmJNc2dcXFwiPjwvc3Ryb25nPiZuYnNwO01lc3NhZ2VzPC9kaXY+XHRcdFxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsVGFibGVcXFwiPlxcblx0PHRhYmxlIGNsYXNzPVxcXCJ3My10YWJsZS1hbGwgdzMtaG92ZXJhYmxlIHczLXNtYWxsXFxcIj5cXG5cdFx0PHRoZWFkPlxcblx0XHRcdDx0ciBjbGFzcz1cXFwidzMtZ3JlZW5cXFwiPlxcblx0XHRcdFx0PHRoPjxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbk1haW5DaGVja0JveENsaWNrXFxcIiBibi12YWw9XFxcImNoZWNrXFxcIiBibi11cGRhdGU9XFxcImNsaWNrXFxcIj48L3RoPlxcblx0XHRcdFx0PHRoIGJuLXNob3c9XFxcIiFpc1NlbnRCb3hcXFwiPkZyb208L3RoPlxcblx0XHRcdFx0PHRoIGJuLXNob3c9XFxcImlzU2VudEJveFxcXCI+VG88L3RoPlxcblx0XHRcdFx0PHRoPlN1YmplY3Q8L3RoPlxcblx0XHRcdFx0PHRoIHRpdGxlPVxcXCJuYiBBdHRhY2htZW50c1xcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBhcGVyY2xpcFxcXCI+PC9pPjwvdGg+XFxuXHRcdFx0XHQ8dGg+RGF0ZTwvdGg+XFxuXHRcdFx0PC90cj5cXG5cdFx0PC90aGVhZD5cXG5cdFx0PHRib2R5IGJuLWVhY2g9XFxcIm1lc3NhZ2VzXFxcIiBibi1ldmVudD1cXFwiY2xpY2suaXRlbTogb25JdGVtQ2xpY2tcXFwiPlxcblx0XHRcdDx0ciBibi1jbGFzcz1cXFwie3Vuc2VlbjogIWlzU2Vlbn1cXFwiPlxcblx0XHRcdFx0PHRoPjxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgY2xhc3M9XFxcImNoZWNrXFxcIiA+PC90aD5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkuZnJvbS5uYW1lXFxcIiBibi1hdHRyPVxcXCJ7dGl0bGU6ICRzY29wZS4kaS5mcm9tLmVtYWlsfVxcXCIgYm4tc2hvdz1cXFwiIWlzU2VudEJveFxcXCI+PC90ZD5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCJ0ZXh0MlxcXCIgYm4tYXR0cj1cXFwiYXR0cjFcXFwiIGJuLXNob3c9XFxcImlzU2VudEJveFxcXCI+PC90ZD5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkuc3ViamVjdFxcXCIgY2xhc3M9XFxcIml0ZW1cXFwiID48L3RkPlxcblx0XHRcdFx0PHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5uYkF0dGFjaG1lbnRzXFxcIj48L3RkPlxcblx0XHRcdFx0PHRkIGJuLXRleHQ9XFxcImdldERhdGVcXFwiPjwvdGQ+XFxuXHRcdFx0PC90cj5cXG5cdFx0PC90Ym9keT5cXG5cdDwvdGFibGU+XFxuPC9kaXY+XFxuXFxuXFxuXCIsXG5cblx0ZGVwczogWydhcHAubWFpbHMnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHRcdGN1cnJlbnRBY2NvdW50OiAnJyxcblx0XHRtYWlsYm94TmFtZTogJydcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydk1haWwsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCB7Y3VycmVudEFjY291bnQsIG1haWxib3hOYW1lfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0bWVzc2FnZXM6IFtdLFxuXHRcdFx0XHRuYk1zZzogMCxcblx0XHRcdFx0cGFnZU5vOiAwLFxuXHRcdFx0XHRuYlBhZ2U6IDAsXG5cdFx0XHRcdGNoZWNrOiBmYWxzZSxcblx0XHRcdFx0bG9hZGluZzogZmFsc2UsXG5cdFx0XHRcdG1haWxib3hOYW1lLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuICF0aGlzLmxvYWRpbmcgJiYgdGhpcy5uYk1zZyA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0dGV4dDE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBgJHt0aGlzLnBhZ2VOb30gLyAke3RoaXMubmJQYWdlfWBcblx0XHRcdFx0fSxcblx0XHRcdFx0dGV4dDI6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLiRpLnRvWzBdICYmIHNjb3BlLiRpLnRvWzBdLm5hbWVcblx0XHRcdFx0fSxcblx0XHRcdFx0YXR0cjE6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHt0aXRsZTogc2NvcGUuJGkudG9bMF0gJiYgc2NvcGUuJGkudG9bMF0uZW1haWx9XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0Z2V0RGF0ZTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdnZXREYXRlJywgZGF0ZSlcblx0XHRcdFx0XHRjb25zdCBkYXRlID0gc2NvcGUuJGkuZGF0ZVxuXHRcdFx0XHRcdGNvbnN0IGQgPSBuZXcgRGF0ZShkYXRlKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2QnLCBkKVxuXHRcdFx0XHRcdHJldHVybiBkLnRvTG9jYWxlRGF0ZVN0cmluZygnZnItRlInKVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdGlzU2VlbjogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuJGkuZmxhZ3MuaW5jbHVkZXMoJ1xcXFxTZWVuJylcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRpc1NlbnRCb3g6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLm1haWxib3hOYW1lID09ICdTZW50J1xuXHRcdFx0XHR9XG5cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25JdGVtQ2xpY2s6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Ly8gJCh0aGlzKS5jbG9zZXN0KCd0Ym9keScpLmZpbmQoJ3RyJykucmVtb3ZlQ2xhc3MoJ3czLWJsdWUnKVxuXHRcdFx0XHRcdC8vICQodGhpcykuYWRkQ2xhc3MoJ3czLWJsdWUnKVxuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3QgaXRlbSA9IGN0cmwubW9kZWwubWVzc2FnZXNbaWR4XVxuXHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdtZXNzYWdlUGFnZScsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiBgTWVzc2FnZSAjJHtjdHJsLm1vZGVsLm5iTXNnIC0gaXRlbS5zZXFubyArIDF9YCxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdGN1cnJlbnRBY2NvdW50LFxuXHRcdFx0XHRcdFx0XHRtYWlsYm94TmFtZSxcblx0XHRcdFx0XHRcdFx0aXRlbVx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0b25CYWNrOiBsb2FkXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbk1haW5DaGVja0JveENsaWNrOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGVsdC5maW5kKCcuY2hlY2snKS5wcm9wKCdjaGVja2VkJywgJCh0aGlzKS5wcm9wKCdjaGVja2VkJykpXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25QcmV2UGFnZTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCB7bmJQYWdlLCBwYWdlTm99ID0gY3RybC5tb2RlbFxuXG5cdFx0XHRcdFx0aWYgKHBhZ2VObyA+IDEpIHtcblx0XHRcdFx0XHRcdGxvYWQocGFnZU5vIC0gMSlcblx0XHRcdFx0XHR9XHRcdFx0XHRcdFxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uTmV4dFBhZ2U6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3Qge25iUGFnZSwgcGFnZU5vfSA9IGN0cmwubW9kZWxcblxuXHRcdFx0XHRcdGlmIChwYWdlTm8gPCBuYlBhZ2UpIHtcblx0XHRcdFx0XHRcdGxvYWQocGFnZU5vICsgMSlcblx0XHRcdFx0XHR9XHRcdFx0XHRcblx0XHRcdFx0fVx0XHRcdFx0XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGZ1bmN0aW9uIGxvYWQocGFnZU5vKSB7XG5cdFx0XHRpZiAocGFnZU5vID09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRwYWdlTm8gPSBjdHJsLm1vZGVsLnBhZ2VOb1xuXHRcdFx0fVxuXG5cdFx0XHRjdHJsLnNldERhdGEoe2xvYWRpbmc6IHRydWV9KVxuXG5cdFx0XHRzcnZNYWlsLm9wZW5NYWlsYm94KGN1cnJlbnRBY2NvdW50LCBtYWlsYm94TmFtZSwgcGFnZU5vKS50aGVuKChkYXRhKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdkYXRhJywgZGF0YSlcblx0XHRcdFx0Y29uc3Qge21lc3NhZ2VzLCBuYk1zZ30gPSBkYXRhXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0bG9hZGluZzogZmFsc2UsXG5cdFx0XHRcdFx0Y2hlY2s6IGZhbHNlLFxuXHRcdFx0XHRcdHBhZ2VObyxcblx0XHRcdFx0XHRuYlBhZ2U6IE1hdGguY2VpbChuYk1zZyAvIDIwKSxcblx0XHRcdFx0XHRuYk1zZyxcblx0XHRcdFx0XHRtZXNzYWdlczogbWVzc2FnZXMucmV2ZXJzZSgpXG5cdFx0XHRcdH0pXG5cdFx0XHR9KVx0XHRcdFxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldFNlcU5vcygpIHtcblx0XHRcdGNvbnN0IGl0ZW1zID0gZWx0LmZpbmQoJy5jaGVjazpjaGVja2VkJylcblx0XHRcdGNvbnN0IHNlcU5vcyA9IFtdXG5cdFx0XHRpdGVtcy5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuaW5kZXgoKVxuXHRcdFx0XHRzZXFOb3MucHVzaChjdHJsLm1vZGVsLm1lc3NhZ2VzW2lkeF0uc2Vxbm8pXG5cdFx0XHR9KVxuXHRcdFx0Y29uc29sZS5sb2coJ3NlcU5vcycsIHNlcU5vcylcblx0XHRcdHJldHVybiBzZXFOb3Ncblx0XHR9XG5cblx0XHRmdW5jdGlvbiBkZWxldGVNZXNzYWdlKCkge1xuXHRcdFx0Y29uc3Qgc2VxTm9zID0gZ2V0U2VxTm9zKClcblx0XHRcdGlmIChzZXFOb3MubGVuZ3RoID09IDApIHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0RlbGV0ZSBNZXNzYWdlJywgY29udGVudDogJ1BsZWFzZSBzZWxlY3Qgb25lIG9yIHNldmVyYWxsIG1lc3NhZ2VzICEnfSlcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cblx0XHRcdHNydk1haWwuZGVsZXRlTWVzc2FnZShjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIHNlcU5vcykudGhlbigoKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdNZXNzYWdlcyBkZWxldGVkJylcblx0XHRcdFx0bG9hZCgpXG5cdFx0XHR9KVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIG1vdmVNZXNzYWdlKCkge1xuXHRcdFx0Y29uc3Qgc2VxTm9zID0gZ2V0U2VxTm9zKClcblx0XHRcdGlmIChzZXFOb3MubGVuZ3RoID09IDApIHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ01vdmUgTWVzc2FnZScsIGNvbnRlbnQ6ICdQbGVhc2Ugc2VsZWN0IG9uZSBvciBzZXZlcmFsbCBtZXNzYWdlcyAhJ30pXG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXG5cdFx0XHRwYWdlci5wdXNoUGFnZSgnYm94ZXNQYWdlJywge1xuXHRcdFx0XHR0aXRsZTogJ1NlbGVjdCB0YXJnZXQgbWFpbGJveCcsXG5cdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0Y3VycmVudEFjY291bnRcblx0XHRcdFx0fSxcblx0XHRcdFx0b25SZXR1cm46IGZ1bmN0aW9uKHRhcmdldE5hbWUpIHtcblx0XHRcdFx0XHRpZiAodGFyZ2V0TmFtZSA9PSBtYWlsYm94TmFtZSkge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ1NlbGVjdCBUYXJnZXQgTWFpbGJveCcsIGNvbnRlbnQ6ICdUYXJnZXQgbWFpbGJveCBtdXN0IGJlIGRpZmZlcmVudCBmcm9tIGN1cnJlbnQgbWFpbGJveCd9KVxuXHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0c3J2TWFpbC5tb3ZlTWVzc2FnZShjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIHRhcmdldE5hbWUsIHNlcU5vcylcblx0XHRcdFx0XHQudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRsb2FkKClcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXHRcdFx0Ly8gc3J2TWFpbC5kZWxldGVNZXNzYWdlKGN1cnJlbnRBY2NvdW50LCBtYWlsYm94TmFtZSwgc2VxTm9zKS50aGVuKCgpID0+IHtcblx0XHRcdC8vIFx0Y29uc29sZS5sb2coJ01lc3NhZ2VzIGRlbGV0ZWQnKVxuXHRcdFx0Ly8gXHRsb2FkKClcblx0XHRcdC8vIH0pXG5cdFx0fVx0XHRcblxuXHRcdGxvYWQoMSlcblxuXHRcdGZ1bmN0aW9uIG5ld01lc3NhZ2UoKSB7XG5cdFx0XHRwYWdlci5wdXNoUGFnZSgnd3JpdGVNYWlsUGFnZScsIHtcblx0XHRcdFx0dGl0bGU6ICdOZXcgTWVzc2FnZScsXG5cdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0YWNjb3VudE5hbWU6IGN1cnJlbnRBY2NvdW50XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRpZiAobWFpbGJveE5hbWUgPT0gJ1NlbnQnKSB7XG5cdFx0XHRcdFx0XHRsb2FkKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pXHRcdFx0XG5cdFx0fVxuXG5cdFx0dGhpcy5nZXRCdXR0b25zID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRyZWxvYWQ6IHtcblx0XHRcdFx0XHRpY29uOiAnZmEgZmEtc3luYy1hbHQnLFxuXHRcdFx0XHRcdHRpdGxlOiAnVXBkYXRlJyxcblx0XHRcdFx0XHRvbkNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGxvYWQoMSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG5ld01haWw6IHtcblx0XHRcdFx0XHRpY29uOiAnZmEgZmEtZW52ZWxvcGUnLFxuXHRcdFx0XHRcdHRpdGxlOiAnTmV3IE1lc3NhZ2UnLFxuXHRcdFx0XHRcdG9uQ2xpY2s6IG5ld01lc3NhZ2Vcblx0XHRcdFx0fSxcblx0XHRcdFx0bW92ZToge1xuXHRcdFx0XHRcdGljb246ICdmYSBmYS1maWxlLWV4cG9ydCcsXG5cdFx0XHRcdFx0dGl0bGU6ICdNb3ZlIHNlbGVjdGVkIG1lc3NhZ2VzJyxcblx0XHRcdFx0XHRvbkNsaWNrOiBtb3ZlTWVzc2FnZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRkZWxldGU6IHtcblx0XHRcdFx0XHRpY29uOiAnZmEgZmEtdHJhc2gnLFxuXHRcdFx0XHRcdHRpdGxlOiAnRGVsZXRlIHNlbGVjdGVkIG1lc3NhZ2VzJyxcblx0XHRcdFx0XHRvbkNsaWNrOiBkZWxldGVNZXNzYWdlXG5cdFx0XHRcdH1cdFxuXHRcdFx0fVx0XG5cdFx0XHRcdFxuXHRcdH1cblxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdjb250YWN0c1BhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5jb250YWN0c1xcXCIgZGF0YS1zaG93LXNlbGVjdGlvbj1cXFwidHJ1ZVxcXCIgYm4taWZhY2U9XFxcImNvbnRhY3RzXFxcIj48L2Rpdj5cXG5cdFxcbjwvZGl2PlxcblxcblxcblwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInXSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0KVxuXG5cblx0XHR0aGlzLmdldEJ1dHRvbnMgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdG9rOiB7XG5cdFx0XHRcdFx0dGl0bGU6ICdBcHBseScsXG5cdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLWNoZWNrJyxcblx0XHRcdFx0XHRvbkNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoY3RybC5zY29wZS5jb250YWN0cy5nZXRTZWxlY3Rpb24oKSlcblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVx0XHRcdFx0XHRcblx0XHR9XG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ21lc3NhZ2VQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgYm4tc2hvdz1cXFwibG9hZGluZ1xcXCIgY2xhc3M9XFxcImxvYWRpbmdcXFwiPlxcblx0PGkgY2xhc3M9XFxcImZhIGZhLXNwaW5uZXIgZmEtcHVsc2VcXFwiPjwvaT5cXG5cdGxvYWRpbmcgLi4uXFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiaGVhZGVyIHczLWJsdWVcXFwiIGJuLXNob3c9XFxcIiFsb2FkaW5nXFxcIj5cXG5cdDxkaXYgY2xhc3M9XFxcImZyb21cXFwiPjxzdHJvbmc+RnJvbTo8L3N0cm9uZz48YSBocmVmPVxcXCIjXFxcIiBibi10ZXh0PVxcXCJpdGVtLmZyb20ubmFtZVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkFkZENvbnRhY3RcXFwiIGJuLWRhdGE9XFxcInthZGRyOiBpdGVtLmZyb219XFxcIj48L2E+PC9kaXY+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJzdWJqZWN0XFxcIj48c3Ryb25nPlN1YmplY3Q6PC9zdHJvbmc+PHNwYW4gYm4tdGV4dD1cXFwiaXRlbS5zdWJqZWN0XFxcIiA+PC9zcGFuPjwvZGl2Plxcblx0PGRpdiBibi1zaG93PVxcXCJzaG93MVxcXCIgY2xhc3M9XFxcInRvXFxcIj5cXG5cdFx0PHN0cm9uZyBibi1ldmVudD1cXFwiY2xpY2s6IG9uVG9nZ2xlRGl2XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtY2FyZXQtZG93biBmYS1md1xcXCI+PC9pPlxcblx0XHRUbzwvc3Ryb25nPlxcblx0XHQ8dWwgYm4tZWFjaD1cXFwiaXRlbS50b1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLmNvbnRhY3Q6IG9uQWRkQ29udGFjdFxcXCI+XFxuXHRcdFx0PGxpPlxcblx0XHRcdFx0PGEgaHJlZj1cXFwiI1xcXCIgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLm5hbWVcXFwiIGNsYXNzPVxcXCJjb250YWN0XFxcIj48L2E+XHRcdFx0XHRcXG5cdFx0XHQ8L2xpPlxcblx0XHQ8L3VsPlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJhdHRhY2htZW50c1xcXCIgYm4tc2hvdz1cXFwic2hvdzJcXFwiPlxcblx0XHQ8c3Ryb25nIGJuLWV2ZW50PVxcXCJjbGljazogb25Ub2dnbGVEaXZcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1jYXJldC1kb3duIGZhLWZ3XFxcIj48L2k+XFxuXHRcdEF0dGFjaG1lbnRzPC9zdHJvbmc+XFxuXHRcdDx1bCAgYm4tZWFjaD1cXFwiYXR0YWNobWVudHNcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5pdGVtOiBvcGVuQXR0YWNobWVudFxcXCI+XFxuXHRcdFx0PGxpPlxcblx0XHRcdFx0PGEgaHJlZj1cXFwiI1xcXCIgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLm5hbWVcXFwiIGNsYXNzPVxcXCJpdGVtXFxcIj48L2E+XFxuXHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXRTaXplXFxcIj48L3NwYW4+XFxuXHRcdFx0PC9saT5cXG5cdFx0PC91bD5cXG5cdDwvZGl2Plxcblx0XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwibWFpbkh0bWxcXFwiIGJuLXNob3c9XFxcInNob3c0XFxcIj5cXG5cdDxkaXYgYm4tc2hvdz1cXFwic2hvdzNcXFwiIGNsYXNzPVxcXCJlbWJlZGRlZEltYWdlcyB3My1wYWxlLXllbGxvd1xcXCI+XFxuXHRcdDxhIGhyZWY9XFxcIiNcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25FbWJlZGRlZEltYWdlc1xcXCI+RG93bmxvYWQgZW1iZWRkZWQgaW1hZ2VzPC9hPlxcblx0PC9kaXY+XFxuXHQ8aWZyYW1lIGJuLWF0dHI9XFxcIntzcmNkb2M6dGV4dH1cXFwiIGJuLWJpbmQ9XFxcImlmcmFtZVxcXCIgYm4tZXZlbnQ9XFxcImxvYWQ6IG9uRnJhbWVMb2FkZWRcXFwiPjwvaWZyYW1lPlxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcIm1haW5UZXh0XFxcIiBibi1zaG93PVxcXCJzaG93NVxcXCI+XFxuIFx0PHByZSBibi10ZXh0PVxcXCJ0ZXh0XFxcIj48L3ByZT5cXG48L2Rpdj5cIixcblxuXHRkZXBzOiBbJ2FwcC5tYWlscycsICdicmVpemJvdC5zY2hlZHVsZXInLCAnYnJlaXpib3QucGFnZXInLCAnYnJlaXpib3QuZmlsZXMnXSxcblxuXHRwcm9wczoge1xuXHRcdGN1cnJlbnRBY2NvdW50OiAnJyxcblx0XHRtYWlsYm94TmFtZTogJycsXG5cdFx0aXRlbTogbnVsbFxuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgc3J2TWFpbCwgc2NoZWR1bGVyLCBwYWdlciwgc3J2RmlsZXMpIHtcblxuXHRcdGNvbnN0IHtjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIGl0ZW19ID0gdGhpcy5wcm9wc1xuXG5cblx0XHRjb25zdCB3YWl0RGxnID0gJCQuZGlhbG9nQ29udHJvbGxlcih7XG5cdFx0XHR0aXRsZTogJ0xvYWRpbmcgLi4uJyxcblx0XHRcdHRlbXBsYXRlOiBgPGRpdiBjbGFzcz1cInczLWNlbnRlciB3My1wYWRkaW5nLTE2XCI+PGkgY2xhc3M9XCJmYSBmYS1yZWRvLWFsdCBmYS0yeCBmYS1wdWxzZSB3My10ZXh0LWJsdWVcIj48L2k+PC9kaXY+YCxcblx0XHRcdHdpZHRoOiAxMDAsXG5cdFx0XHRjYW5DbG9zZTogZmFsc2Vcblx0XHR9KVxuXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGVtYmVkZGVkSW1hZ2VzOiBbXSxcblx0XHRcdFx0aXNIdG1sOiBmYWxzZSxcblx0XHRcdFx0bG9hZGluZzogdHJ1ZSxcblx0XHRcdFx0dGV4dDogJycsXG5cdFx0XHRcdGl0ZW0sXG5cdFx0XHRcdGF0dGFjaG1lbnRzOiBbXSxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLml0ZW0udG8ubGVuZ3RoID4gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuYXR0YWNobWVudHMubGVuZ3RoID4gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuZW1iZWRkZWRJbWFnZXMubGVuZ3RoID4gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93NDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuICF0aGlzLmxvYWRpbmcgJiYgdGhpcy5pc0h0bWxcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiAhdGhpcy5sb2FkaW5nICYmICF0aGlzLmlzSHRtbFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRTaXplOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdGxldCBzaXplID0gc2NvcGUuJGkuc2l6ZVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2dldFNpemUnLCBzaXplKVxuXHRcdFx0XHRcdHNpemUgLz0gMTAyNFxuXHRcdFx0XHRcdGxldCB1bml0ID0gJ0tvJ1xuXHRcdFx0XHRcdGlmIChzaXplID4gMTAyNCkge1xuXHRcdFx0XHRcdFx0c2l6ZSAvPSAxMDI0XG5cdFx0XHRcdFx0XHR1bml0ID0gJ01vJ1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJldHVybiBgICgke3NpemUudG9GaXhlZCgxKX0gJHt1bml0fSlgXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b3BlbkF0dGFjaG1lbnQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnbGknKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwubW9kZWwuYXR0YWNobWVudHNbaWR4XVxuXHRcdFx0XHRcdGNvbnN0IHtwYXJ0SUQsIHR5cGUsIHN1YnR5cGV9ID0gaW5mb1xuXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29wZW5BdHRhY2htZW50cycsIGluZm8pXG5cblx0XHRcdFx0XHRpZiAoaW5mby5jYW5PcGVuKSB7XG5cdFx0XHRcdFx0XHR3YWl0RGxnLnNob3coKVxuXHRcdFx0XHRcdFx0c3J2TWFpbC5vcGVuQXR0YWNobWVudChjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIGl0ZW0uc2Vxbm8sIHBhcnRJRCkudGhlbigobWVzc2FnZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdtZXNzYWdlJywgbWVzc2FnZSlcblx0XHRcdFx0XHRcdFx0d2FpdERsZy5oaWRlKClcblx0XHRcdFx0XHRcdFx0Y29uc3QgdXJsID0gYGRhdGE6JHt0eXBlfS8ke3N1YnR5cGV9O2Jhc2U2NCxgICsgbWVzc2FnZS5kYXRhXG5cdFx0XHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdicmVpemJvdC52aWV3ZXInLCB7XG5cdFx0XHRcdFx0XHRcdFx0dGl0bGU6IGluZm8ubmFtZSxcblx0XHRcdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRcdFx0dHlwZTogJCQudXRpbC5nZXRGaWxlVHlwZShpbmZvLm5hbWUpLFxuXHRcdFx0XHRcdFx0XHRcdFx0dXJsXHRcblx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdGJ1dHRvbnM6IHtcblx0XHRcdFx0XHRcdFx0XHRcdHNhdmU6IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGl0bGU6ICdTYXZlJyxcblx0XHRcdFx0XHRcdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLXNhdmUnLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRvbkNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBibG9iID0gJCQudXRpbC5kYXRhVVJMdG9CbG9iKHVybClcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzcnZGaWxlcy51cGxvYWRGaWxlKGJsb2IsIGluZm8ubmFtZSwgJy9hcHBzL2VtYWlsJykudGhlbihmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKClcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9KVx0XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LmNhdGNoKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRpdGxlOiAnRXJyb3InLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjb250ZW50OiByZXNwLnJlc3BvbnNlVGV4dFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9LFx0XG5cdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0XHR9KVx0XHRcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdH0pXHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dDb25maXJtKHtcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdPcGVuIEF0dGFjaG1lbnQnLCBcblx0XHRcdFx0XHRcdFx0b2tUZXh0OiAnWWVzJyxcblx0XHRcdFx0XHRcdFx0Y2FuY2VsVGV4dDogJ05vJyxcblx0XHRcdFx0XHRcdFx0Y29udGVudDogYFRoaXMgYXR0YWNobWVudCBjYW5ub3QgYmUgb3BlbiB3aXRoIE5ldE9TPGJyPlxuXHRcdFx0XHRcdFx0XHRcdERvIHlvdSB3YW50IHRvIGRvd25sb2FkIGl0ID9gXG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdPSycpXG5cdFx0XHRcdFx0XHRcdFx0d2FpdERsZy5zaG93KClcblx0XHRcdFx0XHRcdFx0XHRzcnZNYWlsLm9wZW5BdHRhY2htZW50KGN1cnJlbnRBY2NvdW50LCBtYWlsYm94TmFtZSwgaXRlbS5zZXFubywgcGFydElEKS50aGVuKChtZXNzYWdlKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdtZXNzYWdlJywgbWVzc2FnZSlcblx0XHRcdFx0XHRcdFx0XHRcdHdhaXREbGcuaGlkZSgpXG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCB1cmwgPSBgZGF0YToke3R5cGV9LyR7c3VidHlwZX07YmFzZTY0LGAgKyBtZXNzYWdlLmRhdGFcblx0XHRcdFx0XHRcdFx0XHRcdCQkLnV0aWwuZG93bmxvYWRVcmwodXJsLCBpbmZvLm5hbWUpXG5cblx0XHRcdFx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25Ub2dnbGVEaXY6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQXR0YWNoQ2xpY2snKVxuXHRcdFx0XHRcdGNvbnN0ICRpID0gJCh0aGlzKS5maW5kKCdpJylcblx0XHRcdFx0XHRjb25zdCAkdWwgPSAkKHRoaXMpLnNpYmxpbmdzKCd1bCcpXG5cdFx0XHRcdFx0aWYgKCRpLmhhc0NsYXNzKCdmYS1jYXJldC1yaWdodCcpKSB7XG5cdFx0XHRcdFx0XHQkaS5yZW1vdmVDbGFzcygnZmEtY2FyZXQtcmlnaHQnKS5hZGRDbGFzcygnZmEtY2FyZXQtZG93bicpXG5cdFx0XHRcdFx0XHQkdWwuc2xpZGVEb3duKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHQkaS5yZW1vdmVDbGFzcygnZmEtY2FyZXQtZG93bicpLmFkZENsYXNzKCdmYS1jYXJldC1yaWdodCcpXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHQkdWwuc2xpZGVVcCgpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkVtYmVkZGVkSW1hZ2VzOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHQvL2N0cmwuc2V0RGF0YSh7ZW1iZWRkZWRJbWFnZXM6IFtdfSlcblx0XHRcdFx0XHRjb25zdCAkaWZyYW1lID0gJChjdHJsLnNjb3BlLmlmcmFtZS5nZXQoMCkuY29udGVudFdpbmRvdy5kb2N1bWVudClcblxuXHRcdFx0XHRcdGNvbnN0IHtlbWJlZGRlZEltYWdlc30gPSBjdHJsLm1vZGVsXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtlbWJlZGRlZEltYWdlczogW119KVxuXG5cdFx0XHRcdFx0ZW1iZWRkZWRJbWFnZXMuZm9yRWFjaCgoZSkgPT4ge1xuXHRcdFx0XHRcdFx0Y29uc3Qge3R5cGUsIHN1YnR5cGUsIHBhcnRJRCwgY2lkfSA9IGVcblx0XHRcdFx0XHRcdHNydk1haWwub3BlbkF0dGFjaG1lbnQoY3VycmVudEFjY291bnQsIG1haWxib3hOYW1lLCBpdGVtLnNlcW5vLCBwYXJ0SUQpLnRoZW4oKG1lc3NhZ2UpID0+IHtcblx0XHRcdFx0XHRcdFx0Y29uc3QgdXJsID0gYGRhdGE6JHt0eXBlfS8ke3N1YnR5cGV9O2Jhc2U2NCxgICsgbWVzc2FnZS5kYXRhXG5cdFx0XHRcdFx0XHRcdGNvbnN0ICRpbWcgPSAkaWZyYW1lLmZpbmQoYGltZ1tzcmM9XCJjaWQ6JHtjaWR9XCJdYClcblx0XHRcdFx0XHRcdFx0JGltZy5hdHRyKCdzcmMnLCB1cmwpXG5cblx0XHRcdFx0XHRcdH0pXHRcdFx0XHRcdFxuXG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkZyYW1lTG9hZGVkOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkZyYW1lTG9hZGVkJylcblx0XHRcdFx0XHRjb25zdCAkaWZyYW1lID0gJCh0aGlzLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQpXG5cdFx0XHRcdFx0JGlmcmFtZS5maW5kKCdhJylcblx0XHRcdFx0XHQuYXR0cigndGFyZ2V0JywgJ19ibGFuaycpXG5cdFx0XHRcdFx0Lm9uKCdjbGljaycsIGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0XHRjb25zdCBocmVmID0gJCh0aGlzKS5hdHRyKCdocmVmJylcblx0XHRcdFx0XHRcdGlmIChocmVmLnN0YXJ0c1dpdGgoJ2h0dHBzOi8veW91dHUuYmUvJykpIHtcblx0XHRcdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdFx0XHRzY2hlZHVsZXIub3BlbkFwcCgneW91dHViZScsIHt1cmw6IGhyZWZ9KVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25BZGRDb250YWN0OiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkFkZENvbnRhY3QnKVxuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHRjb25zdCB7aXRlbX0gPSBjdHJsLm1vZGVsXG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCdsaScpLmluZGV4KClcblx0XHRcdFx0XHRsZXQgZnJvbSA9IChpZHggPCAwKSA/IGl0ZW0uZnJvbSA6IGl0ZW0udG9baWR4XVxuXHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdhZGRDb250YWN0UGFnZScsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnQWRkIENvbnRhY3QnLFxuXHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0ZnJvbVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0bGV0IHBhcnRJRCA9IGl0ZW0ucGFydElELmh0bWxcblx0XHRsZXQgaXNIdG1sID0gdHJ1ZVxuXHRcdGlmIChwYXJ0SUQgPT0gZmFsc2UpIHtcblx0XHRcdHBhcnRJRCA9IGl0ZW0ucGFydElELnRleHRcblx0XHRcdGlzSHRtbCA9IGZhbHNlXG5cdFx0fVxuXHRcdGNvbnNvbGUubG9nKCdpc0h0bWwnLCBpc0h0bWwpXG5cblxuXHRcdHNydk1haWwub3Blbk1lc3NhZ2UoY3VycmVudEFjY291bnQsIG1haWxib3hOYW1lLCBpdGVtLnNlcW5vLCBwYXJ0SUQpLnRoZW4oKG1lc3NhZ2UpID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKCdtZXNzYWdlJywgbWVzc2FnZSlcblxuXG5cdFx0XHRjb25zdCB7dGV4dCwgYXR0YWNobWVudHMsIGVtYmVkZGVkSW1hZ2VzfSA9IG1lc3NhZ2VcblxuXHRcdFx0YXR0YWNobWVudHMuZm9yRWFjaCgoYSkgPT4ge1xuXHRcdFx0XHRhLmNhbk9wZW4gPSAkJC51dGlsLmdldEZpbGVUeXBlKGEubmFtZSkgIT0gdW5kZWZpbmVkICYmIGEuZW5jb2RpbmcudG9VcHBlckNhc2UoKSA9PSAnQkFTRTY0J1xuXG5cdFx0XHR9KVxuXG5cblx0XHRcdGN0cmwuc2V0RGF0YSh7dGV4dCwgYXR0YWNobWVudHMsIGVtYmVkZGVkSW1hZ2VzLCBsb2FkaW5nOmZhbHNlLCBpc0h0bWx9KVxuXG5cdFx0fSlcblxuXHRcdGZ1bmN0aW9uIHJlcGx5TWVzc2FnZSh0ZXh0LCB0bykge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygncmVwbHlNZXNzYWdlJywgdGV4dClcblx0XHRcdHBhZ2VyLnB1c2hQYWdlKCd3cml0ZU1haWxQYWdlJywge1xuXHRcdFx0XHR0aXRsZTogJ1JlcGx5IG1lc3NhZ2UnLFxuXHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdGFjY291bnROYW1lOiBjdXJyZW50QWNjb3VudCxcblx0XHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0XHR0byxcblx0XHRcdFx0XHRcdHN1YmplY3Q6ICdSZTogJyArIGl0ZW0uc3ViamVjdCxcblx0XHRcdFx0XHRcdGh0bWw6IGA8cHJlPiR7dGV4dH08L3ByZT5gXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KVx0XHRcdFxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGZvcndhcmRNZXNzYWdlKHRleHQpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ3JlcGx5TWVzc2FnZScsIHRleHQpXG5cdFx0XHRwYWdlci5wdXNoUGFnZSgnd3JpdGVNYWlsUGFnZScsIHtcblx0XHRcdFx0dGl0bGU6ICdGb3J3YXJkIG1lc3NhZ2UnLFxuXHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdGFjY291bnROYW1lOiBjdXJyZW50QWNjb3VudCxcblx0XHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0XHRzdWJqZWN0OiAnRndkOiAnICsgaXRlbS5zdWJqZWN0LFxuXHRcdFx0XHRcdFx0aHRtbDogYDxwcmU+JHt0ZXh0fTwvcHJlPmBcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pXHRcdFx0XG5cdFx0fVxuXG5cdFx0dGhpcy5nZXRCdXR0b25zID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRyZXBseToge1xuXHRcdFx0XHRcdGljb246ICdmYSBmYS1yZXBseScsXG5cdFx0XHRcdFx0dGl0bGU6ICdSZXBseScsXG5cdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRyZXBseSgncmVwbHknKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0cmVwbHlBbGw6IHtcblx0XHRcdFx0XHRpY29uOiAnZmEgZmEtcmVwbHktYWxsJyxcblx0XHRcdFx0XHR0aXRsZTogJ1JlcGx5IEFsbCcsXG5cdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRyZXBseSgncmVwbHlBbGwnKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0Zm9yd2FyZDoge1xuXHRcdFx0XHRcdGljb246ICdmYSBmYS1zaGFyZS1zcXVhcmUnLFxuXHRcdFx0XHRcdHRpdGxlOiAnRm9yd2FyZCcsXG5cdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBIRUFERVIgPSAnXFxuXFxuLS0tLS0gRm9yd2FyZGVkIG1haWwgLS0tLS1cXG4nXG5cblxuXHRcdFx0XHRcdFx0aWYgKGN0cmwubW9kZWwuaXNIdG1sICYmIGl0ZW0ucGFydElELnRleHQgIT0gZmFsc2UpIHtcblx0XHRcdFx0XHRcdFx0c3J2TWFpbC5vcGVuTWVzc2FnZShjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIGl0ZW0uc2Vxbm8sIGl0ZW0ucGFydElELnRleHQpLnRoZW4oKG1lc3NhZ2UpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRmb3J3YXJkTWVzc2FnZShIRUFERVIgKyBtZXNzYWdlLnRleHQpXG5cdFx0XHRcdFx0XHRcdH0pXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR9XG5cdFx0XG5cdFx0XHRcdFx0XHRlbHNlIGlmICghY3RybC5tb2RlbC5pc0h0bWwpIHtcblx0XHRcdFx0XHRcdFx0Zm9yd2FyZE1lc3NhZ2UoSEVBREVSICsgY3RybC5tb2RlbC50ZXh0KVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGZvcndhcmRNZXNzYWdlKCcnKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVx0XHRcdFx0XG5cdFx0fVxuXHRcdFxuXHRcdGZ1bmN0aW9uIHJlcGx5KGFjdGlvbikge1xuXHRcdFx0Y29uc29sZS5sb2coJ3JlcGx5JylcblxuXHRcdFx0aWYgKGFjdGlvbiA9PSAncmVwbHknIHx8IGFjdGlvbiA9PSAncmVwbHlBbGwnKSB7XG5cblx0XHRcdFx0Y29uc3QgSEVBREVSID0gJ1xcblxcbi0tLS0tIE9yaWdpbmFsIG1haWwgLS0tLS1cXG4nXG5cblx0XHRcdFx0bGV0IHRvID0gaXRlbS5mcm9tLmVtYWlsXG5cblx0XHRcdFx0aWYgKGFjdGlvbiA9PSAncmVwbHlBbGwnICYmIGl0ZW0udG8ubGVuZ3RoID4gMCkge1x0XHRcdFx0XHRcblx0XHRcdFx0XHR0byArPSAnLCcgKyBpdGVtLnRvLm1hcCgoYSkgPT4gYS5lbWFpbCkuam9pbignLCcpXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoY3RybC5tb2RlbC5pc0h0bWwgJiYgaXRlbS5wYXJ0SUQudGV4dCAhPSBmYWxzZSkge1xuXHRcdFx0XHRcdHNydk1haWwub3Blbk1lc3NhZ2UoY3VycmVudEFjY291bnQsIG1haWxib3hOYW1lLCBpdGVtLnNlcW5vLCBpdGVtLnBhcnRJRC50ZXh0KS50aGVuKChtZXNzYWdlKSA9PiB7XG5cdFx0XHRcdFx0XHRyZXBseU1lc3NhZ2UoSEVBREVSICsgbWVzc2FnZS50ZXh0LCB0bylcblx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcdFxuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZWxzZSBpZiAoIWN0cmwubW9kZWwuaXNIdG1sKSB7XG5cdFx0XHRcdFx0cmVwbHlNZXNzYWdlKEhFQURFUiArIGN0cmwubW9kZWwudGV4dCwgdG8pXG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cmVwbHlNZXNzYWdlKCcnLCB0bylcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnd3JpdGVNYWlsUGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblNlbmRcXFwiIGJuLWZvcm09XFxcImRhdGFcXFwiPlxcblx0PGRpdiBjbGFzcz1cXFwiaGVhZGVyXFxcIj5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcIm9wZW5Db250YWN0UGFuZWxcXFwiPlxcblx0XHRcdFx0PGEgYm4tZXZlbnQ9XFxcImNsaWNrOiBvcGVuQ29udGFjdFxcXCIgaHJlZj1cXFwiI1xcXCIgY2xhc3M9XFxcInczLXRleHQtaW5kaWdvXFxcIj5Ubzo8L2E+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdFx0PGlucHV0IHR5cGU9XFxcImVtYWlsXFxcIiBtdWx0aXBsZT1cXFwidHJ1ZVxcXCIgbmFtZT1cXFwidG9cXFwiIGJuLXByb3A9XFxcInByb3AxXFxcIiByZXF1aXJlZD1cXFwiXFxcIiBibi1iaW5kPVxcXCJ0b1xcXCI+XHRcdFxcblx0XHQ8L2Rpdj5cXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdDxsYWJlbD5TdWJqZWN0OjwvbGFiZWw+XFxuXHRcdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcInN1YmplY3RcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlx0XHRcXG5cdFx0PC9kaXY+XHRcXG5cXG5cdFx0PGRpdiBibi1zaG93PVxcXCJzaG93MVxcXCIgY2xhc3M9XFxcImF0dGFjaG1lbnRzXFxcIj5cXG5cdFx0XHQ8bGFiZWw+PGkgY2xhc3M9XFxcImZhIGZhLXBhcGVyY2xpcFxcXCI+PC9pPjwvbGFiZWw+XHRcdFx0XFxuXHRcdFx0PHVsIGJuLWVhY2g9XFxcImF0dGFjaG1lbnRzXFxcIiBibi1ldmVudD1cXFwiY2xpY2suZGVsZXRlOiBvblJlbW92ZUF0dGFjaG1lbnRcXFwiPlxcblx0XHRcdFx0PGxpPlxcblx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuJGkuZmlsZU5hbWVcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXRpbWVzIGRlbGV0ZVxcXCI+PC9pPlxcblx0XHRcdFx0PC9saT5cXG5cdFx0XHQ8L3VsPlxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2Plxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmh0bWxlZGl0b3JcXFwiIGNsYXNzPVxcXCJjb250ZW50XFxcIiBuYW1lPVxcXCJodG1sXFxcIiBibi1pZmFjZT1cXFwiY29udGVudFxcXCI+PC9kaXY+XFxuPCEtLSBcdDx0ZXh0YXJlYSBuYW1lPVxcXCJ0ZXh0XFxcIiBibi1iaW5kPVxcXCJjb250ZW50XFxcIj48L3RleHRhcmVhPlx0XFxuIC0tPlx0PGlucHV0IHR5cGU9XFxcInN1Ym1pdFxcXCIgaGlkZGVuPVxcXCJcXFwiIGJuLWJpbmQ9XFxcInN1Ym1pdFxcXCI+XFxuPC9mb3JtPlxcblwiLFxuXG5cdGRlcHM6IFsnYXBwLm1haWxzJywgJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0cHJvcHM6IHtcblx0XHRhY2NvdW50TmFtZTogJycsXG5cdFx0ZGF0YToge31cblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydk1haWwsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCB7YWNjb3VudE5hbWUsIGRhdGF9ID0gdGhpcy5wcm9wc1xuXHRcdGNvbnNvbGUubG9nKCdkYXRhJywgZGF0YSlcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZGF0YSxcblx0XHRcdFx0YXR0YWNobWVudHM6IFtdLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7cmV0dXJuIHRoaXMuYXR0YWNobWVudHMubGVuZ3RoID4gMH0sXG5cdFx0XHRcdHByb3AxOiBmdW5jdGlvbigpIHtyZXR1cm4ge2F1dG9mb2N1czogdGhpcy5kYXRhLmh0bWwgPT0gdW5kZWZpbmVkfX1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25TZW5kOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblNlbmQnKVxuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHRjb25zdCBkYXRhID0gJCh0aGlzKS5nZXRGb3JtRGF0YSgpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ2RhdGEnLCBkYXRhKVxuXHRcdFx0XHRcdGNvbnN0IHthdHRhY2htZW50c30gPSBjdHJsLm1vZGVsXG5cdFx0XHRcdFx0aWYgKGF0dGFjaG1lbnRzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRcdGRhdGEuYXR0YWNobWVudHMgPSBhdHRhY2htZW50cy5tYXAoKGEpID0+IGEucm9vdERpciArIGEuZmlsZU5hbWUpXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0c3J2TWFpbC5zZW5kTWFpbChhY2NvdW50TmFtZSwgZGF0YSlcblx0XHRcdFx0XHQudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKClcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5jYXRjaCgoZSkgPT4ge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0Vycm9yJywgY29udGVudDogZS5yZXNwb25zZVRleHR9KVxuXHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b3BlbkNvbnRhY3Q6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvcGVuQ29udGFjdCcpXG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2NvbnRhY3RzUGFnZScsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnU2VsZWN0IGEgY29udGFjdCcsXG5cdFx0XHRcdFx0XHRvblJldHVybjogZnVuY3Rpb24oZnJpZW5kcykge1xuXHRcdFx0XHRcdFx0XHRjb25zdCBjb250YWN0cyA9IGZyaWVuZHMubWFwKChhKSA9PiBhLmNvbnRhY3RFbWFpbClcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ2NvbnRhY3RzJywgY29udGFjdHMpXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHRvID0gY3RybC5zY29wZS50by52YWwoKVxuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygndG8nLCB0bylcblxuXHRcdFx0XHRcdFx0XHRpZiAodG8gIT0gJycpIHtcblx0XHRcdFx0XHRcdFx0XHRjb250YWN0cy51bnNoaWZ0KHRvKVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7ZGF0YToge3RvOiBjb250YWN0cy5qb2luKCcsJyl9fSlcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUmVtb3ZlQXR0YWNobWVudDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblJlbW92ZUF0dGFjaG1lbnQnLCBpZHgpXG5cdFx0XHRcdFx0Y3RybC5tb2RlbC5hdHRhY2htZW50cy5zcGxpY2UoaWR4LCAxKVxuXHRcdFx0XHRcdGN0cmwudXBkYXRlKClcblxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHR9KVxuXG5cdFx0aWYgKGRhdGEuaHRtbCAhPSB1bmRlZmluZWQpIHtcblx0XHRcdGN0cmwuc2NvcGUuY29udGVudC5mb2N1cygpXG5cdFx0fVx0XHRcblxuXHRcdHRoaXMuZ2V0QnV0dG9ucyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0YXR0YWNobWVudDoge1xuXHRcdFx0XHRcdGljb246ICdmYSBmYS1wYXBlcmNsaXAnLFxuXHRcdFx0XHRcdHRpdGxlOiAnQWRkIGF0dGFjaG1lbnQnLFxuXHRcdFx0XHRcdG9uQ2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmZpbGVzJywge1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ1NlbGVjdCBhIGZpbGUgdG8gYXR0YWNoJyxcblx0XHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0XHRzaG93VGh1bWJuYWlsOiB0cnVlXG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRcdFx0XHRcdGZpbGVjbGljazogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoZGF0YSlcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc3Qge2ZpbGVOYW1lLCByb290RGlyfSA9IGRhdGFcblx0XHRcdFx0XHRcdFx0XHRjdHJsLm1vZGVsLmF0dGFjaG1lbnRzLnB1c2goe2ZpbGVOYW1lLCByb290RGlyfSlcblx0XHRcdFx0XHRcdFx0XHRjdHJsLnVwZGF0ZSgpXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pXG5cdFx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzZW5kOiB7XG5cdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLXBhcGVyLXBsYW5lJyxcblx0XHRcdFx0XHR0aXRsZTogJ1NlbmQgTWVzc2FnZScsXG5cdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRjdHJsLnNjb3BlLnN1Ym1pdC5jbGljaygpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XHRcdFx0XHRcblx0XHR9XG5cblx0fVxufSkiXX0=
