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

	buttons: {
		apply: {title: 'Apply', icon: 'fa fa-check'}
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

		this.onAction = function(cmd) {
			ctrl.scope.submit.click()
		}



	}


});





$$.control.registerControl('addContactPage', {

	template: "<form bn-event=\"submit: onSubmit\" bn-form=\"from\">\n	<div bn-control=\"brainjs.inputgroup\">\n		<label>Name:</label><br>\n		<input type=\"text\" name=\"name\" style=\"min-width: 300px\" required=\"\">	\n	</div>\n	<br>\n\n	<div bn-control=\"brainjs.inputgroup\">\n		<label>Email:</label><br>\n		<input type=\"email\" name=\"email\" style=\"min-width: 300px\" required=\"\">	\n	</div>	\n\n	<input type=\"submit\" bn-bind=\"submit\" hidden=\"\">\n</form>\n",

	deps: ['breizbot.users', 'breizbot.pager'],

	props: {
		from: {}
	},

	buttons: {
		ad:  {title: 'Add', icon: 'fa fa-user-plus'}
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

		this.onAction = function(cmd) {
			console.log('onAction', cmd)
			ctrl.scope.submit.click()
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

	buttons: {
		apply: {title: 'Apply', icon: 'fa fa-check'}
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


		this.onAction = function(action) {
			console.log('onAction', action)
			if (action == 'apply') {

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


});





$$.control.registerControl('contactsPage', {

	template: "<div class=\"scrollPanel\">\n	<div bn-control=\"breizbot.contacts\" data-show-selection=\"true\" bn-iface=\"contacts\"></div>\n	\n</div>\n\n\n",

	deps: ['breizbot.pager'],

	buttons: {
		ok: {title: 'Apply', icon: 'fa fa-check'}
	},
	
	init: function(elt, pager) {

		const ctrl = $$.viewController(elt)


		this.onAction = function(action) {
			console.log('onAction', action)
			if (action == 'ok') {
				pager.popPage(ctrl.scope.contacts.getSelection())
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

	buttons: {
		reload: {icon: 'fa fa-sync-alt', title: 'Update'},
		newMail: {icon: 'fa fa-envelope', title: 'New Message'},
		move: {icon: 'fa fa-file-export', title: 'Move selected messages'},
		delete: {icon: 'fa fa-trash', title: 'Delete selected messages'}	
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

			if (action == 'newMail') {
				newMessage()
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





$$.control.registerControl('writeMailPage', {

	template: "<form bn-event=\"submit: onSend\" bn-form=\"data\">\n	<div class=\"header\">\n		<div bn-control=\"brainjs.inputgroup\">\n			<div class=\"openContactPanel\">\n				<a bn-event=\"click: openContact\" href=\"#\" class=\"w3-text-indigo\">To:</a>\n			</div>\n			<input type=\"email\" multiple=\"true\" name=\"to\" bn-prop=\"prop1\" required=\"\" bn-bind=\"to\">		\n		</div>\n\n		<div bn-control=\"brainjs.inputgroup\">\n			<label>Subject:</label>\n			<input type=\"text\" name=\"subject\" required=\"\">		\n		</div>	\n\n		<div bn-show=\"show1\" class=\"attachments\">\n			<label><i class=\"fa fa-paperclip\"></i></label>			\n			<ul bn-each=\"attachments\" bn-event=\"click.delete: onRemoveAttachment\">\n				<li>\n					<span bn-text=\"$scope.$i.fileName\"></span>\n					<i class=\"fa fa-times delete\"></i>\n				</li>\n			</ul>\n		</div>\n	</div>\n	<div bn-control=\"brainjs.htmleditor\" class=\"content\" name=\"html\" bn-iface=\"content\"></div>\n<!-- 	<textarea name=\"text\" bn-bind=\"content\"></textarea>	\n -->	<input type=\"submit\" hidden=\"\" bn-bind=\"submit\">\n</form>\n",

	deps: ['app.mails', 'breizbot.pager'],

	props: {
		accountName: '',
		data: {}
	},

	buttons: {
		attachment: {icon: 'fa fa-paperclip', title: 'Add attachment'},
		send: {icon: 'fa fa-paper-plane', title: 'Send Message'}
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

		this.onAction = function(action) {
			console.log('onAction', action)
			if (action == 'send') {
				ctrl.scope.submit.click()
			}
			if( action == 'attachment') {
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
		}

	}
})
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJzZXJ2aWNlcy9tYWlscy5qcyIsInBhZ2VzL2FjY291bnQvYWNjb3VudC5qcyIsInBhZ2VzL2FkZENvbnRhY3QvYWRkQ29udGFjdC5qcyIsInBhZ2VzL2JveGVzL2JveGVzLmpzIiwicGFnZXMvY29udGFjdHMvY29udGFjdHMuanMiLCJwYWdlcy9tYWlsYm94L21haWxib3guanMiLCJwYWdlcy9tZXNzYWdlL21lc3NhZ2UuanMiLCJwYWdlcy93cml0ZU1haWwvd3JpdGVNYWlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblx0PGRpdiBjbGFzcz1cXFwiaW5mb1xcXCI+XFxuXHRcdDxzcGFuIGJuLXNob3c9XFxcInNob3cxXFxcIj5Zb3UgaGF2ZSBubyBlbWFpbCBhY2NvdW50PC9zcGFuPlxcblx0XHQ8ZGl2IGJuLXNob3c9XFxcInNob3cyXFxcIiBjbGFzcz1cXFwiYWNjb3VudFxcXCI+XFxuXHRcdFx0PHNwYW4+QWNjb3VudDombmJzcDs8L3NwYW4+IFxcblx0XHRcdDxkaXYgXFxuXHRcdFx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLnNlbGVjdG1lbnVcXFwiIFxcblx0XHRcdFx0Ym4tZGF0YT1cXFwie2l0ZW1zOiBhY2NvdW50c31cXFwiIFxcblx0XHRcdFx0Ym4tdmFsPVxcXCJjdXJyZW50QWNjb3VudFxcXCJcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJzZWxlY3RtZW51Y2hhbmdlOiBvbkFjY291bnRDaGFuZ2VcXFwiPlxcblx0XHRcdDwvZGl2Plxcblx0XHQ8L2Rpdj5cXG5cdFx0XFxuXHQ8L2Rpdj5cXG5cdDxkaXY+XFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgXFxuXHRcdFx0Ym4tZGF0YT1cXFwie2l0ZW1zOiBnZXRJdGVtc31cXFwiIFxcblx0XHRcdGRhdGEtdHJpZ2dlcj1cXFwibGVmdFxcXCIgXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvbiB3My1ibHVlXFxcIiBcXG5cdFx0XHRibi1ldmVudD1cXFwiY29udGV4dG1lbnVjaGFuZ2U6IG9uTWVudVxcXCJcXG5cdFx0XHQ+XFxuXHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtZWxsaXBzaXMtdlxcXCI+PC9pPlxcbiAgICBcdFxcblx0XHQ8L2Rpdj5cdFx0XFxuXHRcdFxcblx0PC9kaXY+XFxuXHRcXG48L2Rpdj5cXG5cXG48ZGl2Plxcblx0U2VsZWN0IGZvbGRlciB0byBvcGVuOlxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsVHJlZVxcXCI+XFxuXHQ8ZGl2IFxcblx0XHRjbGFzcz1cXFwidHJlZVxcXCIgXFxuXHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMudHJlZVxcXCJcXG5cdFx0Ym4tZGF0YT1cXFwie3NvdXJjZTogbWFpbGJveGVzfVxcXCJcXG5cdFx0Ym4tZXZlbnQ9XFxcInRyZWVhY3RpdmF0ZTogb25UcmVlQWN0aXZhdGVcXFwiXFxuXHRcdGJuLWlmYWNlPVxcXCJ0cmVlXFxcIlxcblx0PjwvZGl2PlxcbjwvZGl2PlxcblxcblxcblwiLFxuXG5cdGRlcHM6IFsnYXBwLm1haWxzJywgJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydk1haWwsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGFjY291bnRzOiBbXSxcblx0XHRcdFx0Y3VycmVudEFjY291bnQ6ICcnLFxuXHRcdFx0XHRtYWlsYm94ZXM6IFtdLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuYWNjb3VudHMubGVuZ3RoID09IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmFjY291bnRzLmxlbmd0aCA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0SXRlbXM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGlmICh0aGlzLmFjY291bnRzLmxlbmd0aCA9PSAwKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0XHRhZGQ6IHtuYW1lOiAnQWRkIEFjY291bnQnLCBpY29uOiAnZmFzIGZhLXBsdXMnfSxcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdGFkZDoge25hbWU6ICdBZGQgQWNjb3VudCcsIGljb246ICdmYXMgZmEtcGx1cyd9LFxuXHRcdFx0XHRcdFx0ZWRpdDoge25hbWU6ICdFZGl0IFNlbGVjdGVkIEFjY291bnQnLCBpY29uOiAnZmFzIGZhLWVkaXQnfSxcblx0XHRcdFx0XHRcdHNlcDI6ICctLS0tLS0nLFxuXHRcdFx0XHRcdFx0bmV3Rm9sZGVyOiB7bmFtZTogJ05ldyBGb2xkZXInLCBpY29uOiAnZmFzIGZhLWZvbGRlci1wbHVzJ30sXG5cdFx0XHRcdFx0XHRzZXA6ICctLS0tLS0nLFxuXHRcdFx0XHRcdFx0bmV3OiB7bmFtZTogJ05ldyBNZXNzYWdlJywgaWNvbjogJ2ZhcyBmYS1lbnZlbG9wZSd9XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbk1lbnU6IGZ1bmN0aW9uKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uTWVudScsIGRhdGEpXG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdhZGQnKSB7XG5cdFx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYWNjb3VudFBhZ2UnLCB7XG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnQWRkIE1haWwgQWNjb3VudCcsXG5cdFx0XHRcdFx0XHRcdG9uUmV0dXJuOiBsb2FkQWNjb3VudFxuXHRcdFx0XHRcdFx0fSlcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICduZXcnKSB7XG5cdFx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnd3JpdGVNYWlsUGFnZScsIHtcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdOZXcgTWVzc2FnZScsXG5cdFx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdFx0YWNjb3VudE5hbWU6IGN0cmwubW9kZWwuY3VycmVudEFjY291bnRcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSlcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdlZGl0Jykge1xuXHRcdFx0XHRcdFx0c3J2TWFpbC5nZXRNYWlsQWNjb3VudChjdHJsLm1vZGVsLmN1cnJlbnRBY2NvdW50KS50aGVuKChkYXRhKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdhY2NvdW50UGFnZScsIHtcblx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0VkaXQgTWFpbCBBY2NvdW50Jyxcblx0XHRcdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YVxuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSlcdFx0XHRcdFx0XHRcblxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICduZXdGb2xkZXInKSB7XG5cdFx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYm94ZXNQYWdlJywge1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ0FkZCBuZXcgZm9sZGVyJyxcblx0XHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0XHRjdXJyZW50QWNjb3VudDogY3RybC5tb2RlbC5jdXJyZW50QWNjb3VudCxcblx0XHRcdFx0XHRcdFx0XHRzaG93Rm9ybTogdHJ1ZVxuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRvblJldHVybjogZnVuY3Rpb24odGFyZ2V0TmFtZSkge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblJldHVybicsIHRhcmdldE5hbWUpXG5cdFx0XHRcdFx0XHRcdFx0c3J2TWFpbC5hZGRNYWlsYm94KGN0cmwubW9kZWwuY3VycmVudEFjY291bnQsIHRhcmdldE5hbWUpLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0bG9hZE1haWxib3hlcygpXG5cdFx0XHRcdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkFjY291bnRDaGFuZ2U6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkFjY291bnRDaGFuZ2UnLCAkKHRoaXMpLmdldFZhbHVlKCkpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtjdXJyZW50QWNjb3VudDogJCh0aGlzKS5nZXRWYWx1ZSgpfSlcblx0XHRcdFx0XHRsb2FkTWFpbGJveGVzKClcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvblRyZWVBY3RpdmF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uVHJlZUFjdGl2YXRlJylcblx0XHRcdFx0XHRjb25zdCB0cmVlID0gJCh0aGlzKS5pZmFjZSgpXG5cblx0XHRcdFx0XHRjb25zdCBub2RlID0gIHRyZWUuZ2V0QWN0aXZlTm9kZSgpXG5cblx0XHRcdFx0XHRjb25zdCBtYWlsYm94TmFtZSA9IHRyZWUuZ2V0Tm9kZVBhdGgobm9kZSlcdFx0XHRcdFx0XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ21haWxib3hOYW1lJywgbWFpbGJveE5hbWUpXG5cdFx0XHRcdFx0Y29uc3Qge2N1cnJlbnRBY2NvdW50fSA9IGN0cmwubW9kZWxcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnbWFpbGJveFBhZ2UnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogbm9kZS50aXRsZSxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdGN1cnJlbnRBY2NvdW50LFxuXHRcdFx0XHRcdFx0XHRtYWlsYm94TmFtZVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdG9uQmFjazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IGFjdGl2ZU5vZGUgPSBjdHJsLnNjb3BlLnRyZWUuZ2V0QWN0aXZlTm9kZSgpXG5cdFx0XHRcdFx0XHRcdGlmIChhY3RpdmVOb2RlICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdFx0XHRhY3RpdmVOb2RlLnNldEFjdGl2ZShmYWxzZSlcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblxuXHRcdGZ1bmN0aW9uIGxvYWRBY2NvdW50KCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2xvYWRBY2NvdW50Jylcblx0XHRcdHNydk1haWwuZ2V0TWFpbEFjY291bnRzKCkudGhlbigoYWNjb3VudHMpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FjY291bnRzJywgYWNjb3VudHMpXG5cdFx0XHRcdGlmIChhY2NvdW50cy5sZW5ndGggPT0gMCkge1xuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnN0IGN1cnJlbnRBY2NvdW50ID0gYWNjb3VudHNbMF1cblx0XHRcdFx0Y29uc29sZS5sb2coJ2N1cnJlbnRBY2NvdW50JywgY3VycmVudEFjY291bnQpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7YWNjb3VudHMsIGN1cnJlbnRBY2NvdW50fSlcblx0XHRcdFx0bG9hZE1haWxib3hlcygpXG5cdFx0XHR9KS5jYXRjaCgoZXJyKSA9PiB7XG5cdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6IGVycn0pXG5cdFx0XHR9KVx0XHRcdFxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGxvYWRNYWlsYm94ZXMoKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnbG9hZE1haWxib3hlcycpXG5cdFx0XHRjb25zdCB7Y3VycmVudEFjY291bnR9ID0gY3RybC5tb2RlbFxuXHRcdFx0c3J2TWFpbC5nZXRNYWlsYm94ZXMoY3VycmVudEFjY291bnQpLnRoZW4oKG1haWxib3hlcykgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnbWFpbGJveGVzJywgbWFpbGJveGVzKVxuXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0bWFpbGJveGVzXG5cdFx0XHRcdH0pXG5cdFx0XHR9KVxuXHRcdH1cblxuXHRcdGxvYWRBY2NvdW50KClcblxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdhcHAubWFpbHMnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5odHRwJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCBodHRwKSB7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0Z2V0TWFpbEFjY291bnRzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KCcvZ2V0TWFpbEFjY291bnRzJylcblx0XHRcdH0sXG5cblx0XHRcdGdldE1haWxBY2NvdW50OiBmdW5jdGlvbihuYW1lKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9nZXRNYWlsQWNjb3VudCcsIHtuYW1lfSlcblx0XHRcdH0sXG5cblx0XHRcdGNyZWF0ZU1haWxBY2NvdW50OiBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9jcmVhdGVNYWlsQWNjb3VudCcsIGRhdGEpXG5cdFx0XHR9LFxuXG5cdFx0XHR1cGRhdGVNYWlsQWNjb3VudDogZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvdXBkYXRlTWFpbEFjY291bnQnLCBkYXRhKVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0TWFpbGJveGVzOiBmdW5jdGlvbihuYW1lKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9nZXRNYWlsYm94ZXNgLCB7bmFtZX0pXG5cdFx0XHR9LFxuXG5cdFx0XHRhZGRNYWlsYm94OiBmdW5jdGlvbihuYW1lLCBtYWlsYm94TmFtZSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvYWRkTWFpbGJveGAsIHtuYW1lLCBtYWlsYm94TmFtZX0pXG5cdFx0XHR9LFxuXG5cdFx0XHRvcGVuTWFpbGJveDogZnVuY3Rpb24obmFtZSwgbWFpbGJveE5hbWUsIHBhZ2VObykge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvb3Blbk1haWxib3hgLCB7bmFtZSwgbWFpbGJveE5hbWUsIHBhZ2VOb30pXG5cdFx0XHR9LFxuXG5cdFx0XHRvcGVuTWVzc2FnZTogZnVuY3Rpb24obmFtZSwgbWFpbGJveE5hbWUsIHNlcU5vLCBwYXJ0SUQpXHR7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9vcGVuTWVzc2FnZWAsIHtuYW1lLCBtYWlsYm94TmFtZSwgc2VxTm8sIHBhcnRJRH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRvcGVuQXR0YWNobWVudDogZnVuY3Rpb24obmFtZSwgbWFpbGJveE5hbWUsIHNlcU5vLCBwYXJ0SUQpXHR7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9vcGVuQXR0YWNobWVudGAsIHtuYW1lLCBtYWlsYm94TmFtZSwgc2VxTm8sIHBhcnRJRH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRkZWxldGVNZXNzYWdlOiBmdW5jdGlvbihuYW1lLCBtYWlsYm94TmFtZSwgc2VxTm9zKVx0e1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvZGVsZXRlTWVzc2FnZWAsIHtuYW1lLCBtYWlsYm94TmFtZSwgc2VxTm9zfSlcblx0XHRcdH0sXHRcblxuXHRcdFx0bW92ZU1lc3NhZ2U6IGZ1bmN0aW9uKG5hbWUsIG1haWxib3hOYW1lLCB0YXJnZXROYW1lLCBzZXFOb3MpXHR7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9tb3ZlTWVzc2FnZWAsIHtuYW1lLCBtYWlsYm94TmFtZSwgdGFyZ2V0TmFtZSwgc2VxTm9zfSlcblx0XHRcdH0sXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XG5cblx0XHRcdHNlbmRNYWlsOiBmdW5jdGlvbihhY2NvdW50TmFtZSwgZGF0YSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvc2VuZE1haWxgLCB7YWNjb3VudE5hbWUsIGRhdGF9KVxuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRnZXRNYWlsQWNjb3VudCgpOlByb21pc2U7XG5cdFx0Y3JlYXRlTWFpQWNjb3VudChkYXRhKTpQcm9taXNlO1xuXHRcdGdldE1haWxib3hlcyhuYW1lKTpQcm9taXNlO1xuXHRcdG9wZW5NYWlsYm94KG5hbWUsIG1haWxib3hOYW1lLCBwYWdlTm8pOlByb21pc2U7XG5cdFx0b3Blbk1lc3NhZ2UobmFtZSwgbWFpbGJveE5hbWUsIHNlcU5vLCBwYXJ0SUQpOlByb21pc2U7XG5cdFx0b3BlbkF0dGFjaG1lbnQobmFtZSwgbWFpbGJveE5hbWUsIHNlcU5vLCBwYXJ0SUQpOlByb21pc2U7XG5cdFx0ZGVsZXRlTWVzc2FnZShuYW1lLCBtYWlsYm94TmFtZSwgc2VxTm9zKTpQcm9taXNlO1xuXHRcdG1vdmVNZXNzYWdlKG5hbWUsIG1haWxib3hOYW1lLCB0YXJnZXROYW1lLCBzZXFOb3MpOlByb21pc2Vcblx0XHRgXG59KTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdhY2NvdW50UGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJtYWluXFxcIj5cXG5cdDxmb3JtIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU3VibWl0XFxcIiBibi1iaW5kPVxcXCJmb3JtXFxcIiBibi1mb3JtPVxcXCJkYXRhXFxcIj5cXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdDxsYWJlbD5Qcm92aWRlcjwvbGFiZWw+XFxuXHRcdFx0PHNwYW4gYm4tY29udHJvbD1cXFwiYnJhaW5qcy5zZWxlY3RtZW51XFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJzZWxlY3RtZW51Y2hhbmdlOiBvblByb3ZpZGVyQ2hhbmdlXFxcIiBibi12YWw9XFxcInByb3ZpZGVyXFxcIlxcblx0XHRcdFx0Ym4tZGF0YT1cXFwie2l0ZW1zOiBwcm92aWRlcnN9XFxcIlxcblx0XHRcdFx0Ym4tcHJvcD1cXFwie2Rpc2FibGVkOiBpc0VkaXR9XFxcIlxcblx0XHRcdD5cXG5cdFx0XHQ8L3NwYW4+XHRcdFxcblx0XHQ8L2Rpdj5cdFx0XHRcXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdDxsYWJlbD5BY2NvdW50IE5hbWU8L2xhYmVsPlxcblx0XHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJuYW1lXFxcIiByZXF1aXJlZD1cXFwiXFxcIiBhdXRvZm9jdXM9XFxcIlxcXCIgYm4tcHJvcD1cXFwie2Rpc2FibGVkOiBpc0VkaXR9XFxcIj5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHQ8bGFiZWw+VXNlcjwvbGFiZWw+XFxuXHRcdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcInVzZXJcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdDxsYWJlbD5QYXNzd29yZDwvbGFiZWw+XFxuXHRcdFx0PGlucHV0IHR5cGU9XFxcInBhc3N3b3JkXFxcIiBuYW1lPVxcXCJwd2RcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdDxsYWJlbD5FbWFpbDwvbGFiZWw+XFxuXHRcdFx0PGlucHV0IHR5cGU9XFxcImVtYWlsXFxcIiBuYW1lPVxcXCJlbWFpbFxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XHRcdFx0XFxuXHRcdDwvZGl2Plxcblxcblx0XFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIiBibi1zaG93PVxcXCJzaG93MVxcXCI+XFxuXHRcdFx0PGxhYmVsPklNQVAgU2VydmVyPC9sYWJlbD5cXG5cdFx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwiaW1hcEhvc3RcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlx0XHRcdFxcblx0XHQ8L2Rpdj5cdFx0XFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIiAgYm4tc2hvdz1cXFwic2hvdzFcXFwiPlxcblx0XHRcdDxsYWJlbD5TTVRQIFNlcnZlcjwvbGFiZWw+XFxuXHRcdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcInNtdHBIb3N0XFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cdFx0XHRcXG5cdFx0PC9kaXY+XHRcdFxcblxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJjb3B5U2VudFxcXCI+XFxuXHRcdFx0PGxhYmVsPk1ha2UgYSBjb3B5IG9mIHNlbnQgbWFpbCBpbiBTZW50IGZvbGRlcjwvbGFiZWw+XFxuXHRcdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmZsaXBzd2l0Y2hcXFwiIGJuLWRhdGE9XFxcImRhdGExXFxcIiBuYW1lPVxcXCJtYWtlQ29weVxcXCI+PC9kaXY+XFxuXHRcdDwvZGl2Plxcblxcblx0XHQ8aW5wdXQgdHlwZT1cXFwic3VibWl0XFxcIiBoaWRkZW49XFxcIlxcXCIgYm4tYmluZD1cXFwic3VibWl0XFxcIj5cXG5cdDwvZm9ybT5cXG5cXG48L2Rpdj5cIixcblxuXHRkZXBzOiBbJ2FwcC5tYWlscycsICdicmVpemJvdC5wYWdlciddLFxuXG5cdHByb3BzOiB7XG5cdFx0ZGF0YTogbnVsbFxuXHR9LFxuXG5cdGJ1dHRvbnM6IHtcblx0XHRhcHBseToge3RpdGxlOiAnQXBwbHknLCBpY29uOiAnZmEgZmEtY2hlY2snfVxuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgc3J2TWFpbCwgcGFnZXIpIHtcblxuXHRcdGNvbnN0IHtkYXRhfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IG1hcCA9IHtcblx0XHRcdCdHbWFpbCc6IHtcblx0XHRcdFx0aW1hcEhvc3Q6ICdpbWFwLmdtYWlsLmNvbScsXG5cdFx0XHRcdHNtdHBIb3N0OiAnc210cC5nbWFpbC5jb20nXG5cdFx0XHR9LFxuXHRcdFx0J091dGxvb2snOiB7XG5cdFx0XHRcdGltYXBIb3N0OiAnaW1hcC5vdXRsb29rLmNvbScsXG5cdFx0XHRcdHNtdHBIb3N0OiAnc210cC5vdXRsb29rLmNvbSdcblx0XHRcdH0sXG5cdFx0XHQnRnJlZSc6IHtcblx0XHRcdFx0aW1hcEhvc3Q6ICdpbWFwLmZyZWUuZnInLFxuXHRcdFx0XHRzbXRwSG9zdDogJ3NtdHAuZnJlZS5mcidcblx0XHRcdH0sXG5cdFx0XHQnU0ZSJzoge1xuXHRcdFx0XHRpbWFwSG9zdDogJ2ltYXAuc2ZyLmZyJyxcblx0XHRcdFx0c210cEhvc3Q6ICdzbXRwLnNmci5mcidcblx0XHRcdH0sXG5cdFx0XHQnT3JhbmdlJzoge1xuXHRcdFx0XHRpbWFwSG9zdDogJ2ltYXAub3JhbmdlLmZyJyxcblx0XHRcdFx0c210cEhvc3Q6ICdzbXRwLm9yYW5nZS5mcidcblx0XHRcdH0sXG5cdFx0XHQnQm91eWd1ZXMgVGVsZWNvbSc6IHtcblx0XHRcdFx0aW1hcEhvc3Q6ICdpbWFwLmJib3guZnInLFxuXHRcdFx0XHRzbXRwSG9zdDogJ3NtdHAuYmJveC5mcidcblx0XHRcdH0sXG5cdFx0XHQnT3RoZXInOiB7XG5cdFx0XHRcdGltYXBIb3N0OiAnJyxcblx0XHRcdFx0c210cEhvc3Q6ICcnXG5cdFx0XHR9LFxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldFByb3ZpZGVyKGluZm8pIHtcblx0XHRcdGZvcihsZXQgayBpbiBtYXApIHtcblx0XHRcdFx0aWYgKG1hcFtrXS5pbWFwSG9zdCA9PSBpbmZvLmltYXBIb3N0KSB7XG5cdFx0XHRcdFx0cmV0dXJuIGtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuICdPdGhlcidcblx0XHR9XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHByb3ZpZGVyOiAoZGF0YSAhPSBudWxsKSA/IGdldFByb3ZpZGVyKGRhdGEpIDogJ0dtYWlsJyxcblx0XHRcdFx0cHJvdmlkZXJzOiBPYmplY3Qua2V5cyhtYXApLFxuXHRcdFx0XHRkYXRhLFxuXHRcdFx0XHRpc0VkaXQ6IGRhdGEgIT0gbnVsbCxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uKCkge3JldHVybiB0aGlzLnByb3ZpZGVyID09ICdPdGhlcid9LFxuXHRcdFx0XHRkYXRhMTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtoZWlnaHQ6IDI1LCB3aWR0aDogMTAwLCB0ZXh0czoge2xlZnQ6ICdZRVMnLCByaWdodDogJ05PJ319XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25TdWJtaXQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdGNvbnN0IGZvcm1EYXRhID0gJCh0aGlzKS5nZXRGb3JtRGF0YSgpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ2Zvcm1EYXRhJywgZm9ybURhdGEpXG5cdFx0XHRcdFx0aWYgKGRhdGEgPT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0c3J2TWFpbC5jcmVhdGVNYWlsQWNjb3VudChmb3JtRGF0YSkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoKVxuXHRcdFx0XHRcdFx0fSlcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRzcnZNYWlsLnVwZGF0ZU1haWxBY2NvdW50KGZvcm1EYXRhKS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdFx0cGFnZXIucG9wUGFnZSgpXG5cdFx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblByb3ZpZGVyQ2hhbmdlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zdCBwcm92aWRlciA9ICQodGhpcykuZ2V0VmFsdWUoKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblByb3ZpZGVyQ2hhbmdlJywgcHJvdmlkZXIpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtwcm92aWRlcn0pXG5cblx0XHRcdFx0XHRjdHJsLnNjb3BlLmZvcm0uc2V0Rm9ybURhdGEobWFwW3Byb3ZpZGVyXSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRjdHJsLnNjb3BlLmZvcm0uc2V0Rm9ybURhdGEobWFwW2N0cmwubW9kZWwucHJvdmlkZXJdKVxuXG5cdFx0dGhpcy5vbkFjdGlvbiA9IGZ1bmN0aW9uKGNtZCkge1xuXHRcdFx0Y3RybC5zY29wZS5zdWJtaXQuY2xpY2soKVxuXHRcdH1cblxuXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYWRkQ29udGFjdFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGZvcm0gYm4tZXZlbnQ9XFxcInN1Ym1pdDogb25TdWJtaXRcXFwiIGJuLWZvcm09XFxcImZyb21cXFwiPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHQ8bGFiZWw+TmFtZTo8L2xhYmVsPjxicj5cXG5cdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcIm5hbWVcXFwiIHN0eWxlPVxcXCJtaW4td2lkdGg6IDMwMHB4XFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cdFxcblx0PC9kaXY+XFxuXHQ8YnI+XFxuXFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdDxsYWJlbD5FbWFpbDo8L2xhYmVsPjxicj5cXG5cdFx0PGlucHV0IHR5cGU9XFxcImVtYWlsXFxcIiBuYW1lPVxcXCJlbWFpbFxcXCIgc3R5bGU9XFxcIm1pbi13aWR0aDogMzAwcHhcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlx0XFxuXHQ8L2Rpdj5cdFxcblxcblx0PGlucHV0IHR5cGU9XFxcInN1Ym1pdFxcXCIgYm4tYmluZD1cXFwic3VibWl0XFxcIiBoaWRkZW49XFxcIlxcXCI+XFxuPC9mb3JtPlxcblwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QudXNlcnMnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHRcdGZyb206IHt9XG5cdH0sXG5cblx0YnV0dG9uczoge1xuXHRcdGFkOiAge3RpdGxlOiAnQWRkJywgaWNvbjogJ2ZhIGZhLXVzZXItcGx1cyd9XG5cdH0sXHRcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHVzZXJzLCBwYWdlcikge1xuXG5cdFx0Y29uc3Qge2Zyb219ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRmcm9tXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uU3VibWl0OiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHRjb25zdCBkYXRhID0gJCh0aGlzKS5nZXRGb3JtRGF0YSgpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ2RhdGEnLCBkYXRhKVxuXHRcdFx0XHRcdHVzZXJzLmFkZENvbnRhY3QoZGF0YS5uYW1lLCBkYXRhLmVtYWlsKS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdjb250YWN0IGFkZGVkICEnKVxuXHRcdFx0XHRcdFx0cGFnZXIucG9wUGFnZSgnYWRkQ29udGFjdCcpXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQuY2F0Y2goKGVycikgPT4ge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0Vycm9yJywgY29udGVudDogZXJyLnJlc3BvbnNlVGV4dH0pXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdHRoaXMub25BY3Rpb24gPSBmdW5jdGlvbihjbWQpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdvbkFjdGlvbicsIGNtZClcblx0XHRcdGN0cmwuc2NvcGUuc3VibWl0LmNsaWNrKClcblx0XHR9XG5cblxuXG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JveGVzUGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLXNob3c9XFxcInNob3dGb3JtXFxcIj5cXG5cdDxmb3JtIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU3VibWl0XFxcIj5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdDxsYWJlbD5OYW1lOjwvbGFiZWw+XFxuXHRcdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcIm5hbWVcXFwiIHJlcXVpcmVkPVxcXCJcXFwiIGF1dG9mb2N1cz1cXFwiXFxcIj5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJzdWJtaXRcXFwiIGhpZGRlbj1cXFwiXFxcIiBibi1iaW5kPVxcXCJzdWJtaXRcXFwiPlxcblx0PC9mb3JtPlxcblxcblx0PHA+U2VsZWN0IHRhcmdldCBmb2xkZXI6PC9wPlxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsVHJlZVxcXCI+XFxuXHQ8ZGl2IFxcblx0XHRjbGFzcz1cXFwidHJlZVxcXCIgXFxuXHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMudHJlZVxcXCJcXG5cdFx0Ym4tZGF0YT1cXFwie3NvdXJjZTogbWFpbGJveGVzfVxcXCJcXG5cdFx0Ym4taWZhY2U9XFxcInRyZWVcXFwiXFxuXHQ+PC9kaXY+XFxuPC9kaXY+XFxuXFxuXFxuXCIsXG5cblx0ZGVwczogWydhcHAubWFpbHMnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHRcdGN1cnJlbnRBY2NvdW50OiAnJyxcblx0XHRzaG93Rm9ybTogZmFsc2Vcblx0fSxcblxuXHRidXR0b25zOiB7XG5cdFx0YXBwbHk6IHt0aXRsZTogJ0FwcGx5JywgaWNvbjogJ2ZhIGZhLWNoZWNrJ31cblx0fSxcblx0XG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgc3J2TWFpbCwgcGFnZXIpIHtcblxuXHRcdGNvbnN0IHtjdXJyZW50QWNjb3VudCwgc2hvd0Zvcm19ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRtYWlsYm94ZXM6IFtdLFxuXHRcdFx0XHRzaG93Rm9ybVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblN1Ym1pdDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRcdFx0Y29uc3Qge25hbWV9ID0gJCh0aGlzKS5nZXRGb3JtRGF0YSgpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25TdWJtaXQnLCBuYW1lKVxuXG5cdFx0XHRcdFx0Y29uc3Qge3RyZWV9ID0gY3RybC5zY29wZVxuXHRcdFx0XHRcdGNvbnN0IG5vZGUgPSB0cmVlLmdldEFjdGl2ZU5vZGUoKVxuXHRcdFx0XHRcdGlmIChub2RlID09IG51bGwpIHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdXYXJuaW5nJywgY29udGVudDogJ1BsZWFzZSBzZWxlY3QgYSB0YXJnZXQgbWFpbGJveCd9KVxuXHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGxldCB0YXJnZXROYW1lID0gdHJlZS5nZXROb2RlUGF0aChub2RlKSArICcvJyArIG5hbWVcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCd0YXJnZXROYW1lJywgdGFyZ2V0TmFtZSlcblx0XHRcdFx0XHRjb25zdCB0b2tlbiA9IHRhcmdldE5hbWUuc3BsaXQoJy8nKVxuXHRcdFx0XHRcdHRva2VuLnNoaWZ0KClcblx0XHRcdFx0XHR0YXJnZXROYW1lID0gdG9rZW4uam9pbignLycpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygndGFyZ2V0TmFtZScsIHRhcmdldE5hbWUpXG5cblxuXHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UodGFyZ2V0TmFtZSlcdFx0XHRcdFx0XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cblx0XHRmdW5jdGlvbiBsb2FkTWFpbGJveGVzKCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2xvYWRNYWlsYm94ZXMnKVxuXHRcdFx0c3J2TWFpbC5nZXRNYWlsYm94ZXMoY3VycmVudEFjY291bnQpLnRoZW4oKG1haWxib3hlcykgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnbWFpbGJveGVzJywgbWFpbGJveGVzKVxuXHRcdFx0XHRpZiAoc2hvd0Zvcm0pIHtcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdFx0bWFpbGJveGVzOiBbe1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ0ZvbGRlcnMnLFxuXHRcdFx0XHRcdFx0XHRmb2xkZXI6IHRydWUsXG5cdFx0XHRcdFx0XHRcdGNoaWxkcmVuOiBtYWlsYm94ZXMsXG5cdFx0XHRcdFx0XHRcdGV4cGFuZGVkOiB0cnVlXG5cdFx0XHRcdFx0XHR9XVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRcdG1haWxib3hlc1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0bG9hZE1haWxib3hlcygpXG5cblxuXHRcdHRoaXMub25BY3Rpb24gPSBmdW5jdGlvbihhY3Rpb24pIHtcblx0XHRcdGNvbnNvbGUubG9nKCdvbkFjdGlvbicsIGFjdGlvbilcblx0XHRcdGlmIChhY3Rpb24gPT0gJ2FwcGx5Jykge1xuXG5cdFx0XHRcdGlmIChzaG93Rm9ybSkge1xuXHRcdFx0XHRcdGN0cmwuc2NvcGUuc3VibWl0LmNsaWNrKClcblx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnN0IHt0cmVlfSA9IGN0cmwuc2NvcGVcblx0XHRcdFx0Y29uc3Qgbm9kZSA9IHRyZWUuZ2V0QWN0aXZlTm9kZSgpXG5cdFx0XHRcdGlmIChub2RlID09IG51bGwpIHtcblx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnU2VsZWN0IFRhcmdldCBNYWlsYm94JywgY29udGVudDogJ1BsZWFzZSBzZWxlY3QgYSB0YXJnZXQgbWFpbGJveCd9KVxuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnN0IHRhcmdldE5hbWUgPSB0cmVlLmdldE5vZGVQYXRoKG5vZGUpXG5cblx0XHRcdFx0cGFnZXIucG9wUGFnZSh0YXJnZXROYW1lKVxuXHRcdFx0fVxuXHRcdH1cblxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdjb250YWN0c1BhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5jb250YWN0c1xcXCIgZGF0YS1zaG93LXNlbGVjdGlvbj1cXFwidHJ1ZVxcXCIgYm4taWZhY2U9XFxcImNvbnRhY3RzXFxcIj48L2Rpdj5cXG5cdFxcbjwvZGl2PlxcblxcblxcblwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInXSxcblxuXHRidXR0b25zOiB7XG5cdFx0b2s6IHt0aXRsZTogJ0FwcGx5JywgaWNvbjogJ2ZhIGZhLWNoZWNrJ31cblx0fSxcblx0XG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgcGFnZXIpIHtcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQpXG5cblxuXHRcdHRoaXMub25BY3Rpb24gPSBmdW5jdGlvbihhY3Rpb24pIHtcblx0XHRcdGNvbnNvbGUubG9nKCdvbkFjdGlvbicsIGFjdGlvbilcblx0XHRcdGlmIChhY3Rpb24gPT0gJ29rJykge1xuXHRcdFx0XHRwYWdlci5wb3BQYWdlKGN0cmwuc2NvcGUuY29udGFjdHMuZ2V0U2VsZWN0aW9uKCkpXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdtYWlsYm94UGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cdDxkaXY+XFxuXHRcdDxkaXYgYm4tc2hvdz1cXFwic2hvdzFcXFwiPlxcblx0XHRcdDxzcGFuID5QYWdlOiA8c3BhbiBibi10ZXh0PVxcXCJ0ZXh0MVxcXCI+PC9zcGFuPjwvc3Bhbj5cXG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJwcmV2aW91cyBwYWdlXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uUHJldlBhZ2VcXFwiPlxcblx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWFuZ2xlLWxlZnRcXFwiPjwvaT5cXG5cdFx0XHQ8L2J1dHRvbj5cdFx0XHRcXG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJuZXh0IHBhZ2VcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25OZXh0UGFnZVxcXCI+XFxuXHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtYW5nbGUtcmlnaHRcXFwiPjwvaT5cXG5cdFx0XHQ8L2J1dHRvbj5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXHRcdDxkaXYgYm4tc2hvdz1cXFwibG9hZGluZ1xcXCIgY2xhc3M9XFxcImxvYWRpbmdcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1zcGlubmVyIGZhLXB1bHNlXFxcIj48L2k+XFxuXHRcdFx0bG9hZGluZyAuLi5cXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgY2xhc3M9XFxcIm5iTXNnXFxcIj48c3Ryb25nIGJuLXRleHQ9XFxcIm5iTXNnXFxcIj48L3N0cm9uZz4mbmJzcDtNZXNzYWdlczwvZGl2Plx0XHRcXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFRhYmxlXFxcIj5cXG5cdDx0YWJsZSBjbGFzcz1cXFwidzMtdGFibGUtYWxsIHczLWhvdmVyYWJsZSB3My1zbWFsbFxcXCI+XFxuXHRcdDx0aGVhZD5cXG5cdFx0XHQ8dHIgY2xhc3M9XFxcInczLWdyZWVuXFxcIj5cXG5cdFx0XHRcdDx0aD48aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25NYWluQ2hlY2tCb3hDbGlja1xcXCIgYm4tdmFsPVxcXCJjaGVja1xcXCIgYm4tdXBkYXRlPVxcXCJjbGlja1xcXCI+PC90aD5cXG5cdFx0XHRcdDx0aCBibi1zaG93PVxcXCIhaXNTZW50Qm94XFxcIj5Gcm9tPC90aD5cXG5cdFx0XHRcdDx0aCBibi1zaG93PVxcXCJpc1NlbnRCb3hcXFwiPlRvPC90aD5cXG5cdFx0XHRcdDx0aD5TdWJqZWN0PC90aD5cXG5cdFx0XHRcdDx0aCB0aXRsZT1cXFwibmIgQXR0YWNobWVudHNcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1wYXBlcmNsaXBcXFwiPjwvaT48L3RoPlxcblx0XHRcdFx0PHRoPkRhdGU8L3RoPlxcblx0XHRcdDwvdHI+XFxuXHRcdDwvdGhlYWQ+XFxuXHRcdDx0Ym9keSBibi1lYWNoPVxcXCJtZXNzYWdlc1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLml0ZW06IG9uSXRlbUNsaWNrXFxcIj5cXG5cdFx0XHQ8dHIgYm4tY2xhc3M9XFxcInt1bnNlZW46ICFpc1NlZW59XFxcIj5cXG5cdFx0XHRcdDx0aD48aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGNsYXNzPVxcXCJjaGVja1xcXCIgPjwvdGg+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmZyb20ubmFtZVxcXCIgYm4tYXR0cj1cXFwie3RpdGxlOiAkc2NvcGUuJGkuZnJvbS5lbWFpbH1cXFwiIGJuLXNob3c9XFxcIiFpc1NlbnRCb3hcXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwidGV4dDJcXFwiIGJuLWF0dHI9XFxcImF0dHIxXFxcIiBibi1zaG93PVxcXCJpc1NlbnRCb3hcXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLnN1YmplY3RcXFwiIGNsYXNzPVxcXCJpdGVtXFxcIiA+PC90ZD5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkubmJBdHRhY2htZW50c1xcXCI+PC90ZD5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCJnZXREYXRlXFxcIj48L3RkPlxcblx0XHRcdDwvdHI+XFxuXHRcdDwvdGJvZHk+XFxuXHQ8L3RhYmxlPlxcbjwvZGl2PlxcblxcblxcblwiLFxuXG5cdGRlcHM6IFsnYXBwLm1haWxzJywgJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0cHJvcHM6IHtcblx0XHRjdXJyZW50QWNjb3VudDogJycsXG5cdFx0bWFpbGJveE5hbWU6ICcnXG5cdH0sXG5cblx0YnV0dG9uczoge1xuXHRcdHJlbG9hZDoge2ljb246ICdmYSBmYS1zeW5jLWFsdCcsIHRpdGxlOiAnVXBkYXRlJ30sXG5cdFx0bmV3TWFpbDoge2ljb246ICdmYSBmYS1lbnZlbG9wZScsIHRpdGxlOiAnTmV3IE1lc3NhZ2UnfSxcblx0XHRtb3ZlOiB7aWNvbjogJ2ZhIGZhLWZpbGUtZXhwb3J0JywgdGl0bGU6ICdNb3ZlIHNlbGVjdGVkIG1lc3NhZ2VzJ30sXG5cdFx0ZGVsZXRlOiB7aWNvbjogJ2ZhIGZhLXRyYXNoJywgdGl0bGU6ICdEZWxldGUgc2VsZWN0ZWQgbWVzc2FnZXMnfVx0XG5cdH0sXHRcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydk1haWwsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCB7Y3VycmVudEFjY291bnQsIG1haWxib3hOYW1lfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0bWVzc2FnZXM6IFtdLFxuXHRcdFx0XHRuYk1zZzogMCxcblx0XHRcdFx0cGFnZU5vOiAwLFxuXHRcdFx0XHRuYlBhZ2U6IDAsXG5cdFx0XHRcdGNoZWNrOiBmYWxzZSxcblx0XHRcdFx0bG9hZGluZzogZmFsc2UsXG5cdFx0XHRcdG1haWxib3hOYW1lLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuICF0aGlzLmxvYWRpbmcgJiYgdGhpcy5uYk1zZyA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0dGV4dDE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBgJHt0aGlzLnBhZ2VOb30gLyAke3RoaXMubmJQYWdlfWBcblx0XHRcdFx0fSxcblx0XHRcdFx0dGV4dDI6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLiRpLnRvWzBdICYmIHNjb3BlLiRpLnRvWzBdLm5hbWVcblx0XHRcdFx0fSxcblx0XHRcdFx0YXR0cjE6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHt0aXRsZTogc2NvcGUuJGkudG9bMF0gJiYgc2NvcGUuJGkudG9bMF0uZW1haWx9XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0Z2V0RGF0ZTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdnZXREYXRlJywgZGF0ZSlcblx0XHRcdFx0XHRjb25zdCBkYXRlID0gc2NvcGUuJGkuZGF0ZVxuXHRcdFx0XHRcdGNvbnN0IGQgPSBuZXcgRGF0ZShkYXRlKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2QnLCBkKVxuXHRcdFx0XHRcdHJldHVybiBkLnRvTG9jYWxlRGF0ZVN0cmluZygnZnItRlInKVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdGlzU2VlbjogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuJGkuZmxhZ3MuaW5jbHVkZXMoJ1xcXFxTZWVuJylcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRpc1NlbnRCb3g6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLm1haWxib3hOYW1lID09ICdTZW50J1xuXHRcdFx0XHR9XG5cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25JdGVtQ2xpY2s6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Ly8gJCh0aGlzKS5jbG9zZXN0KCd0Ym9keScpLmZpbmQoJ3RyJykucmVtb3ZlQ2xhc3MoJ3czLWJsdWUnKVxuXHRcdFx0XHRcdC8vICQodGhpcykuYWRkQ2xhc3MoJ3czLWJsdWUnKVxuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3QgaXRlbSA9IGN0cmwubW9kZWwubWVzc2FnZXNbaWR4XVxuXHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdtZXNzYWdlUGFnZScsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiBgTWVzc2FnZSAjJHtjdHJsLm1vZGVsLm5iTXNnIC0gaXRlbS5zZXFubyArIDF9YCxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdGN1cnJlbnRBY2NvdW50LFxuXHRcdFx0XHRcdFx0XHRtYWlsYm94TmFtZSxcblx0XHRcdFx0XHRcdFx0aXRlbVx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0b25CYWNrOiBsb2FkXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbk1haW5DaGVja0JveENsaWNrOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGVsdC5maW5kKCcuY2hlY2snKS5wcm9wKCdjaGVja2VkJywgJCh0aGlzKS5wcm9wKCdjaGVja2VkJykpXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25QcmV2UGFnZTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCB7bmJQYWdlLCBwYWdlTm99ID0gY3RybC5tb2RlbFxuXG5cdFx0XHRcdFx0aWYgKHBhZ2VObyA+IDEpIHtcblx0XHRcdFx0XHRcdGxvYWQocGFnZU5vIC0gMSlcblx0XHRcdFx0XHR9XHRcdFx0XHRcdFxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uTmV4dFBhZ2U6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3Qge25iUGFnZSwgcGFnZU5vfSA9IGN0cmwubW9kZWxcblxuXHRcdFx0XHRcdGlmIChwYWdlTm8gPCBuYlBhZ2UpIHtcblx0XHRcdFx0XHRcdGxvYWQocGFnZU5vICsgMSlcblx0XHRcdFx0XHR9XHRcdFx0XHRcblx0XHRcdFx0fVx0XHRcdFx0XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGZ1bmN0aW9uIGxvYWQocGFnZU5vKSB7XG5cdFx0XHRpZiAocGFnZU5vID09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRwYWdlTm8gPSBjdHJsLm1vZGVsLnBhZ2VOb1xuXHRcdFx0fVxuXG5cdFx0XHRjdHJsLnNldERhdGEoe2xvYWRpbmc6IHRydWV9KVxuXG5cdFx0XHRzcnZNYWlsLm9wZW5NYWlsYm94KGN1cnJlbnRBY2NvdW50LCBtYWlsYm94TmFtZSwgcGFnZU5vKS50aGVuKChkYXRhKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdkYXRhJywgZGF0YSlcblx0XHRcdFx0Y29uc3Qge21lc3NhZ2VzLCBuYk1zZ30gPSBkYXRhXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0bG9hZGluZzogZmFsc2UsXG5cdFx0XHRcdFx0Y2hlY2s6IGZhbHNlLFxuXHRcdFx0XHRcdHBhZ2VObyxcblx0XHRcdFx0XHRuYlBhZ2U6IE1hdGguY2VpbChuYk1zZyAvIDIwKSxcblx0XHRcdFx0XHRuYk1zZyxcblx0XHRcdFx0XHRtZXNzYWdlczogbWVzc2FnZXMucmV2ZXJzZSgpXG5cdFx0XHRcdH0pXG5cdFx0XHR9KVx0XHRcdFxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldFNlcU5vcygpIHtcblx0XHRcdGNvbnN0IGl0ZW1zID0gZWx0LmZpbmQoJy5jaGVjazpjaGVja2VkJylcblx0XHRcdGNvbnN0IHNlcU5vcyA9IFtdXG5cdFx0XHRpdGVtcy5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuaW5kZXgoKVxuXHRcdFx0XHRzZXFOb3MucHVzaChjdHJsLm1vZGVsLm1lc3NhZ2VzW2lkeF0uc2Vxbm8pXG5cdFx0XHR9KVxuXHRcdFx0Y29uc29sZS5sb2coJ3NlcU5vcycsIHNlcU5vcylcblx0XHRcdHJldHVybiBzZXFOb3Ncblx0XHR9XG5cblx0XHRmdW5jdGlvbiBkZWxldGVNZXNzYWdlKCkge1xuXHRcdFx0Y29uc3Qgc2VxTm9zID0gZ2V0U2VxTm9zKClcblx0XHRcdGlmIChzZXFOb3MubGVuZ3RoID09IDApIHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0RlbGV0ZSBNZXNzYWdlJywgY29udGVudDogJ1BsZWFzZSBzZWxlY3Qgb25lIG9yIHNldmVyYWxsIG1lc3NhZ2VzICEnfSlcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cblx0XHRcdHNydk1haWwuZGVsZXRlTWVzc2FnZShjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIHNlcU5vcykudGhlbigoKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdNZXNzYWdlcyBkZWxldGVkJylcblx0XHRcdFx0bG9hZCgpXG5cdFx0XHR9KVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIG1vdmVNZXNzYWdlKCkge1xuXHRcdFx0Y29uc3Qgc2VxTm9zID0gZ2V0U2VxTm9zKClcblx0XHRcdGlmIChzZXFOb3MubGVuZ3RoID09IDApIHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ01vdmUgTWVzc2FnZScsIGNvbnRlbnQ6ICdQbGVhc2Ugc2VsZWN0IG9uZSBvciBzZXZlcmFsbCBtZXNzYWdlcyAhJ30pXG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXG5cdFx0XHRwYWdlci5wdXNoUGFnZSgnYm94ZXNQYWdlJywge1xuXHRcdFx0XHR0aXRsZTogJ1NlbGVjdCB0YXJnZXQgbWFpbGJveCcsXG5cdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0Y3VycmVudEFjY291bnRcblx0XHRcdFx0fSxcblx0XHRcdFx0b25SZXR1cm46IGZ1bmN0aW9uKHRhcmdldE5hbWUpIHtcblx0XHRcdFx0XHRpZiAodGFyZ2V0TmFtZSA9PSBtYWlsYm94TmFtZSkge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ1NlbGVjdCBUYXJnZXQgTWFpbGJveCcsIGNvbnRlbnQ6ICdUYXJnZXQgbWFpbGJveCBtdXN0IGJlIGRpZmZlcmVudCBmcm9tIGN1cnJlbnQgbWFpbGJveCd9KVxuXHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0c3J2TWFpbC5tb3ZlTWVzc2FnZShjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIHRhcmdldE5hbWUsIHNlcU5vcylcblx0XHRcdFx0XHQudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRsb2FkKClcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXHRcdFx0Ly8gc3J2TWFpbC5kZWxldGVNZXNzYWdlKGN1cnJlbnRBY2NvdW50LCBtYWlsYm94TmFtZSwgc2VxTm9zKS50aGVuKCgpID0+IHtcblx0XHRcdC8vIFx0Y29uc29sZS5sb2coJ01lc3NhZ2VzIGRlbGV0ZWQnKVxuXHRcdFx0Ly8gXHRsb2FkKClcblx0XHRcdC8vIH0pXG5cdFx0fVx0XHRcblxuXHRcdGxvYWQoMSlcblxuXHRcdGZ1bmN0aW9uIG5ld01lc3NhZ2UoKSB7XG5cdFx0XHRwYWdlci5wdXNoUGFnZSgnd3JpdGVNYWlsUGFnZScsIHtcblx0XHRcdFx0dGl0bGU6ICdOZXcgTWVzc2FnZScsXG5cdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0YWNjb3VudE5hbWU6IGN1cnJlbnRBY2NvdW50XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRpZiAobWFpbGJveE5hbWUgPT0gJ1NlbnQnKSB7XG5cdFx0XHRcdFx0XHRsb2FkKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pXHRcdFx0XG5cdFx0fVxuXG5cblx0XHR0aGlzLm9uQWN0aW9uID0gZnVuY3Rpb24oYWN0aW9uKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnb25BY3Rpb24nLCBhY3Rpb24pXG5cdFx0XHRpZiAoYWN0aW9uID09ICdyZWxvYWQnKSB7XG5cdFx0XHRcdGxvYWQoMSlcblx0XHRcdH1cblxuXHRcdFx0aWYgKGFjdGlvbiA9PSAnZGVsZXRlJykge1xuXHRcdFx0XHRkZWxldGVNZXNzYWdlKClcblx0XHRcdH1cblxuXHRcdFx0aWYgKGFjdGlvbiA9PSAnbW92ZScpIHtcblx0XHRcdFx0bW92ZU1lc3NhZ2UoKVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoYWN0aW9uID09ICduZXdNYWlsJykge1xuXHRcdFx0XHRuZXdNZXNzYWdlKClcblx0XHRcdH1cdFx0XHRcblx0XHR9XG5cblxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdtZXNzYWdlUGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLXNob3c9XFxcImxvYWRpbmdcXFwiIGNsYXNzPVxcXCJsb2FkaW5nXFxcIj5cXG5cdDxpIGNsYXNzPVxcXCJmYSBmYS1zcGlubmVyIGZhLXB1bHNlXFxcIj48L2k+XFxuXHRsb2FkaW5nIC4uLlxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImhlYWRlciB3My1ibHVlXFxcIiBibi1zaG93PVxcXCIhbG9hZGluZ1xcXCI+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJmcm9tXFxcIj48c3Ryb25nPkZyb206PC9zdHJvbmc+PGEgaHJlZj1cXFwiI1xcXCIgYm4tdGV4dD1cXFwiaXRlbS5mcm9tLm5hbWVcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25BZGRDb250YWN0XFxcIiBibi1kYXRhPVxcXCJ7YWRkcjogaXRlbS5mcm9tfVxcXCI+PC9hPjwvZGl2Plxcblx0PGRpdiBjbGFzcz1cXFwic3ViamVjdFxcXCI+PHN0cm9uZz5TdWJqZWN0Ojwvc3Ryb25nPjxzcGFuIGJuLXRleHQ9XFxcIml0ZW0uc3ViamVjdFxcXCIgPjwvc3Bhbj48L2Rpdj5cXG5cdDxkaXYgYm4tc2hvdz1cXFwic2hvdzFcXFwiIGNsYXNzPVxcXCJ0b1xcXCI+XFxuXHRcdDxzdHJvbmcgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblRvZ2dsZURpdlxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWNhcmV0LWRvd24gZmEtZndcXFwiPjwvaT5cXG5cdFx0VG88L3N0cm9uZz5cXG5cdFx0PHVsIGJuLWVhY2g9XFxcIml0ZW0udG9cXFwiIGJuLWV2ZW50PVxcXCJjbGljay5jb250YWN0OiBvbkFkZENvbnRhY3RcXFwiPlxcblx0XHRcdDxsaT5cXG5cdFx0XHRcdDxhIGhyZWY9XFxcIiNcXFwiIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5uYW1lXFxcIiBjbGFzcz1cXFwiY29udGFjdFxcXCI+PC9hPlx0XHRcdFx0XFxuXHRcdFx0PC9saT5cXG5cdFx0PC91bD5cXG5cdDwvZGl2Plxcblx0PGRpdiBjbGFzcz1cXFwiYXR0YWNobWVudHNcXFwiIGJuLXNob3c9XFxcInNob3cyXFxcIj5cXG5cdFx0PHN0cm9uZyBibi1ldmVudD1cXFwiY2xpY2s6IG9uVG9nZ2xlRGl2XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtY2FyZXQtZG93biBmYS1md1xcXCI+PC9pPlxcblx0XHRBdHRhY2htZW50czwvc3Ryb25nPlxcblx0XHQ8dWwgIGJuLWVhY2g9XFxcImF0dGFjaG1lbnRzXFxcIiBibi1ldmVudD1cXFwiY2xpY2suaXRlbTogb3BlbkF0dGFjaG1lbnRcXFwiPlxcblx0XHRcdDxsaT5cXG5cdFx0XHRcdDxhIGhyZWY9XFxcIiNcXFwiIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5uYW1lXFxcIiBjbGFzcz1cXFwiaXRlbVxcXCI+PC9hPlxcblx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiZ2V0U2l6ZVxcXCI+PC9zcGFuPlxcblx0XHRcdDwvbGk+XFxuXHRcdDwvdWw+XFxuXHQ8L2Rpdj5cXG5cdFxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcIm1haW5IdG1sXFxcIiBibi1zaG93PVxcXCJzaG93NFxcXCI+XFxuXHQ8ZGl2IGJuLXNob3c9XFxcInNob3czXFxcIiBjbGFzcz1cXFwiZW1iZWRkZWRJbWFnZXMgdzMtcGFsZS15ZWxsb3dcXFwiPlxcblx0XHQ8YSBocmVmPVxcXCIjXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uRW1iZWRkZWRJbWFnZXNcXFwiPkRvd25sb2FkIGVtYmVkZGVkIGltYWdlczwvYT5cXG5cdDwvZGl2Plxcblx0PGlmcmFtZSBibi1hdHRyPVxcXCJ7c3JjZG9jOnRleHR9XFxcIiBibi1iaW5kPVxcXCJpZnJhbWVcXFwiIGJuLWV2ZW50PVxcXCJsb2FkOiBvbkZyYW1lTG9hZGVkXFxcIj48L2lmcmFtZT5cXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJtYWluVGV4dFxcXCIgYm4tc2hvdz1cXFwic2hvdzVcXFwiPlxcbiBcdDxwcmUgYm4tdGV4dD1cXFwidGV4dFxcXCI+PC9wcmU+XFxuPC9kaXY+XCIsXG5cblx0ZGVwczogWydhcHAubWFpbHMnLCAnYnJlaXpib3Quc2NoZWR1bGVyJywgJ2JyZWl6Ym90LnBhZ2VyJywgJ2JyZWl6Ym90LmZpbGVzJ10sXG5cblx0cHJvcHM6IHtcblx0XHRjdXJyZW50QWNjb3VudDogJycsXG5cdFx0bWFpbGJveE5hbWU6ICcnLFxuXHRcdGl0ZW06IG51bGxcblx0fSxcblxuXHRidXR0b25zOiB7XG5cdFx0cmVwbHk6IHtpY29uOiAnZmEgZmEtcmVwbHknLCB0aXRsZTogJ1JlcGx5J30sXG5cdFx0cmVwbHlBbGw6IHtpY29uOiAnZmEgZmEtcmVwbHktYWxsJywgdGl0bGU6ICdSZXBseSBBbGwnfSxcblx0XHRmb3J3YXJkOiB7aWNvbjogJ2ZhIGZhLXNoYXJlLXNxdWFyZScsIHRpdGxlOiAnRm9yd2FyZCd9XG5cdH0sXHRcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydk1haWwsIHNjaGVkdWxlciwgcGFnZXIsIHNydkZpbGVzKSB7XG5cblx0XHRjb25zdCB7Y3VycmVudEFjY291bnQsIG1haWxib3hOYW1lLCBpdGVtfSA9IHRoaXMucHJvcHNcblxuXG5cdFx0Y29uc3Qgd2FpdERsZyA9ICQkLmRpYWxvZ0NvbnRyb2xsZXIoe1xuXHRcdFx0dGl0bGU6ICdMb2FkaW5nIC4uLicsXG5cdFx0XHR0ZW1wbGF0ZTogYDxkaXYgY2xhc3M9XCJ3My1jZW50ZXIgdzMtcGFkZGluZy0xNlwiPjxpIGNsYXNzPVwiZmEgZmEtcmVkby1hbHQgZmEtMnggZmEtcHVsc2UgdzMtdGV4dC1ibHVlXCI+PC9pPjwvZGl2PmAsXG5cdFx0XHR3aWR0aDogMTAwLFxuXHRcdFx0Y2FuQ2xvc2U6IGZhbHNlXG5cdFx0fSlcblxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRlbWJlZGRlZEltYWdlczogW10sXG5cdFx0XHRcdGlzSHRtbDogZmFsc2UsXG5cdFx0XHRcdGxvYWRpbmc6IHRydWUsXG5cdFx0XHRcdHRleHQ6ICcnLFxuXHRcdFx0XHRpdGVtLFxuXHRcdFx0XHRhdHRhY2htZW50czogW10sXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5pdGVtLnRvLmxlbmd0aCA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmF0dGFjaG1lbnRzLmxlbmd0aCA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmVtYmVkZGVkSW1hZ2VzLmxlbmd0aCA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiAhdGhpcy5sb2FkaW5nICYmIHRoaXMuaXNIdG1sXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3c1OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gIXRoaXMubG9hZGluZyAmJiAhdGhpcy5pc0h0bWxcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0U2l6ZTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRsZXQgc2l6ZSA9IHNjb3BlLiRpLnNpemVcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdnZXRTaXplJywgc2l6ZSlcblx0XHRcdFx0XHRzaXplIC89IDEwMjRcblx0XHRcdFx0XHRsZXQgdW5pdCA9ICdLbydcblx0XHRcdFx0XHRpZiAoc2l6ZSA+IDEwMjQpIHtcblx0XHRcdFx0XHRcdHNpemUgLz0gMTAyNFxuXHRcdFx0XHRcdFx0dW5pdCA9ICdNbydcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXR1cm4gYCAoJHtzaXplLnRvRml4ZWQoMSl9ICR7dW5pdH0pYFxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9wZW5BdHRhY2htZW50OiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnN0IGluZm8gPSBjdHJsLm1vZGVsLmF0dGFjaG1lbnRzW2lkeF1cblx0XHRcdFx0XHRjb25zdCB7cGFydElELCB0eXBlLCBzdWJ0eXBlfSA9IGluZm9cblxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvcGVuQXR0YWNobWVudHMnLCBpbmZvKVxuXG5cdFx0XHRcdFx0aWYgKGluZm8uY2FuT3Blbikge1xuXHRcdFx0XHRcdFx0d2FpdERsZy5zaG93KClcblx0XHRcdFx0XHRcdHNydk1haWwub3BlbkF0dGFjaG1lbnQoY3VycmVudEFjY291bnQsIG1haWxib3hOYW1lLCBpdGVtLnNlcW5vLCBwYXJ0SUQpLnRoZW4oKG1lc3NhZ2UpID0+IHtcblx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnbWVzc2FnZScsIG1lc3NhZ2UpXG5cdFx0XHRcdFx0XHRcdHdhaXREbGcuaGlkZSgpXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHVybCA9IGBkYXRhOiR7dHlwZX0vJHtzdWJ0eXBlfTtiYXNlNjQsYCArIG1lc3NhZ2UuZGF0YVxuXHRcdFx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3Qudmlld2VyJywge1xuXHRcdFx0XHRcdFx0XHRcdHRpdGxlOiBpbmZvLm5hbWUsXG5cdFx0XHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0XHRcdHR5cGU6ICQkLnV0aWwuZ2V0RmlsZVR5cGUoaW5mby5uYW1lKSxcblx0XHRcdFx0XHRcdFx0XHRcdHVybFx0XG5cdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRidXR0b25zOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRzYXZlOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRpdGxlOiAnU2F2ZScsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGljb246ICdmYSBmYS1zYXZlJyxcblx0XHRcdFx0XHRcdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgYmxvYiA9ICQkLnV0aWwuZGF0YVVSTHRvQmxvYih1cmwpXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0c3J2RmlsZXMudXBsb2FkRmlsZShibG9iLCBpbmZvLm5hbWUsICcvYXBwcy9lbWFpbCcpLnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cGFnZXIucG9wUGFnZSgpXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSlcdFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC5jYXRjaChmdW5jdGlvbihyZXNwKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0Vycm9yJyxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29udGVudDogcmVzcC5yZXNwb25zZVRleHRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSlcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fSxcdFxuXHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdFx0fSlcdFx0XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93Q29uZmlybSh7XG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnT3BlbiBBdHRhY2htZW50JywgXG5cdFx0XHRcdFx0XHRcdG9rVGV4dDogJ1llcycsXG5cdFx0XHRcdFx0XHRcdGNhbmNlbFRleHQ6ICdObycsXG5cdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IGBUaGlzIGF0dGFjaG1lbnQgY2Fubm90IGJlIG9wZW4gd2l0aCBOZXRPUzxicj5cblx0XHRcdFx0XHRcdFx0XHREbyB5b3Ugd2FudCB0byBkb3dubG9hZCBpdCA/YFxuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnT0snKVxuXHRcdFx0XHRcdFx0XHRcdHdhaXREbGcuc2hvdygpXG5cdFx0XHRcdFx0XHRcdFx0c3J2TWFpbC5vcGVuQXR0YWNobWVudChjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIGl0ZW0uc2Vxbm8sIHBhcnRJRCkudGhlbigobWVzc2FnZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnbWVzc2FnZScsIG1lc3NhZ2UpXG5cdFx0XHRcdFx0XHRcdFx0XHR3YWl0RGxnLmhpZGUoKVxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgdXJsID0gYGRhdGE6JHt0eXBlfS8ke3N1YnR5cGV9O2Jhc2U2NCxgICsgbWVzc2FnZS5kYXRhXG5cdFx0XHRcdFx0XHRcdFx0XHQkJC51dGlsLmRvd25sb2FkVXJsKHVybCwgaW5mby5uYW1lKVxuXG5cdFx0XHRcdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVG9nZ2xlRGl2OiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkF0dGFjaENsaWNrJylcblx0XHRcdFx0XHRjb25zdCAkaSA9ICQodGhpcykuZmluZCgnaScpXG5cdFx0XHRcdFx0Y29uc3QgJHVsID0gJCh0aGlzKS5zaWJsaW5ncygndWwnKVxuXHRcdFx0XHRcdGlmICgkaS5oYXNDbGFzcygnZmEtY2FyZXQtcmlnaHQnKSkge1xuXHRcdFx0XHRcdFx0JGkucmVtb3ZlQ2xhc3MoJ2ZhLWNhcmV0LXJpZ2h0JykuYWRkQ2xhc3MoJ2ZhLWNhcmV0LWRvd24nKVxuXHRcdFx0XHRcdFx0JHVsLnNsaWRlRG93bigpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0JGkucmVtb3ZlQ2xhc3MoJ2ZhLWNhcmV0LWRvd24nKS5hZGRDbGFzcygnZmEtY2FyZXQtcmlnaHQnKVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0JHVsLnNsaWRlVXAoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0b25FbWJlZGRlZEltYWdlczogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRcdFx0Ly9jdHJsLnNldERhdGEoe2VtYmVkZGVkSW1hZ2VzOiBbXX0pXG5cdFx0XHRcdFx0Y29uc3QgJGlmcmFtZSA9ICQoY3RybC5zY29wZS5pZnJhbWUuZ2V0KDApLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQpXG5cblx0XHRcdFx0XHRjb25zdCB7ZW1iZWRkZWRJbWFnZXN9ID0gY3RybC5tb2RlbFxuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7ZW1iZWRkZWRJbWFnZXM6IFtdfSlcblxuXHRcdFx0XHRcdGVtYmVkZGVkSW1hZ2VzLmZvckVhY2goKGUpID0+IHtcblx0XHRcdFx0XHRcdGNvbnN0IHt0eXBlLCBzdWJ0eXBlLCBwYXJ0SUQsIGNpZH0gPSBlXG5cdFx0XHRcdFx0XHRzcnZNYWlsLm9wZW5BdHRhY2htZW50KGN1cnJlbnRBY2NvdW50LCBtYWlsYm94TmFtZSwgaXRlbS5zZXFubywgcGFydElEKS50aGVuKChtZXNzYWdlKSA9PiB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IHVybCA9IGBkYXRhOiR7dHlwZX0vJHtzdWJ0eXBlfTtiYXNlNjQsYCArIG1lc3NhZ2UuZGF0YVxuXHRcdFx0XHRcdFx0XHRjb25zdCAkaW1nID0gJGlmcmFtZS5maW5kKGBpbWdbc3JjPVwiY2lkOiR7Y2lkfVwiXWApXG5cdFx0XHRcdFx0XHRcdCRpbWcuYXR0cignc3JjJywgdXJsKVxuXG5cdFx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcblxuXHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25GcmFtZUxvYWRlZDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25GcmFtZUxvYWRlZCcpXG5cdFx0XHRcdFx0Y29uc3QgJGlmcmFtZSA9ICQodGhpcy5jb250ZW50V2luZG93LmRvY3VtZW50KVxuXHRcdFx0XHRcdCRpZnJhbWUuZmluZCgnYScpXG5cdFx0XHRcdFx0LmF0dHIoJ3RhcmdldCcsICdfYmxhbmsnKVxuXHRcdFx0XHRcdC5vbignY2xpY2snLCBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdFx0Y29uc3QgaHJlZiA9ICQodGhpcykuYXR0cignaHJlZicpXG5cdFx0XHRcdFx0XHRpZiAoaHJlZi5zdGFydHNXaXRoKCdodHRwczovL3lvdXR1LmJlLycpKSB7XG5cdFx0XHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHRcdFx0c2NoZWR1bGVyLm9wZW5BcHAoJ3lvdXR1YmUnLCB7dXJsOiBocmVmfSlcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQWRkQ29udGFjdDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25BZGRDb250YWN0Jylcblx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCdsaScpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCBmcm9tID0gY3RybC5tb2RlbC5pdGVtLnRvW2lkeF1cblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYWRkQ29udGFjdFBhZ2UnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ0FkZCBDb250YWN0Jyxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdGZyb21cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGxldCBwYXJ0SUQgPSBpdGVtLnBhcnRJRC5odG1sXG5cdFx0bGV0IGlzSHRtbCA9IHRydWVcblx0XHRpZiAocGFydElEID09IGZhbHNlKSB7XG5cdFx0XHRwYXJ0SUQgPSBpdGVtLnBhcnRJRC50ZXh0XG5cdFx0XHRpc0h0bWwgPSBmYWxzZVxuXHRcdH1cblx0XHRjb25zb2xlLmxvZygnaXNIdG1sJywgaXNIdG1sKVxuXG5cblx0XHRzcnZNYWlsLm9wZW5NZXNzYWdlKGN1cnJlbnRBY2NvdW50LCBtYWlsYm94TmFtZSwgaXRlbS5zZXFubywgcGFydElEKS50aGVuKChtZXNzYWdlKSA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZygnbWVzc2FnZScsIG1lc3NhZ2UpXG5cblxuXHRcdFx0Y29uc3Qge3RleHQsIGF0dGFjaG1lbnRzLCBlbWJlZGRlZEltYWdlc30gPSBtZXNzYWdlXG5cblx0XHRcdGF0dGFjaG1lbnRzLmZvckVhY2goKGEpID0+IHtcblx0XHRcdFx0YS5jYW5PcGVuID0gJCQudXRpbC5nZXRGaWxlVHlwZShhLm5hbWUpICE9IHVuZGVmaW5lZCAmJiBhLmVuY29kaW5nLnRvVXBwZXJDYXNlKCkgPT0gJ0JBU0U2NCdcblxuXHRcdFx0fSlcblxuXG5cdFx0XHRjdHJsLnNldERhdGEoe3RleHQsIGF0dGFjaG1lbnRzLCBlbWJlZGRlZEltYWdlcywgbG9hZGluZzpmYWxzZSwgaXNIdG1sfSlcblxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiByZXBseU1lc3NhZ2UodGV4dCwgdG8pIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ3JlcGx5TWVzc2FnZScsIHRleHQpXG5cdFx0XHRwYWdlci5wdXNoUGFnZSgnd3JpdGVNYWlsUGFnZScsIHtcblx0XHRcdFx0dGl0bGU6ICdSZXBseSBtZXNzYWdlJyxcblx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRhY2NvdW50TmFtZTogY3VycmVudEFjY291bnQsXG5cdFx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdFx0dG8sXG5cdFx0XHRcdFx0XHRzdWJqZWN0OiAnUmU6ICcgKyBpdGVtLnN1YmplY3QsXG5cdFx0XHRcdFx0XHRodG1sOiBgPHByZT4ke3RleHR9PC9wcmU+YFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSlcdFx0XHRcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBmb3J3YXJkTWVzc2FnZSh0ZXh0KSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdyZXBseU1lc3NhZ2UnLCB0ZXh0KVxuXHRcdFx0cGFnZXIucHVzaFBhZ2UoJ3dyaXRlTWFpbFBhZ2UnLCB7XG5cdFx0XHRcdHRpdGxlOiAnRm9yd2FyZCBtZXNzYWdlJyxcblx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRhY2NvdW50TmFtZTogY3VycmVudEFjY291bnQsXG5cdFx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdFx0c3ViamVjdDogJ0Z3ZDogJyArIGl0ZW0uc3ViamVjdCxcblx0XHRcdFx0XHRcdGh0bWw6IGA8cHJlPiR7dGV4dH08L3ByZT5gXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KVx0XHRcdFxuXHRcdH1cblxuXHRcdHRoaXMub25BY3Rpb24gPSBmdW5jdGlvbihhY3Rpb24pIHtcblx0XHRcdGNvbnNvbGUubG9nKCdvbkFjdGlvbicsIGFjdGlvbiwgaXRlbSlcblxuXHRcdFx0aWYgKGFjdGlvbiA9PSAncmVwbHknIHx8IGFjdGlvbiA9PSAncmVwbHlBbGwnKSB7XG5cblx0XHRcdFx0Y29uc3QgSEVBREVSID0gJ1xcblxcbi0tLS0tIE9yaWdpbmFsIG1haWwgLS0tLS1cXG4nXG5cblx0XHRcdFx0bGV0IHRvID0gaXRlbS5mcm9tLmVtYWlsXG5cblx0XHRcdFx0aWYgKGFjdGlvbiA9PSAncmVwbHlBbGwnICYmIGl0ZW0udG8ubGVuZ3RoID4gMCkge1x0XHRcdFx0XHRcblx0XHRcdFx0XHR0byArPSAnLCcgKyBpdGVtLnRvLm1hcCgoYSkgPT4gYS5lbWFpbCkuam9pbignLCcpXG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoY3RybC5tb2RlbC5pc0h0bWwgJiYgaXRlbS5wYXJ0SUQudGV4dCAhPSBmYWxzZSkge1xuXHRcdFx0XHRcdHNydk1haWwub3Blbk1lc3NhZ2UoY3VycmVudEFjY291bnQsIG1haWxib3hOYW1lLCBpdGVtLnNlcW5vLCBpdGVtLnBhcnRJRC50ZXh0KS50aGVuKChtZXNzYWdlKSA9PiB7XG5cdFx0XHRcdFx0XHRyZXBseU1lc3NhZ2UoSEVBREVSICsgbWVzc2FnZS50ZXh0LCB0bylcblx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcdFxuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZWxzZSBpZiAoIWN0cmwubW9kZWwuaXNIdG1sKSB7XG5cdFx0XHRcdFx0cmVwbHlNZXNzYWdlKEhFQURFUiArIGN0cmwubW9kZWwudGV4dCwgdG8pXG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0cmVwbHlNZXNzYWdlKCcnLCB0bylcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoYWN0aW9uID09ICdmb3J3YXJkJykge1xuXHRcdFx0XHRjb25zdCBIRUFERVIgPSAnXFxuXFxuLS0tLS0gRm9yd2FyZGVkIG1haWwgLS0tLS1cXG4nXG5cblxuXHRcdFx0XHRpZiAoY3RybC5tb2RlbC5pc0h0bWwgJiYgaXRlbS5wYXJ0SUQudGV4dCAhPSBmYWxzZSkge1xuXHRcdFx0XHRcdHNydk1haWwub3Blbk1lc3NhZ2UoY3VycmVudEFjY291bnQsIG1haWxib3hOYW1lLCBpdGVtLnNlcW5vLCBpdGVtLnBhcnRJRC50ZXh0KS50aGVuKChtZXNzYWdlKSA9PiB7XG5cdFx0XHRcdFx0XHRmb3J3YXJkTWVzc2FnZShIRUFERVIgKyBtZXNzYWdlLnRleHQpXG5cdFx0XHRcdFx0fSlcdFx0XHRcdFx0XHRcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGVsc2UgaWYgKCFjdHJsLm1vZGVsLmlzSHRtbCkge1xuXHRcdFx0XHRcdGZvcndhcmRNZXNzYWdlKEhFQURFUiArIGN0cmwubW9kZWwudGV4dClcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRmb3J3YXJkTWVzc2FnZSgnJylcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fVxuXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnd3JpdGVNYWlsUGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblNlbmRcXFwiIGJuLWZvcm09XFxcImRhdGFcXFwiPlxcblx0PGRpdiBjbGFzcz1cXFwiaGVhZGVyXFxcIj5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdDxkaXYgY2xhc3M9XFxcIm9wZW5Db250YWN0UGFuZWxcXFwiPlxcblx0XHRcdFx0PGEgYm4tZXZlbnQ9XFxcImNsaWNrOiBvcGVuQ29udGFjdFxcXCIgaHJlZj1cXFwiI1xcXCIgY2xhc3M9XFxcInczLXRleHQtaW5kaWdvXFxcIj5Ubzo8L2E+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdFx0PGlucHV0IHR5cGU9XFxcImVtYWlsXFxcIiBtdWx0aXBsZT1cXFwidHJ1ZVxcXCIgbmFtZT1cXFwidG9cXFwiIGJuLXByb3A9XFxcInByb3AxXFxcIiByZXF1aXJlZD1cXFwiXFxcIiBibi1iaW5kPVxcXCJ0b1xcXCI+XHRcdFxcblx0XHQ8L2Rpdj5cXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdDxsYWJlbD5TdWJqZWN0OjwvbGFiZWw+XFxuXHRcdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcInN1YmplY3RcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlx0XHRcXG5cdFx0PC9kaXY+XHRcXG5cXG5cdFx0PGRpdiBibi1zaG93PVxcXCJzaG93MVxcXCIgY2xhc3M9XFxcImF0dGFjaG1lbnRzXFxcIj5cXG5cdFx0XHQ8bGFiZWw+PGkgY2xhc3M9XFxcImZhIGZhLXBhcGVyY2xpcFxcXCI+PC9pPjwvbGFiZWw+XHRcdFx0XFxuXHRcdFx0PHVsIGJuLWVhY2g9XFxcImF0dGFjaG1lbnRzXFxcIiBibi1ldmVudD1cXFwiY2xpY2suZGVsZXRlOiBvblJlbW92ZUF0dGFjaG1lbnRcXFwiPlxcblx0XHRcdFx0PGxpPlxcblx0XHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCIkc2NvcGUuJGkuZmlsZU5hbWVcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXRpbWVzIGRlbGV0ZVxcXCI+PC9pPlxcblx0XHRcdFx0PC9saT5cXG5cdFx0XHQ8L3VsPlxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2Plxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmh0bWxlZGl0b3JcXFwiIGNsYXNzPVxcXCJjb250ZW50XFxcIiBuYW1lPVxcXCJodG1sXFxcIiBibi1pZmFjZT1cXFwiY29udGVudFxcXCI+PC9kaXY+XFxuPCEtLSBcdDx0ZXh0YXJlYSBuYW1lPVxcXCJ0ZXh0XFxcIiBibi1iaW5kPVxcXCJjb250ZW50XFxcIj48L3RleHRhcmVhPlx0XFxuIC0tPlx0PGlucHV0IHR5cGU9XFxcInN1Ym1pdFxcXCIgaGlkZGVuPVxcXCJcXFwiIGJuLWJpbmQ9XFxcInN1Ym1pdFxcXCI+XFxuPC9mb3JtPlxcblwiLFxuXG5cdGRlcHM6IFsnYXBwLm1haWxzJywgJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0cHJvcHM6IHtcblx0XHRhY2NvdW50TmFtZTogJycsXG5cdFx0ZGF0YToge31cblx0fSxcblxuXHRidXR0b25zOiB7XG5cdFx0YXR0YWNobWVudDoge2ljb246ICdmYSBmYS1wYXBlcmNsaXAnLCB0aXRsZTogJ0FkZCBhdHRhY2htZW50J30sXG5cdFx0c2VuZDoge2ljb246ICdmYSBmYS1wYXBlci1wbGFuZScsIHRpdGxlOiAnU2VuZCBNZXNzYWdlJ31cblx0fSxcdFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgc3J2TWFpbCwgcGFnZXIpIHtcblxuXHRcdGNvbnN0IHthY2NvdW50TmFtZSwgZGF0YX0gPSB0aGlzLnByb3BzXG5cdFx0Y29uc29sZS5sb2coJ2RhdGEnLCBkYXRhKVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRkYXRhLFxuXHRcdFx0XHRhdHRhY2htZW50czogW10sXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbigpIHtyZXR1cm4gdGhpcy5hdHRhY2htZW50cy5sZW5ndGggPiAwfSxcblx0XHRcdFx0cHJvcDE6IGZ1bmN0aW9uKCkge3JldHVybiB7YXV0b2ZvY3VzOiB0aGlzLmRhdGEuaHRtbCA9PSB1bmRlZmluZWR9fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblNlbmQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uU2VuZCcpXG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdGNvbnN0IGRhdGEgPSAkKHRoaXMpLmdldEZvcm1EYXRhKClcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnZGF0YScsIGRhdGEpXG5cdFx0XHRcdFx0Y29uc3Qge2F0dGFjaG1lbnRzfSA9IGN0cmwubW9kZWxcblx0XHRcdFx0XHRpZiAoYXR0YWNobWVudHMubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdFx0ZGF0YS5hdHRhY2htZW50cyA9IGF0dGFjaG1lbnRzLm1hcCgoYSkgPT4gYS5yb290RGlyICsgYS5maWxlTmFtZSlcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzcnZNYWlsLnNlbmRNYWlsKGFjY291bnROYW1lLCBkYXRhKVxuXHRcdFx0XHRcdC50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LmNhdGNoKChlKSA9PiB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnRXJyb3InLCBjb250ZW50OiBlLnJlc3BvbnNlVGV4dH0pXG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvcGVuQ29udGFjdDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29wZW5Db250YWN0Jylcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnY29udGFjdHNQYWdlJywge1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdTZWxlY3QgYSBjb250YWN0Jyxcblx0XHRcdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbihmcmllbmRzKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IGNvbnRhY3RzID0gZnJpZW5kcy5tYXAoKGEpID0+IGEuY29udGFjdEVtYWlsKVxuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnY29udGFjdHMnLCBjb250YWN0cylcblx0XHRcdFx0XHRcdFx0Y29uc3QgdG8gPSBjdHJsLnNjb3BlLnRvLnZhbCgpXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCd0bycsIHRvKVxuXG5cdFx0XHRcdFx0XHRcdGlmICh0byAhPSAnJykge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnRhY3RzLnVuc2hpZnQodG8pXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtkYXRhOiB7dG86IGNvbnRhY3RzLmpvaW4oJywnKX19KVx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fSxcblx0XHRcdFx0b25SZW1vdmVBdHRhY2htZW50OiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnbGknKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uUmVtb3ZlQXR0YWNobWVudCcsIGlkeClcblx0XHRcdFx0XHRjdHJsLm1vZGVsLmF0dGFjaG1lbnRzLnNwbGljZShpZHgsIDEpXG5cdFx0XHRcdFx0Y3RybC51cGRhdGUoKVxuXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdH0pXG5cblx0XHRpZiAoZGF0YS5odG1sICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0Y3RybC5zY29wZS5jb250ZW50LmZvY3VzKClcblx0XHR9XHRcdFxuXG5cdFx0dGhpcy5vbkFjdGlvbiA9IGZ1bmN0aW9uKGFjdGlvbikge1xuXHRcdFx0Y29uc29sZS5sb2coJ29uQWN0aW9uJywgYWN0aW9uKVxuXHRcdFx0aWYgKGFjdGlvbiA9PSAnc2VuZCcpIHtcblx0XHRcdFx0Y3RybC5zY29wZS5zdWJtaXQuY2xpY2soKVxuXHRcdFx0fVxuXHRcdFx0aWYoIGFjdGlvbiA9PSAnYXR0YWNobWVudCcpIHtcblx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LmZpbGVzJywge1xuXHRcdFx0XHRcdHRpdGxlOiAnU2VsZWN0IGEgZmlsZSB0byBhdHRhY2gnLFxuXHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRzaG93VGh1bWJuYWlsOiB0cnVlXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRldmVudHM6IHtcblx0XHRcdFx0XHRcdGZpbGVjbGljazogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRcdFx0cGFnZXIucG9wUGFnZShkYXRhKVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0b25SZXR1cm46IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHtmaWxlTmFtZSwgcm9vdERpcn0gPSBkYXRhXG5cdFx0XHRcdFx0XHRjdHJsLm1vZGVsLmF0dGFjaG1lbnRzLnB1c2goe2ZpbGVOYW1lLCByb290RGlyfSlcblx0XHRcdFx0XHRcdGN0cmwudXBkYXRlKClcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0fVxuXG5cdH1cbn0pIl19
