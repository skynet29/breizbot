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

	buttons: [
		{name: 'create', icon: 'fa fa-check'}
	],

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

	buttons: [
		{name: 'add', icon: 'fa fa-user-plus'}
	],	

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

	buttons: [
		{name: 'apply', icon: 'fa fa-check'}
	],
	
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

	buttons: [
		{name: 'ok', icon: 'fa fa-check'}
	],
	
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

	buttons: [
		{name: 'reload', icon: 'fa fa-sync-alt', title: 'Update'},
		{name: 'newMail', icon: 'fa fa-envelope', title: 'New Message'},
		{name: 'move', icon: 'fa fa-file-export', title: 'Move selected messages'},
		{name: 'delete', icon: 'fa fa-trash', title: 'Delete selected messages'}
	
	],	

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

	deps: ['app.mails', 'breizbot.users', 'breizbot.scheduler', 'breizbot.pager'],

	props: {
		currentAccount: '',
		mailboxName: '',
		item: null
	},

	buttons: [
		{name: 'reply', icon: 'fa fa-reply', title: 'Reply'},
		{name: 'replyAll', icon: 'fa fa-reply-all', title: 'Reply All'},
		{name: 'forward', icon: 'fa fa-share-square', title: 'Forward'}
	],	

	init: function(elt, srvMail, users, scheduler, pager) {

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

					console.log('openAttachments', info)

					if (info.canOpen) {
						const props = {
							info,
							currentAccount,
							mailboxName,
							seqno: item.seqno
						}
						pager.pushPage('viewerPage', {
							title: info.name,
							props
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
								const {partID, type, subtype} = info
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





$$.control.registerControl('viewerPage', {

	template: "<div style=\"height: 100%; position: relative; text-align: center;\">\n	<span bn-show=\"wait\" class=\"w3-text-blue\" style=\"position: relative; top: 50%;\"><i class=\"fa fa-redo-alt fa-2x fa-pulse\"></i></span>\n\n	<div \n		bn-show=\"!wait\"\n		bn-control=\"breizbot.viewer\" \n		bn-data=\"{type, url}\" \n		style=\"height: 100%\" \n		bn-iface=\"viewer\">\n			\n		</div>	\n\n</div>	",

	deps: ['app.mails', 'breizbot.pager'],

	props: {
		info: '',
		currentAccount: '',
		mailboxName: '',
		seqno: ''
	},

	buttons: [
		{name: 'save', icon: 'fa fa-save'}
	],	

	init: function(elt, srvMail, pager) {

		const {info, currentAccount, mailboxName, seqno} = this.props
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
				ctrl.scope.viewer.save('/apps/email', info.name, () => {
					pager.popPage()
				})
			}
		}
	}


});












$$.control.registerControl('writeMailPage', {

	template: "<form bn-event=\"submit: onSend\" bn-form=\"data\">\n	<div class=\"header\">\n		<div bn-control=\"brainjs.inputgroup\">\n			<div class=\"openContactPanel\">\n				<a bn-event=\"click: openContact\" href=\"#\" class=\"w3-text-indigo\">To:</a>\n			</div>\n			<input type=\"email\" multiple=\"true\" name=\"to\" bn-prop=\"prop1\" required=\"\" bn-bind=\"to\">		\n		</div>\n\n		<div bn-control=\"brainjs.inputgroup\">\n			<label>Subject:</label>\n			<input type=\"text\" name=\"subject\" required=\"\">		\n		</div>	\n\n		<div bn-show=\"show1\" class=\"attachments\">\n			<label><i class=\"fa fa-paperclip\"></i></label>			\n			<ul bn-each=\"attachments\" bn-event=\"click.delete: onRemoveAttachment\">\n				<li>\n					<span bn-text=\"$i.fileName\"></span>\n					<i class=\"fa fa-times delete\"></i>\n				</li>\n			</ul>\n		</div>\n	</div>\n	<div bn-control=\"brainjs.htmleditor\" class=\"content\" name=\"html\" bn-iface=\"content\"></div>\n<!-- 	<textarea name=\"text\" bn-bind=\"content\"></textarea>	\n -->	<input type=\"submit\" hidden=\"\" bn-bind=\"submit\">\n</form>\n",

	deps: ['app.mails', 'breizbot.pager'],

	props: {
		accountName: '',
		data: {}
	},

	buttons: [
		{name: 'attachment', icon: 'fa fa-paperclip', title: 'Add attachment'},
		{name: 'send', icon: 'fa fa-paper-plane', title: 'Send Message'}
	],	

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJzZXJ2aWNlcy9tYWlscy5qcyIsInBhZ2VzL2FjY291bnQvYWNjb3VudC5qcyIsInBhZ2VzL2FkZENvbnRhY3QvYWRkQ29udGFjdC5qcyIsInBhZ2VzL2JveGVzL2JveGVzLmpzIiwicGFnZXMvY29udGFjdHMvY29udGFjdHMuanMiLCJwYWdlcy9tYWlsYm94L21haWxib3guanMiLCJwYWdlcy9tZXNzYWdlL21lc3NhZ2UuanMiLCJwYWdlcy92aWV3ZXIvdmlld2VyLmpzIiwicGFnZXMvd3JpdGVNYWlsL3dyaXRlTWFpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNVJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3Jvb3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgY2xhc3M9XFxcInRvb2xiYXJcXFwiPlxcblx0PGRpdiBjbGFzcz1cXFwiaW5mb1xcXCI+XFxuXHRcdDxzcGFuIGJuLXNob3c9XFxcInNob3cxXFxcIj5Zb3UgaGF2ZSBubyBlbWFpbCBhY2NvdW50PC9zcGFuPlxcblx0XHQ8ZGl2IGJuLXNob3c9XFxcInNob3cyXFxcIiBjbGFzcz1cXFwiYWNjb3VudFxcXCI+XFxuXHRcdFx0PHNwYW4+QWNjb3VudDombmJzcDs8L3NwYW4+IFxcblx0XHRcdDxkaXYgXFxuXHRcdFx0XHRibi1jb250cm9sPVxcXCJicmFpbmpzLnNlbGVjdG1lbnVcXFwiIFxcblx0XHRcdFx0Ym4tZGF0YT1cXFwie2l0ZW1zOiBhY2NvdW50c31cXFwiIFxcblx0XHRcdFx0Ym4tdmFsPVxcXCJjdXJyZW50QWNjb3VudFxcXCJcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJzZWxlY3RtZW51Y2hhbmdlOiBvbkFjY291bnRDaGFuZ2VcXFwiPlxcblx0XHRcdDwvZGl2Plxcblx0XHQ8L2Rpdj5cXG5cdFx0XFxuXHQ8L2Rpdj5cXG5cdDxkaXY+XFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5jb250ZXh0bWVudVxcXCIgXFxuXHRcdFx0Ym4tZGF0YT1cXFwie2l0ZW1zOiBnZXRJdGVtc31cXFwiIFxcblx0XHRcdGRhdGEtdHJpZ2dlcj1cXFwibGVmdFxcXCIgXFxuXHRcdFx0Y2xhc3M9XFxcInczLWJ1dHRvbiB3My1ibHVlXFxcIiBcXG5cdFx0XHRibi1ldmVudD1cXFwiY29udGV4dG1lbnVjaGFuZ2U6IG9uTWVudVxcXCJcXG5cdFx0XHQ+XFxuXHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtZWxsaXBzaXMtdlxcXCI+PC9pPlxcbiAgICBcdFxcblx0XHQ8L2Rpdj5cdFx0XFxuXHRcdFxcblx0PC9kaXY+XFxuXHRcXG48L2Rpdj5cXG5cXG48ZGl2Plxcblx0U2VsZWN0IGZvbGRlciB0byBvcGVuOlxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsVHJlZVxcXCI+XFxuXHQ8ZGl2IFxcblx0XHRjbGFzcz1cXFwidHJlZVxcXCIgXFxuXHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMudHJlZVxcXCJcXG5cdFx0Ym4tZGF0YT1cXFwie3NvdXJjZTogbWFpbGJveGVzfVxcXCJcXG5cdFx0Ym4tZXZlbnQ9XFxcInRyZWVhY3RpdmF0ZTogb25UcmVlQWN0aXZhdGVcXFwiXFxuXHRcdGJuLWlmYWNlPVxcXCJ0cmVlXFxcIlxcblx0PjwvZGl2PlxcbjwvZGl2PlxcblxcblxcblwiLFxuXG5cdGRlcHM6IFsnYXBwLm1haWxzJywgJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydk1haWwsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGFjY291bnRzOiBbXSxcblx0XHRcdFx0Y3VycmVudEFjY291bnQ6ICcnLFxuXHRcdFx0XHRtYWlsYm94ZXM6IFtdLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuYWNjb3VudHMubGVuZ3RoID09IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLmFjY291bnRzLmxlbmd0aCA+IDBcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0SXRlbXM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGlmICh0aGlzLmFjY291bnRzLmxlbmd0aCA9PSAwKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0XHRhZGQ6IHtuYW1lOiAnQWRkIEFjY291bnQnLCBpY29uOiAnZmFzIGZhLXBsdXMnfSxcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdGFkZDoge25hbWU6ICdBZGQgQWNjb3VudCcsIGljb246ICdmYXMgZmEtcGx1cyd9LFxuXHRcdFx0XHRcdFx0ZWRpdDoge25hbWU6ICdFZGl0IFNlbGVjdGVkIEFjY291bnQnLCBpY29uOiAnZmFzIGZhLWVkaXQnfSxcblx0XHRcdFx0XHRcdHNlcDI6ICctLS0tLS0nLFxuXHRcdFx0XHRcdFx0bmV3Rm9sZGVyOiB7bmFtZTogJ05ldyBGb2xkZXInLCBpY29uOiAnZmFzIGZhLWZvbGRlci1wbHVzJ30sXG5cdFx0XHRcdFx0XHRzZXA6ICctLS0tLS0nLFxuXHRcdFx0XHRcdFx0bmV3OiB7bmFtZTogJ05ldyBNZXNzYWdlJywgaWNvbjogJ2ZhcyBmYS1lbnZlbG9wZSd9XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbk1lbnU6IGZ1bmN0aW9uKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uTWVudScsIGRhdGEpXG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdhZGQnKSB7XG5cdFx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYWNjb3VudFBhZ2UnLCB7XG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnQWRkIE1haWwgQWNjb3VudCcsXG5cdFx0XHRcdFx0XHRcdG9uUmV0dXJuOiBsb2FkQWNjb3VudFxuXHRcdFx0XHRcdFx0fSlcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICduZXcnKSB7XG5cdFx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnd3JpdGVNYWlsUGFnZScsIHtcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdOZXcgTWVzc2FnZScsXG5cdFx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdFx0YWNjb3VudE5hbWU6IGN0cmwubW9kZWwuY3VycmVudEFjY291bnRcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSlcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICdlZGl0Jykge1xuXHRcdFx0XHRcdFx0c3J2TWFpbC5nZXRNYWlsQWNjb3VudChjdHJsLm1vZGVsLmN1cnJlbnRBY2NvdW50KS50aGVuKChkYXRhKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdhY2NvdW50UGFnZScsIHtcblx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0VkaXQgTWFpbCBBY2NvdW50Jyxcblx0XHRcdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YVxuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSlcdFx0XHRcdFx0XHRcblxuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGRhdGEuY21kID09ICduZXdGb2xkZXInKSB7XG5cdFx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYm94ZXNQYWdlJywge1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ0FkZCBuZXcgZm9sZGVyJyxcblx0XHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0XHRjdXJyZW50QWNjb3VudDogY3RybC5tb2RlbC5jdXJyZW50QWNjb3VudCxcblx0XHRcdFx0XHRcdFx0XHRzaG93Rm9ybTogdHJ1ZVxuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRvblJldHVybjogZnVuY3Rpb24odGFyZ2V0TmFtZSkge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblJldHVybicsIHRhcmdldE5hbWUpXG5cdFx0XHRcdFx0XHRcdFx0c3J2TWFpbC5hZGRNYWlsYm94KGN0cmwubW9kZWwuY3VycmVudEFjY291bnQsIHRhcmdldE5hbWUpLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0bG9hZE1haWxib3hlcygpXG5cdFx0XHRcdFx0XHRcdFx0fSlcblxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbkFjY291bnRDaGFuZ2U6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkFjY291bnRDaGFuZ2UnLCAkKHRoaXMpLmdldFZhbHVlKCkpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtjdXJyZW50QWNjb3VudDogJCh0aGlzKS5nZXRWYWx1ZSgpfSlcblx0XHRcdFx0XHRsb2FkTWFpbGJveGVzKClcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvblRyZWVBY3RpdmF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uVHJlZUFjdGl2YXRlJylcblx0XHRcdFx0XHRjb25zdCB0cmVlID0gJCh0aGlzKS5pZmFjZSgpXG5cblx0XHRcdFx0XHRjb25zdCBub2RlID0gIHRyZWUuZ2V0QWN0aXZlTm9kZSgpXG5cblx0XHRcdFx0XHRjb25zdCBtYWlsYm94TmFtZSA9IHRyZWUuZ2V0Tm9kZVBhdGgobm9kZSlcdFx0XHRcdFx0XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ21haWxib3hOYW1lJywgbWFpbGJveE5hbWUpXG5cdFx0XHRcdFx0Y29uc3Qge2N1cnJlbnRBY2NvdW50fSA9IGN0cmwubW9kZWxcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnbWFpbGJveFBhZ2UnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogbm9kZS50aXRsZSxcblx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdGN1cnJlbnRBY2NvdW50LFxuXHRcdFx0XHRcdFx0XHRtYWlsYm94TmFtZVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdG9uQmFjazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IGFjdGl2ZU5vZGUgPSBjdHJsLnNjb3BlLnRyZWUuZ2V0QWN0aXZlTm9kZSgpXG5cdFx0XHRcdFx0XHRcdGlmIChhY3RpdmVOb2RlICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdFx0XHRhY3RpdmVOb2RlLnNldEFjdGl2ZShmYWxzZSlcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXHRcdH0pXG5cblxuXHRcdGZ1bmN0aW9uIGxvYWRBY2NvdW50KCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2xvYWRBY2NvdW50Jylcblx0XHRcdHNydk1haWwuZ2V0TWFpbEFjY291bnRzKCkudGhlbigoYWNjb3VudHMpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2FjY291bnRzJywgYWNjb3VudHMpXG5cdFx0XHRcdGlmIChhY2NvdW50cy5sZW5ndGggPT0gMCkge1xuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnN0IGN1cnJlbnRBY2NvdW50ID0gYWNjb3VudHNbMF1cblx0XHRcdFx0Y29uc29sZS5sb2coJ2N1cnJlbnRBY2NvdW50JywgY3VycmVudEFjY291bnQpXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7YWNjb3VudHMsIGN1cnJlbnRBY2NvdW50fSlcblx0XHRcdFx0bG9hZE1haWxib3hlcygpXG5cdFx0XHR9KS5jYXRjaCgoZXJyKSA9PiB7XG5cdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdFcnJvcicsIGNvbnRlbnQ6IGVycn0pXG5cdFx0XHR9KVx0XHRcdFxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGxvYWRNYWlsYm94ZXMoKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnbG9hZE1haWxib3hlcycpXG5cdFx0XHRjb25zdCB7Y3VycmVudEFjY291bnR9ID0gY3RybC5tb2RlbFxuXHRcdFx0c3J2TWFpbC5nZXRNYWlsYm94ZXMoY3VycmVudEFjY291bnQpLnRoZW4oKG1haWxib3hlcykgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnbWFpbGJveGVzJywgbWFpbGJveGVzKVxuXG5cdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0bWFpbGJveGVzXG5cdFx0XHRcdH0pXG5cdFx0XHR9KVxuXHRcdH1cblxuXHRcdGxvYWRBY2NvdW50KClcblxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIiQkLnNlcnZpY2UucmVnaXN0ZXJTZXJ2aWNlKCdhcHAubWFpbHMnLCB7XG5cblx0ZGVwczogWydicmVpemJvdC5odHRwJ10sXG5cblx0aW5pdDogZnVuY3Rpb24oY29uZmlnLCBodHRwKSB7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0Z2V0TWFpbEFjY291bnRzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAuZ2V0KCcvZ2V0TWFpbEFjY291bnRzJylcblx0XHRcdH0sXG5cblx0XHRcdGdldE1haWxBY2NvdW50OiBmdW5jdGlvbihuYW1lKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9nZXRNYWlsQWNjb3VudCcsIHtuYW1lfSlcblx0XHRcdH0sXG5cblx0XHRcdGNyZWF0ZU1haWxBY2NvdW50OiBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy9jcmVhdGVNYWlsQWNjb3VudCcsIGRhdGEpXG5cdFx0XHR9LFxuXG5cdFx0XHR1cGRhdGVNYWlsQWNjb3VudDogZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KCcvdXBkYXRlTWFpbEFjY291bnQnLCBkYXRhKVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0TWFpbGJveGVzOiBmdW5jdGlvbihuYW1lKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9nZXRNYWlsYm94ZXNgLCB7bmFtZX0pXG5cdFx0XHR9LFxuXG5cdFx0XHRhZGRNYWlsYm94OiBmdW5jdGlvbihuYW1lLCBtYWlsYm94TmFtZSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvYWRkTWFpbGJveGAsIHtuYW1lLCBtYWlsYm94TmFtZX0pXG5cdFx0XHR9LFxuXG5cdFx0XHRvcGVuTWFpbGJveDogZnVuY3Rpb24obmFtZSwgbWFpbGJveE5hbWUsIHBhZ2VObykge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvb3Blbk1haWxib3hgLCB7bmFtZSwgbWFpbGJveE5hbWUsIHBhZ2VOb30pXG5cdFx0XHR9LFxuXG5cdFx0XHRvcGVuTWVzc2FnZTogZnVuY3Rpb24obmFtZSwgbWFpbGJveE5hbWUsIHNlcU5vLCBwYXJ0SUQpXHR7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9vcGVuTWVzc2FnZWAsIHtuYW1lLCBtYWlsYm94TmFtZSwgc2VxTm8sIHBhcnRJRH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRvcGVuQXR0YWNobWVudDogZnVuY3Rpb24obmFtZSwgbWFpbGJveE5hbWUsIHNlcU5vLCBwYXJ0SUQpXHR7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9vcGVuQXR0YWNobWVudGAsIHtuYW1lLCBtYWlsYm94TmFtZSwgc2VxTm8sIHBhcnRJRH0pXG5cdFx0XHR9LFxuXG5cdFx0XHRkZWxldGVNZXNzYWdlOiBmdW5jdGlvbihuYW1lLCBtYWlsYm94TmFtZSwgc2VxTm9zKVx0e1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvZGVsZXRlTWVzc2FnZWAsIHtuYW1lLCBtYWlsYm94TmFtZSwgc2VxTm9zfSlcblx0XHRcdH0sXHRcblxuXHRcdFx0bW92ZU1lc3NhZ2U6IGZ1bmN0aW9uKG5hbWUsIG1haWxib3hOYW1lLCB0YXJnZXROYW1lLCBzZXFOb3MpXHR7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9tb3ZlTWVzc2FnZWAsIHtuYW1lLCBtYWlsYm94TmFtZSwgdGFyZ2V0TmFtZSwgc2VxTm9zfSlcblx0XHRcdH0sXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XG5cblx0XHRcdHNlbmRNYWlsOiBmdW5jdGlvbihhY2NvdW50TmFtZSwgZGF0YSkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5wb3N0KGAvc2VuZE1haWxgLCB7YWNjb3VudE5hbWUsIGRhdGF9KVxuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHQkaWZhY2U6IGBcblx0XHRnZXRNYWlsQWNjb3VudCgpOlByb21pc2U7XG5cdFx0Y3JlYXRlTWFpQWNjb3VudChkYXRhKTpQcm9taXNlO1xuXHRcdGdldE1haWxib3hlcyhuYW1lKTpQcm9taXNlO1xuXHRcdG9wZW5NYWlsYm94KG5hbWUsIG1haWxib3hOYW1lLCBwYWdlTm8pOlByb21pc2U7XG5cdFx0b3Blbk1lc3NhZ2UobmFtZSwgbWFpbGJveE5hbWUsIHNlcU5vLCBwYXJ0SUQpOlByb21pc2U7XG5cdFx0b3BlbkF0dGFjaG1lbnQobmFtZSwgbWFpbGJveE5hbWUsIHNlcU5vLCBwYXJ0SUQpOlByb21pc2U7XG5cdFx0ZGVsZXRlTWVzc2FnZShuYW1lLCBtYWlsYm94TmFtZSwgc2VxTm9zKTpQcm9taXNlO1xuXHRcdG1vdmVNZXNzYWdlKG5hbWUsIG1haWxib3hOYW1lLCB0YXJnZXROYW1lLCBzZXFOb3MpOlByb21pc2Vcblx0XHRgXG59KTtcbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdhY2NvdW50UGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJtYWluXFxcIj5cXG5cdDxmb3JtIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU3VibWl0XFxcIiBibi1iaW5kPVxcXCJmb3JtXFxcIiBibi1mb3JtPVxcXCJkYXRhXFxcIj5cXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdDxsYWJlbD5Qcm92aWRlcjwvbGFiZWw+XFxuXHRcdFx0PHNwYW4gYm4tY29udHJvbD1cXFwiYnJhaW5qcy5zZWxlY3RtZW51XFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJzZWxlY3RtZW51Y2hhbmdlOiBvblByb3ZpZGVyQ2hhbmdlXFxcIiBibi12YWw9XFxcInByb3ZpZGVyXFxcIlxcblx0XHRcdFx0Ym4tZGF0YT1cXFwie2l0ZW1zOiBwcm92aWRlcnN9XFxcIlxcblx0XHRcdFx0Ym4tcHJvcD1cXFwie2Rpc2FibGVkOiBpc0VkaXR9XFxcIlxcblx0XHRcdD5cXG5cdFx0XHQ8L3NwYW4+XHRcdFxcblx0XHQ8L2Rpdj5cdFx0XHRcXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdDxsYWJlbD5BY2NvdW50IE5hbWU8L2xhYmVsPlxcblx0XHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJuYW1lXFxcIiByZXF1aXJlZD1cXFwiXFxcIiBhdXRvZm9jdXM9XFxcIlxcXCIgYm4tcHJvcD1cXFwie2Rpc2FibGVkOiBpc0VkaXR9XFxcIj5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHQ8bGFiZWw+VXNlcjwvbGFiZWw+XFxuXHRcdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcInVzZXJcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdDxsYWJlbD5QYXNzd29yZDwvbGFiZWw+XFxuXHRcdFx0PGlucHV0IHR5cGU9XFxcInBhc3N3b3JkXFxcIiBuYW1lPVxcXCJwd2RcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdDxsYWJlbD5FbWFpbDwvbGFiZWw+XFxuXHRcdFx0PGlucHV0IHR5cGU9XFxcImVtYWlsXFxcIiBuYW1lPVxcXCJlbWFpbFxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XHRcdFx0XFxuXHRcdDwvZGl2Plxcblxcblx0XFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIiBibi1zaG93PVxcXCJzaG93MVxcXCI+XFxuXHRcdFx0PGxhYmVsPklNQVAgU2VydmVyPC9sYWJlbD5cXG5cdFx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwiaW1hcEhvc3RcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlx0XHRcdFxcblx0XHQ8L2Rpdj5cdFx0XFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIiAgYm4tc2hvdz1cXFwic2hvdzFcXFwiPlxcblx0XHRcdDxsYWJlbD5TTVRQIFNlcnZlcjwvbGFiZWw+XFxuXHRcdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcInNtdHBIb3N0XFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cdFx0XHRcXG5cdFx0PC9kaXY+XHRcdFxcblxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJjb3B5U2VudFxcXCI+XFxuXHRcdFx0PGxhYmVsPk1ha2UgYSBjb3B5IG9mIHNlbnQgbWFpbCBpbiBTZW50IGZvbGRlcjwvbGFiZWw+XFxuXHRcdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmZsaXBzd2l0Y2hcXFwiIGJuLWRhdGE9XFxcImRhdGExXFxcIiBuYW1lPVxcXCJtYWtlQ29weVxcXCI+PC9kaXY+XFxuXHRcdDwvZGl2Plxcblxcblx0XHQ8aW5wdXQgdHlwZT1cXFwic3VibWl0XFxcIiBoaWRkZW49XFxcIlxcXCIgYm4tYmluZD1cXFwic3VibWl0XFxcIj5cXG5cdDwvZm9ybT5cXG5cXG48L2Rpdj5cIixcblxuXHRkZXBzOiBbJ2FwcC5tYWlscycsICdicmVpemJvdC5wYWdlciddLFxuXG5cdHByb3BzOiB7XG5cdFx0ZGF0YTogbnVsbFxuXHR9LFxuXG5cdGJ1dHRvbnM6IFtcblx0XHR7bmFtZTogJ2NyZWF0ZScsIGljb246ICdmYSBmYS1jaGVjayd9XG5cdF0sXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBzcnZNYWlsLCBwYWdlcikge1xuXG5cdFx0Y29uc3Qge2RhdGF9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgbWFwID0ge1xuXHRcdFx0J0dtYWlsJzoge1xuXHRcdFx0XHRpbWFwSG9zdDogJ2ltYXAuZ21haWwuY29tJyxcblx0XHRcdFx0c210cEhvc3Q6ICdzbXRwLmdtYWlsLmNvbSdcblx0XHRcdH0sXG5cdFx0XHQnT3V0bG9vayc6IHtcblx0XHRcdFx0aW1hcEhvc3Q6ICdpbWFwLm91dGxvb2suY29tJyxcblx0XHRcdFx0c210cEhvc3Q6ICdzbXRwLm91dGxvb2suY29tJ1xuXHRcdFx0fSxcblx0XHRcdCdGcmVlJzoge1xuXHRcdFx0XHRpbWFwSG9zdDogJ2ltYXAuZnJlZS5mcicsXG5cdFx0XHRcdHNtdHBIb3N0OiAnc210cC5mcmVlLmZyJ1xuXHRcdFx0fSxcblx0XHRcdCdTRlInOiB7XG5cdFx0XHRcdGltYXBIb3N0OiAnaW1hcC5zZnIuZnInLFxuXHRcdFx0XHRzbXRwSG9zdDogJ3NtdHAuc2ZyLmZyJ1xuXHRcdFx0fSxcblx0XHRcdCdPcmFuZ2UnOiB7XG5cdFx0XHRcdGltYXBIb3N0OiAnaW1hcC5vcmFuZ2UuZnInLFxuXHRcdFx0XHRzbXRwSG9zdDogJ3NtdHAub3JhbmdlLmZyJ1xuXHRcdFx0fSxcblx0XHRcdCdCb3V5Z3VlcyBUZWxlY29tJzoge1xuXHRcdFx0XHRpbWFwSG9zdDogJ2ltYXAuYmJveC5mcicsXG5cdFx0XHRcdHNtdHBIb3N0OiAnc210cC5iYm94LmZyJ1xuXHRcdFx0fSxcblx0XHRcdCdPdGhlcic6IHtcblx0XHRcdFx0aW1hcEhvc3Q6ICcnLFxuXHRcdFx0XHRzbXRwSG9zdDogJydcblx0XHRcdH0sXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0UHJvdmlkZXIoaW5mbykge1xuXHRcdFx0Zm9yKGxldCBrIGluIG1hcCkge1xuXHRcdFx0XHRpZiAobWFwW2tdLmltYXBIb3N0ID09IGluZm8uaW1hcEhvc3QpIHtcblx0XHRcdFx0XHRyZXR1cm4ga1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gJ090aGVyJ1xuXHRcdH1cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0cHJvdmlkZXI6IChkYXRhICE9IG51bGwpID8gZ2V0UHJvdmlkZXIoZGF0YSkgOiAnR21haWwnLFxuXHRcdFx0XHRwcm92aWRlcnM6IE9iamVjdC5rZXlzKG1hcCksXG5cdFx0XHRcdGRhdGEsXG5cdFx0XHRcdGlzRWRpdDogZGF0YSAhPSBudWxsLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7cmV0dXJuIHRoaXMucHJvdmlkZXIgPT0gJ090aGVyJ30sXG5cdFx0XHRcdGRhdGExOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4ge2hlaWdodDogMjUsIHdpZHRoOiAxMDAsIHRleHRzOiB7bGVmdDogJ1lFUycsIHJpZ2h0OiAnTk8nfX1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblN1Ym1pdDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRcdFx0Y29uc3QgZm9ybURhdGEgPSAkKHRoaXMpLmdldEZvcm1EYXRhKClcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnZm9ybURhdGEnLCBmb3JtRGF0YSlcblx0XHRcdFx0XHRpZiAoZGF0YSA9PSBudWxsKSB7XG5cdFx0XHRcdFx0XHRzcnZNYWlsLmNyZWF0ZU1haWxBY2NvdW50KGZvcm1EYXRhKS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdFx0cGFnZXIucG9wUGFnZSgpXG5cdFx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdHNydk1haWwudXBkYXRlTWFpbEFjY291bnQoZm9ybURhdGEpLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKClcblx0XHRcdFx0XHRcdH0pXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUHJvdmlkZXJDaGFuZ2U6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IHByb3ZpZGVyID0gJCh0aGlzKS5nZXRWYWx1ZSgpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uUHJvdmlkZXJDaGFuZ2UnLCBwcm92aWRlcilcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe3Byb3ZpZGVyfSlcblxuXHRcdFx0XHRcdGN0cmwuc2NvcGUuZm9ybS5zZXRGb3JtRGF0YShtYXBbcHJvdmlkZXJdKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdGN0cmwuc2NvcGUuZm9ybS5zZXRGb3JtRGF0YShtYXBbY3RybC5tb2RlbC5wcm92aWRlcl0pXG5cblx0XHR0aGlzLm9uQWN0aW9uID0gZnVuY3Rpb24oY21kKSB7XG5cdFx0XHRjdHJsLnNjb3BlLnN1Ym1pdC5jbGljaygpXG5cdFx0fVxuXG5cblxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdhZGRDb250YWN0UGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8Zm9ybSBibi1ldmVudD1cXFwic3VibWl0OiBvblN1Ym1pdFxcXCIgYm4tZm9ybT1cXFwiZnJvbVxcXCI+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdDxsYWJlbD5OYW1lOjwvbGFiZWw+PGJyPlxcblx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwibmFtZVxcXCIgc3R5bGU9XFxcIm1pbi13aWR0aDogMzAwcHhcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlx0XFxuXHQ8L2Rpdj5cXG5cdDxicj5cXG5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0PGxhYmVsPkVtYWlsOjwvbGFiZWw+PGJyPlxcblx0XHQ8aW5wdXQgdHlwZT1cXFwiZW1haWxcXFwiIG5hbWU9XFxcImVtYWlsXFxcIiBzdHlsZT1cXFwibWluLXdpZHRoOiAzMDBweFxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XHRcXG5cdDwvZGl2Plx0XFxuXFxuXHQ8aW5wdXQgdHlwZT1cXFwic3VibWl0XFxcIiBibi1iaW5kPVxcXCJzdWJtaXRcXFwiIGhpZGRlbj1cXFwiXFxcIj5cXG48L2Zvcm0+XFxuXCIsXG5cblx0ZGVwczogWydicmVpemJvdC51c2VycycsICdicmVpemJvdC5wYWdlciddLFxuXG5cdHByb3BzOiB7XG5cdFx0ZnJvbToge31cblx0fSxcblxuXHRidXR0b25zOiBbXG5cdFx0e25hbWU6ICdhZGQnLCBpY29uOiAnZmEgZmEtdXNlci1wbHVzJ31cblx0XSxcdFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgdXNlcnMsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCB7ZnJvbX0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGZyb21cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25TdWJtaXQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdGNvbnN0IGRhdGEgPSAkKHRoaXMpLmdldEZvcm1EYXRhKClcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnZGF0YScsIGRhdGEpXG5cdFx0XHRcdFx0dXNlcnMuYWRkQ29udGFjdChkYXRhLm5hbWUsIGRhdGEuZW1haWwpLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ2NvbnRhY3QgYWRkZWQgIScpXG5cdFx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKCdhZGRDb250YWN0Jylcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5jYXRjaCgoZXJyKSA9PiB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnRXJyb3InLCBjb250ZW50OiBlcnIucmVzcG9uc2VUZXh0fSlcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0dGhpcy5vbkFjdGlvbiA9IGZ1bmN0aW9uKGNtZCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ29uQWN0aW9uJywgY21kKVxuXHRcdFx0Y3RybC5zY29wZS5zdWJtaXQuY2xpY2soKVxuXHRcdH1cblxuXG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnYm94ZXNQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgYm4tc2hvdz1cXFwic2hvd0Zvcm1cXFwiPlxcblx0PGZvcm0gYm4tZXZlbnQ9XFxcInN1Ym1pdDogb25TdWJtaXRcXFwiPlxcblx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdFx0PGxhYmVsPk5hbWU6PC9sYWJlbD5cXG5cdFx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwibmFtZVxcXCIgcmVxdWlyZWQ9XFxcIlxcXCIgYXV0b2ZvY3VzPVxcXCJcXFwiPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cdFx0PGlucHV0IHR5cGU9XFxcInN1Ym1pdFxcXCIgaGlkZGVuPVxcXCJcXFwiIGJuLWJpbmQ9XFxcInN1Ym1pdFxcXCI+XFxuXHQ8L2Zvcm0+XFxuXFxuXHQ8cD5TZWxlY3QgdGFyZ2V0IGZvbGRlcjo8L3A+XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxUcmVlXFxcIj5cXG5cdDxkaXYgXFxuXHRcdGNsYXNzPVxcXCJ0cmVlXFxcIiBcXG5cdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy50cmVlXFxcIlxcblx0XHRibi1kYXRhPVxcXCJ7c291cmNlOiBtYWlsYm94ZXN9XFxcIlxcblx0XHRibi1pZmFjZT1cXFwidHJlZVxcXCJcXG5cdD48L2Rpdj5cXG48L2Rpdj5cXG5cXG5cXG5cIixcblxuXHRkZXBzOiBbJ2FwcC5tYWlscycsICdicmVpemJvdC5wYWdlciddLFxuXG5cdHByb3BzOiB7XG5cdFx0Y3VycmVudEFjY291bnQ6ICcnLFxuXHRcdHNob3dGb3JtOiBmYWxzZVxuXHR9LFxuXG5cdGJ1dHRvbnM6IFtcblx0XHR7bmFtZTogJ2FwcGx5JywgaWNvbjogJ2ZhIGZhLWNoZWNrJ31cblx0XSxcblx0XG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgc3J2TWFpbCwgcGFnZXIpIHtcblxuXHRcdGNvbnN0IHtjdXJyZW50QWNjb3VudCwgc2hvd0Zvcm19ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRtYWlsYm94ZXM6IFtdLFxuXHRcdFx0XHRzaG93Rm9ybVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblN1Ym1pdDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRcdFx0Y29uc3Qge25hbWV9ID0gJCh0aGlzKS5nZXRGb3JtRGF0YSgpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnb25TdWJtaXQnLCBuYW1lKVxuXG5cdFx0XHRcdFx0Y29uc3Qge3RyZWV9ID0gY3RybC5zY29wZVxuXHRcdFx0XHRcdGNvbnN0IG5vZGUgPSB0cmVlLmdldEFjdGl2ZU5vZGUoKVxuXHRcdFx0XHRcdGlmIChub2RlID09IG51bGwpIHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdXYXJuaW5nJywgY29udGVudDogJ1BsZWFzZSBzZWxlY3QgYSB0YXJnZXQgbWFpbGJveCd9KVxuXHRcdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGxldCB0YXJnZXROYW1lID0gdHJlZS5nZXROb2RlUGF0aChub2RlKSArICcvJyArIG5hbWVcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCd0YXJnZXROYW1lJywgdGFyZ2V0TmFtZSlcblx0XHRcdFx0XHRjb25zdCB0b2tlbiA9IHRhcmdldE5hbWUuc3BsaXQoJy8nKVxuXHRcdFx0XHRcdHRva2VuLnNoaWZ0KClcblx0XHRcdFx0XHR0YXJnZXROYW1lID0gdG9rZW4uam9pbignLycpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygndGFyZ2V0TmFtZScsIHRhcmdldE5hbWUpXG5cblxuXHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UodGFyZ2V0TmFtZSlcdFx0XHRcdFx0XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cblx0XHRmdW5jdGlvbiBsb2FkTWFpbGJveGVzKCkge1xuXHRcdFx0Y29uc29sZS5sb2coJ2xvYWRNYWlsYm94ZXMnKVxuXHRcdFx0c3J2TWFpbC5nZXRNYWlsYm94ZXMoY3VycmVudEFjY291bnQpLnRoZW4oKG1haWxib3hlcykgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnbWFpbGJveGVzJywgbWFpbGJveGVzKVxuXHRcdFx0XHRpZiAoc2hvd0Zvcm0pIHtcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdFx0bWFpbGJveGVzOiBbe1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ0ZvbGRlcnMnLFxuXHRcdFx0XHRcdFx0XHRmb2xkZXI6IHRydWUsXG5cdFx0XHRcdFx0XHRcdGNoaWxkcmVuOiBtYWlsYm94ZXMsXG5cdFx0XHRcdFx0XHRcdGV4cGFuZGVkOiB0cnVlXG5cdFx0XHRcdFx0XHR9XVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRcdG1haWxib3hlc1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0bG9hZE1haWxib3hlcygpXG5cblxuXHRcdHRoaXMub25BY3Rpb24gPSBmdW5jdGlvbihhY3Rpb24pIHtcblx0XHRcdGNvbnNvbGUubG9nKCdvbkFjdGlvbicsIGFjdGlvbilcblx0XHRcdGlmIChhY3Rpb24gPT0gJ2FwcGx5Jykge1xuXG5cdFx0XHRcdGlmIChzaG93Rm9ybSkge1xuXHRcdFx0XHRcdGN0cmwuc2NvcGUuc3VibWl0LmNsaWNrKClcblx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnN0IHt0cmVlfSA9IGN0cmwuc2NvcGVcblx0XHRcdFx0Y29uc3Qgbm9kZSA9IHRyZWUuZ2V0QWN0aXZlTm9kZSgpXG5cdFx0XHRcdGlmIChub2RlID09IG51bGwpIHtcblx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnU2VsZWN0IFRhcmdldCBNYWlsYm94JywgY29udGVudDogJ1BsZWFzZSBzZWxlY3QgYSB0YXJnZXQgbWFpbGJveCd9KVxuXHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnN0IHRhcmdldE5hbWUgPSB0cmVlLmdldE5vZGVQYXRoKG5vZGUpXG5cblx0XHRcdFx0cGFnZXIucG9wUGFnZSh0YXJnZXROYW1lKVxuXHRcdFx0fVxuXHRcdH1cblxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdjb250YWN0c1BhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxcXFwiPlxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmVpemJvdC5jb250YWN0c1xcXCIgZGF0YS1zaG93LXNlbGVjdGlvbj1cXFwidHJ1ZVxcXCIgYm4taWZhY2U9XFxcImNvbnRhY3RzXFxcIj48L2Rpdj5cXG5cdFxcbjwvZGl2PlxcblxcblxcblwiLFxuXG5cdGRlcHM6IFsnYnJlaXpib3QucGFnZXInXSxcblxuXHRidXR0b25zOiBbXG5cdFx0e25hbWU6ICdvaycsIGljb246ICdmYSBmYS1jaGVjayd9XG5cdF0sXG5cdFxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0KVxuXG5cblx0XHR0aGlzLm9uQWN0aW9uID0gZnVuY3Rpb24oYWN0aW9uKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnb25BY3Rpb24nLCBhY3Rpb24pXG5cdFx0XHRpZiAoYWN0aW9uID09ICdvaycpIHtcblx0XHRcdFx0cGFnZXIucG9wUGFnZShjdHJsLnNjb3BlLmNvbnRhY3RzLmdldFNlbGVjdGlvbigpKVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnbWFpbGJveFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXHQ8ZGl2Plxcblx0XHQ8ZGl2IGJuLXNob3c9XFxcInNob3cxXFxcIj5cXG5cdFx0XHQ8c3BhbiA+UGFnZTogPHNwYW4gYm4tdGV4dD1cXFwidGV4dDFcXFwiPjwvc3Bhbj48L3NwYW4+XFxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwicHJldmlvdXMgcGFnZVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblByZXZQYWdlXFxcIj5cXG5cdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1hbmdsZS1sZWZ0XFxcIj48L2k+XFxuXHRcdFx0PC9idXR0b24+XHRcdFx0XFxuXHRcdFx0PGJ1dHRvbiBjbGFzcz1cXFwidzMtYnV0dG9uXFxcIiB0aXRsZT1cXFwibmV4dCBwYWdlXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uTmV4dFBhZ2VcXFwiPlxcblx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWFuZ2xlLXJpZ2h0XFxcIj48L2k+XFxuXHRcdFx0PC9idXR0b24+XHRcdFx0XFxuXHRcdDwvZGl2Plxcblx0XHQ8ZGl2IGJuLXNob3c9XFxcImxvYWRpbmdcXFwiIGNsYXNzPVxcXCJsb2FkaW5nXFxcIj5cXG5cdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtc3Bpbm5lciBmYS1wdWxzZVxcXCI+PC9pPlxcblx0XHRcdGxvYWRpbmcgLi4uXFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJuYk1zZ1xcXCI+PHN0cm9uZyBibi10ZXh0PVxcXCJuYk1zZ1xcXCI+PC9zdHJvbmc+Jm5ic3A7TWVzc2FnZXM8L2Rpdj5cdFx0XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxUYWJsZVxcXCI+XFxuXHQ8dGFibGUgY2xhc3M9XFxcInczLXRhYmxlLWFsbCB3My1ob3ZlcmFibGUgdzMtc21hbGxcXFwiPlxcblx0XHQ8dGhlYWQ+XFxuXHRcdFx0PHRyIGNsYXNzPVxcXCJ3My1ncmVlblxcXCI+XFxuXHRcdFx0XHQ8dGg+PGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uTWFpbkNoZWNrQm94Q2xpY2tcXFwiIGJuLXZhbD1cXFwiY2hlY2tcXFwiIGJuLXVwZGF0ZT1cXFwiY2xpY2tcXFwiPjwvdGg+XFxuXHRcdFx0XHQ8dGggYm4tc2hvdz1cXFwiIWlzU2VudEJveFxcXCI+RnJvbTwvdGg+XFxuXHRcdFx0XHQ8dGggYm4tc2hvdz1cXFwiaXNTZW50Qm94XFxcIj5UbzwvdGg+XFxuXHRcdFx0XHQ8dGg+U3ViamVjdDwvdGg+XFxuXHRcdFx0XHQ8dGggdGl0bGU9XFxcIm5iIEF0dGFjaG1lbnRzXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtcGFwZXJjbGlwXFxcIj48L2k+PC90aD5cXG5cdFx0XHRcdDx0aD5EYXRlPC90aD5cXG5cdFx0XHQ8L3RyPlxcblx0XHQ8L3RoZWFkPlxcblx0XHQ8dGJvZHkgYm4tZWFjaD1cXFwibWVzc2FnZXNcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5pdGVtOiBvbkl0ZW1DbGlja1xcXCI+XFxuXHRcdFx0PHRyIGJuLWNsYXNzPVxcXCJ7dW5zZWVuOiAhaXNTZWVufVxcXCI+XFxuXHRcdFx0XHQ8dGg+PGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBjbGFzcz1cXFwiY2hlY2tcXFwiID48L3RoPlxcblx0XHRcdFx0PHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5mcm9tLm5hbWVcXFwiIGJuLWF0dHI9XFxcInt0aXRsZTogJHNjb3BlLiRpLmZyb20uZW1haWx9XFxcIiBibi1zaG93PVxcXCIhaXNTZW50Qm94XFxcIj48L3RkPlxcblx0XHRcdFx0PHRkIGJuLXRleHQ9XFxcInRleHQyXFxcIiBibi1hdHRyPVxcXCJhdHRyMVxcXCIgYm4tc2hvdz1cXFwiaXNTZW50Qm94XFxcIj48L3RkPlxcblx0XHRcdFx0PHRkIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5zdWJqZWN0XFxcIiBjbGFzcz1cXFwiaXRlbVxcXCIgPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLm5iQXR0YWNobWVudHNcXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiZ2V0RGF0ZVxcXCI+PC90ZD5cXG5cdFx0XHQ8L3RyPlxcblx0XHQ8L3Rib2R5Plxcblx0PC90YWJsZT5cXG48L2Rpdj5cXG5cXG5cXG5cIixcblxuXHRkZXBzOiBbJ2FwcC5tYWlscycsICdicmVpemJvdC5wYWdlciddLFxuXG5cdHByb3BzOiB7XG5cdFx0Y3VycmVudEFjY291bnQ6ICcnLFxuXHRcdG1haWxib3hOYW1lOiAnJ1xuXHR9LFxuXG5cdGJ1dHRvbnM6IFtcblx0XHR7bmFtZTogJ3JlbG9hZCcsIGljb246ICdmYSBmYS1zeW5jLWFsdCcsIHRpdGxlOiAnVXBkYXRlJ30sXG5cdFx0e25hbWU6ICduZXdNYWlsJywgaWNvbjogJ2ZhIGZhLWVudmVsb3BlJywgdGl0bGU6ICdOZXcgTWVzc2FnZSd9LFxuXHRcdHtuYW1lOiAnbW92ZScsIGljb246ICdmYSBmYS1maWxlLWV4cG9ydCcsIHRpdGxlOiAnTW92ZSBzZWxlY3RlZCBtZXNzYWdlcyd9LFxuXHRcdHtuYW1lOiAnZGVsZXRlJywgaWNvbjogJ2ZhIGZhLXRyYXNoJywgdGl0bGU6ICdEZWxldGUgc2VsZWN0ZWQgbWVzc2FnZXMnfVxuXHRcblx0XSxcdFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgc3J2TWFpbCwgcGFnZXIpIHtcblxuXHRcdGNvbnN0IHtjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWV9ID0gdGhpcy5wcm9wc1xuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRtZXNzYWdlczogW10sXG5cdFx0XHRcdG5iTXNnOiAwLFxuXHRcdFx0XHRwYWdlTm86IDAsXG5cdFx0XHRcdG5iUGFnZTogMCxcblx0XHRcdFx0Y2hlY2s6IGZhbHNlLFxuXHRcdFx0XHRsb2FkaW5nOiBmYWxzZSxcblx0XHRcdFx0bWFpbGJveE5hbWUsXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gIXRoaXMubG9hZGluZyAmJiB0aGlzLm5iTXNnID4gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR0ZXh0MTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGAke3RoaXMucGFnZU5vfSAvICR7dGhpcy5uYlBhZ2V9YFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR0ZXh0MjogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuJGkudG9bMF0gJiYgc2NvcGUuJGkudG9bMF0ubmFtZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRhdHRyMTogZnVuY3Rpb24oc2NvcGUpIHtcblx0XHRcdFx0XHRyZXR1cm4ge3RpdGxlOiBzY29wZS4kaS50b1swXSAmJiBzY29wZS4kaS50b1swXS5lbWFpbH1cblx0XHRcdFx0fSxcblxuXHRcdFx0XHRnZXREYXRlOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2dldERhdGUnLCBkYXRlKVxuXHRcdFx0XHRcdGNvbnN0IGRhdGUgPSBzY29wZS4kaS5kYXRlXG5cdFx0XHRcdFx0Y29uc3QgZCA9IG5ldyBEYXRlKGRhdGUpXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZCcsIGQpXG5cdFx0XHRcdFx0cmV0dXJuIGQudG9Mb2NhbGVEYXRlU3RyaW5nKCdmci1GUicpXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0aXNTZWVuOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBzY29wZS4kaS5mbGFncy5pbmNsdWRlcygnXFxcXFNlZW4nKVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdGlzU2VudEJveDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMubWFpbGJveE5hbWUgPT0gJ1NlbnQnXG5cdFx0XHRcdH1cblxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvbkl0ZW1DbGljazogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHQvLyAkKHRoaXMpLmNsb3Nlc3QoJ3Rib2R5JykuZmluZCgndHInKS5yZW1vdmVDbGFzcygndzMtYmx1ZScpXG5cdFx0XHRcdFx0Ly8gJCh0aGlzKS5hZGRDbGFzcygndzMtYmx1ZScpXG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCBpdGVtID0gY3RybC5tb2RlbC5tZXNzYWdlc1tpZHhdXG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ21lc3NhZ2VQYWdlJywge1xuXHRcdFx0XHRcdFx0dGl0bGU6IGBNZXNzYWdlICMke2N0cmwubW9kZWwubmJNc2cgLSBpdGVtLnNlcW5vICsgMX1gLFxuXHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0Y3VycmVudEFjY291bnQsXG5cdFx0XHRcdFx0XHRcdG1haWxib3hOYW1lLFxuXHRcdFx0XHRcdFx0XHRpdGVtXHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRvbkJhY2s6IGxvYWRcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uTWFpbkNoZWNrQm94Q2xpY2s6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0ZWx0LmZpbmQoJy5jaGVjaycpLnByb3AoJ2NoZWNrZWQnLCAkKHRoaXMpLnByb3AoJ2NoZWNrZWQnKSlcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvblByZXZQYWdlOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnN0IHtuYlBhZ2UsIHBhZ2VOb30gPSBjdHJsLm1vZGVsXG5cblx0XHRcdFx0XHRpZiAocGFnZU5vID4gMSkge1xuXHRcdFx0XHRcdFx0bG9hZChwYWdlTm8gLSAxKVxuXHRcdFx0XHRcdH1cdFx0XHRcdFx0XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25OZXh0UGFnZTogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCB7bmJQYWdlLCBwYWdlTm99ID0gY3RybC5tb2RlbFxuXG5cdFx0XHRcdFx0aWYgKHBhZ2VObyA8IG5iUGFnZSkge1xuXHRcdFx0XHRcdFx0bG9hZChwYWdlTm8gKyAxKVxuXHRcdFx0XHRcdH1cdFx0XHRcdFxuXHRcdFx0XHR9XHRcdFx0XHRcblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gbG9hZChwYWdlTm8pIHtcblx0XHRcdGlmIChwYWdlTm8gPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHBhZ2VObyA9IGN0cmwubW9kZWwucGFnZU5vXG5cdFx0XHR9XG5cblx0XHRcdGN0cmwuc2V0RGF0YSh7bG9hZGluZzogdHJ1ZX0pXG5cblx0XHRcdHNydk1haWwub3Blbk1haWxib3goY3VycmVudEFjY291bnQsIG1haWxib3hOYW1lLCBwYWdlTm8pLnRoZW4oKGRhdGEpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2RhdGEnLCBkYXRhKVxuXHRcdFx0XHRjb25zdCB7bWVzc2FnZXMsIG5iTXNnfSA9IGRhdGFcblx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRsb2FkaW5nOiBmYWxzZSxcblx0XHRcdFx0XHRjaGVjazogZmFsc2UsXG5cdFx0XHRcdFx0cGFnZU5vLFxuXHRcdFx0XHRcdG5iUGFnZTogTWF0aC5jZWlsKG5iTXNnIC8gMjApLFxuXHRcdFx0XHRcdG5iTXNnLFxuXHRcdFx0XHRcdG1lc3NhZ2VzOiBtZXNzYWdlcy5yZXZlcnNlKClcblx0XHRcdFx0fSlcblx0XHRcdH0pXHRcdFx0XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZ2V0U2VxTm9zKCkge1xuXHRcdFx0Y29uc3QgaXRlbXMgPSBlbHQuZmluZCgnLmNoZWNrOmNoZWNrZWQnKVxuXHRcdFx0Y29uc3Qgc2VxTm9zID0gW11cblx0XHRcdGl0ZW1zLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5pbmRleCgpXG5cdFx0XHRcdHNlcU5vcy5wdXNoKGN0cmwubW9kZWwubWVzc2FnZXNbaWR4XS5zZXFubylcblx0XHRcdH0pXG5cdFx0XHRjb25zb2xlLmxvZygnc2VxTm9zJywgc2VxTm9zKVxuXHRcdFx0cmV0dXJuIHNlcU5vc1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGRlbGV0ZU1lc3NhZ2UoKSB7XG5cdFx0XHRjb25zdCBzZXFOb3MgPSBnZXRTZXFOb3MoKVxuXHRcdFx0aWYgKHNlcU5vcy5sZW5ndGggPT0gMCkge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnRGVsZXRlIE1lc3NhZ2UnLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBvbmUgb3Igc2V2ZXJhbGwgbWVzc2FnZXMgISd9KVxuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblxuXHRcdFx0c3J2TWFpbC5kZWxldGVNZXNzYWdlKGN1cnJlbnRBY2NvdW50LCBtYWlsYm94TmFtZSwgc2VxTm9zKS50aGVuKCgpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ01lc3NhZ2VzIGRlbGV0ZWQnKVxuXHRcdFx0XHRsb2FkKClcblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gbW92ZU1lc3NhZ2UoKSB7XG5cdFx0XHRjb25zdCBzZXFOb3MgPSBnZXRTZXFOb3MoKVxuXHRcdFx0aWYgKHNlcU5vcy5sZW5ndGggPT0gMCkge1xuXHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnTW92ZSBNZXNzYWdlJywgY29udGVudDogJ1BsZWFzZSBzZWxlY3Qgb25lIG9yIHNldmVyYWxsIG1lc3NhZ2VzICEnfSlcblx0XHRcdFx0cmV0dXJuXG5cdFx0XHR9XG5cblx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdib3hlc1BhZ2UnLCB7XG5cdFx0XHRcdHRpdGxlOiAnU2VsZWN0IHRhcmdldCBtYWlsYm94Jyxcblx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRjdXJyZW50QWNjb3VudFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblJldHVybjogZnVuY3Rpb24odGFyZ2V0TmFtZSkge1xuXHRcdFx0XHRcdGlmICh0YXJnZXROYW1lID09IG1haWxib3hOYW1lKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnU2VsZWN0IFRhcmdldCBNYWlsYm94JywgY29udGVudDogJ1RhcmdldCBtYWlsYm94IG11c3QgYmUgZGlmZmVyZW50IGZyb20gY3VycmVudCBtYWlsYm94J30pXG5cdFx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzcnZNYWlsLm1vdmVNZXNzYWdlKGN1cnJlbnRBY2NvdW50LCBtYWlsYm94TmFtZSwgdGFyZ2V0TmFtZSwgc2VxTm9zKVxuXHRcdFx0XHRcdC50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdGxvYWQoKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0XHQvLyBzcnZNYWlsLmRlbGV0ZU1lc3NhZ2UoY3VycmVudEFjY291bnQsIG1haWxib3hOYW1lLCBzZXFOb3MpLnRoZW4oKCkgPT4ge1xuXHRcdFx0Ly8gXHRjb25zb2xlLmxvZygnTWVzc2FnZXMgZGVsZXRlZCcpXG5cdFx0XHQvLyBcdGxvYWQoKVxuXHRcdFx0Ly8gfSlcblx0XHR9XHRcdFxuXG5cdFx0bG9hZCgxKVxuXG5cdFx0ZnVuY3Rpb24gbmV3TWVzc2FnZSgpIHtcblx0XHRcdHBhZ2VyLnB1c2hQYWdlKCd3cml0ZU1haWxQYWdlJywge1xuXHRcdFx0XHR0aXRsZTogJ05ldyBNZXNzYWdlJyxcblx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRhY2NvdW50TmFtZTogY3VycmVudEFjY291bnRcblx0XHRcdFx0fSxcblx0XHRcdFx0b25SZXR1cm46IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGlmIChtYWlsYm94TmFtZSA9PSAnU2VudCcpIHtcblx0XHRcdFx0XHRcdGxvYWQoKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSlcdFx0XHRcblx0XHR9XG5cblxuXHRcdHRoaXMub25BY3Rpb24gPSBmdW5jdGlvbihhY3Rpb24pIHtcblx0XHRcdGNvbnNvbGUubG9nKCdvbkFjdGlvbicsIGFjdGlvbilcblx0XHRcdGlmIChhY3Rpb24gPT0gJ3JlbG9hZCcpIHtcblx0XHRcdFx0bG9hZCgxKVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoYWN0aW9uID09ICdkZWxldGUnKSB7XG5cdFx0XHRcdGRlbGV0ZU1lc3NhZ2UoKVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoYWN0aW9uID09ICdtb3ZlJykge1xuXHRcdFx0XHRtb3ZlTWVzc2FnZSgpXG5cdFx0XHR9XG5cblx0XHRcdGlmIChhY3Rpb24gPT0gJ25ld01haWwnKSB7XG5cdFx0XHRcdG5ld01lc3NhZ2UoKVxuXHRcdFx0fVx0XHRcdFxuXHRcdH1cblxuXG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ21lc3NhZ2VQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgYm4tc2hvdz1cXFwibG9hZGluZ1xcXCIgY2xhc3M9XFxcImxvYWRpbmdcXFwiPlxcblx0PGkgY2xhc3M9XFxcImZhIGZhLXNwaW5uZXIgZmEtcHVsc2VcXFwiPjwvaT5cXG5cdGxvYWRpbmcgLi4uXFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiaGVhZGVyIHczLWJsdWVcXFwiIGJuLXNob3c9XFxcIiFsb2FkaW5nXFxcIj5cXG5cdDxkaXYgY2xhc3M9XFxcImZyb21cXFwiPjxzdHJvbmc+RnJvbTo8L3N0cm9uZz48YSBocmVmPVxcXCIjXFxcIiBibi10ZXh0PVxcXCJpdGVtLmZyb20ubmFtZVxcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkFkZENvbnRhY3RcXFwiIGJuLWRhdGE9XFxcInthZGRyOiBpdGVtLmZyb219XFxcIj48L2E+PC9kaXY+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJzdWJqZWN0XFxcIj48c3Ryb25nPlN1YmplY3Q6PC9zdHJvbmc+PHNwYW4gYm4tdGV4dD1cXFwiaXRlbS5zdWJqZWN0XFxcIiA+PC9zcGFuPjwvZGl2Plxcblx0PGRpdiBibi1zaG93PVxcXCJzaG93MVxcXCIgY2xhc3M9XFxcInRvXFxcIj5cXG5cdFx0PHN0cm9uZyBibi1ldmVudD1cXFwiY2xpY2s6IG9uVG9nZ2xlRGl2XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtY2FyZXQtZG93biBmYS1md1xcXCI+PC9pPlxcblx0XHRUbzwvc3Ryb25nPlxcblx0XHQ8dWwgYm4tZWFjaD1cXFwiaXRlbS50b1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLmNvbnRhY3Q6IG9uQWRkQ29udGFjdFxcXCI+XFxuXHRcdFx0PGxpPlxcblx0XHRcdFx0PGEgaHJlZj1cXFwiI1xcXCIgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLm5hbWVcXFwiIGNsYXNzPVxcXCJjb250YWN0XFxcIj48L2E+XHRcdFx0XHRcXG5cdFx0XHQ8L2xpPlxcblx0XHQ8L3VsPlxcblx0PC9kaXY+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJhdHRhY2htZW50c1xcXCIgYm4tc2hvdz1cXFwic2hvdzJcXFwiPlxcblx0XHQ8c3Ryb25nIGJuLWV2ZW50PVxcXCJjbGljazogb25Ub2dnbGVEaXZcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1jYXJldC1kb3duIGZhLWZ3XFxcIj48L2k+XFxuXHRcdEF0dGFjaG1lbnRzPC9zdHJvbmc+XFxuXHRcdDx1bCAgYm4tZWFjaD1cXFwiYXR0YWNobWVudHNcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5pdGVtOiBvcGVuQXR0YWNobWVudFxcXCI+XFxuXHRcdFx0PGxpPlxcblx0XHRcdFx0PGEgaHJlZj1cXFwiI1xcXCIgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLm5hbWVcXFwiIGNsYXNzPVxcXCJpdGVtXFxcIj48L2E+XFxuXHRcdFx0XHQ8c3BhbiBibi10ZXh0PVxcXCJnZXRTaXplXFxcIj48L3NwYW4+XFxuXHRcdFx0PC9saT5cXG5cdFx0PC91bD5cXG5cdDwvZGl2Plxcblx0XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwibWFpbkh0bWxcXFwiIGJuLXNob3c9XFxcInNob3c0XFxcIj5cXG5cdDxkaXYgYm4tc2hvdz1cXFwic2hvdzNcXFwiIGNsYXNzPVxcXCJlbWJlZGRlZEltYWdlcyB3My1wYWxlLXllbGxvd1xcXCI+XFxuXHRcdDxhIGhyZWY9XFxcIiNcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25FbWJlZGRlZEltYWdlc1xcXCI+RG93bmxvYWQgZW1iZWRkZWQgaW1hZ2VzPC9hPlxcblx0PC9kaXY+XFxuXHQ8aWZyYW1lIGJuLWF0dHI9XFxcIntzcmNkb2M6dGV4dH1cXFwiIGJuLWJpbmQ9XFxcImlmcmFtZVxcXCIgYm4tZXZlbnQ9XFxcImxvYWQ6IG9uRnJhbWVMb2FkZWRcXFwiPjwvaWZyYW1lPlxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcIm1haW5UZXh0XFxcIiBibi1zaG93PVxcXCJzaG93NVxcXCI+XFxuIFx0PHByZSBibi10ZXh0PVxcXCJ0ZXh0XFxcIj48L3ByZT5cXG48L2Rpdj5cIixcblxuXHRkZXBzOiBbJ2FwcC5tYWlscycsICdicmVpemJvdC51c2VycycsICdicmVpemJvdC5zY2hlZHVsZXInLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHRcdGN1cnJlbnRBY2NvdW50OiAnJyxcblx0XHRtYWlsYm94TmFtZTogJycsXG5cdFx0aXRlbTogbnVsbFxuXHR9LFxuXG5cdGJ1dHRvbnM6IFtcblx0XHR7bmFtZTogJ3JlcGx5JywgaWNvbjogJ2ZhIGZhLXJlcGx5JywgdGl0bGU6ICdSZXBseSd9LFxuXHRcdHtuYW1lOiAncmVwbHlBbGwnLCBpY29uOiAnZmEgZmEtcmVwbHktYWxsJywgdGl0bGU6ICdSZXBseSBBbGwnfSxcblx0XHR7bmFtZTogJ2ZvcndhcmQnLCBpY29uOiAnZmEgZmEtc2hhcmUtc3F1YXJlJywgdGl0bGU6ICdGb3J3YXJkJ31cblx0XSxcdFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgc3J2TWFpbCwgdXNlcnMsIHNjaGVkdWxlciwgcGFnZXIpIHtcblxuXHRcdGNvbnN0IHtjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIGl0ZW19ID0gdGhpcy5wcm9wc1xuXG5cblx0XHRjb25zdCB3YWl0RGxnID0gJCQuZGlhbG9nQ29udHJvbGxlcih7XG5cdFx0XHR0aXRsZTogJ0xvYWRpbmcgLi4uJyxcblx0XHRcdHRlbXBsYXRlOiBgPGRpdiBjbGFzcz1cInczLWNlbnRlciB3My1wYWRkaW5nLTE2XCI+PGkgY2xhc3M9XCJmYSBmYS1yZWRvLWFsdCBmYS0yeCBmYS1wdWxzZSB3My10ZXh0LWJsdWVcIj48L2k+PC9kaXY+YCxcblx0XHRcdHdpZHRoOiAxMDAsXG5cdFx0XHRjYW5DbG9zZTogZmFsc2Vcblx0XHR9KVxuXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGVtYmVkZGVkSW1hZ2VzOiBbXSxcblx0XHRcdFx0aXNIdG1sOiBmYWxzZSxcblx0XHRcdFx0bG9hZGluZzogdHJ1ZSxcblx0XHRcdFx0dGV4dDogJycsXG5cdFx0XHRcdGl0ZW0sXG5cdFx0XHRcdGF0dGFjaG1lbnRzOiBbXSxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLml0ZW0udG8ubGVuZ3RoID4gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuYXR0YWNobWVudHMubGVuZ3RoID4gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuZW1iZWRkZWRJbWFnZXMubGVuZ3RoID4gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93NDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuICF0aGlzLmxvYWRpbmcgJiYgdGhpcy5pc0h0bWxcblx0XHRcdFx0fSxcblx0XHRcdFx0c2hvdzU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiAhdGhpcy5sb2FkaW5nICYmICF0aGlzLmlzSHRtbFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRTaXplOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdGxldCBzaXplID0gc2NvcGUuJGkuc2l6ZVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ2dldFNpemUnLCBzaXplKVxuXHRcdFx0XHRcdHNpemUgLz0gMTAyNFxuXHRcdFx0XHRcdGxldCB1bml0ID0gJ0tvJ1xuXHRcdFx0XHRcdGlmIChzaXplID4gMTAyNCkge1xuXHRcdFx0XHRcdFx0c2l6ZSAvPSAxMDI0XG5cdFx0XHRcdFx0XHR1bml0ID0gJ01vJ1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJldHVybiBgICgke3NpemUudG9GaXhlZCgxKX0gJHt1bml0fSlgXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b3BlbkF0dGFjaG1lbnQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdGNvbnN0IGlkeCA9ICQodGhpcykuY2xvc2VzdCgnbGknKS5pbmRleCgpXG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IGN0cmwubW9kZWwuYXR0YWNobWVudHNbaWR4XVxuXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29wZW5BdHRhY2htZW50cycsIGluZm8pXG5cblx0XHRcdFx0XHRpZiAoaW5mby5jYW5PcGVuKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBwcm9wcyA9IHtcblx0XHRcdFx0XHRcdFx0aW5mbyxcblx0XHRcdFx0XHRcdFx0Y3VycmVudEFjY291bnQsXG5cdFx0XHRcdFx0XHRcdG1haWxib3hOYW1lLFxuXHRcdFx0XHRcdFx0XHRzZXFubzogaXRlbS5zZXFub1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ3ZpZXdlclBhZ2UnLCB7XG5cdFx0XHRcdFx0XHRcdHRpdGxlOiBpbmZvLm5hbWUsXG5cdFx0XHRcdFx0XHRcdHByb3BzXG5cdFx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dDb25maXJtKHtcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdPcGVuIEF0dGFjaG1lbnQnLCBcblx0XHRcdFx0XHRcdFx0b2tUZXh0OiAnWWVzJyxcblx0XHRcdFx0XHRcdFx0Y2FuY2VsVGV4dDogJ05vJyxcblx0XHRcdFx0XHRcdFx0Y29udGVudDogYFRoaXMgYXR0YWNobWVudCBjYW5ub3QgYmUgb3BlbiB3aXRoIE5ldE9TPGJyPlxuXHRcdFx0XHRcdFx0XHRcdERvIHlvdSB3YW50IHRvIGRvd25sb2FkIGl0ID9gXG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdPSycpXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3Qge3BhcnRJRCwgdHlwZSwgc3VidHlwZX0gPSBpbmZvXG5cdFx0XHRcdFx0XHRcdFx0d2FpdERsZy5zaG93KClcblx0XHRcdFx0XHRcdFx0XHRzcnZNYWlsLm9wZW5BdHRhY2htZW50KGN1cnJlbnRBY2NvdW50LCBtYWlsYm94TmFtZSwgaXRlbS5zZXFubywgcGFydElEKS50aGVuKChtZXNzYWdlKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdtZXNzYWdlJywgbWVzc2FnZSlcblx0XHRcdFx0XHRcdFx0XHRcdHdhaXREbGcuaGlkZSgpXG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCB1cmwgPSBgZGF0YToke3R5cGV9LyR7c3VidHlwZX07YmFzZTY0LGAgKyBtZXNzYWdlLmRhdGFcblx0XHRcdFx0XHRcdFx0XHRcdCQkLnV0aWwuZG93bmxvYWRVcmwodXJsLCBpbmZvLm5hbWUpXG5cblx0XHRcdFx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25Ub2dnbGVEaXY6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQXR0YWNoQ2xpY2snKVxuXHRcdFx0XHRcdGNvbnN0ICRpID0gJCh0aGlzKS5maW5kKCdpJylcblx0XHRcdFx0XHRjb25zdCAkdWwgPSAkKHRoaXMpLnNpYmxpbmdzKCd1bCcpXG5cdFx0XHRcdFx0aWYgKCRpLmhhc0NsYXNzKCdmYS1jYXJldC1yaWdodCcpKSB7XG5cdFx0XHRcdFx0XHQkaS5yZW1vdmVDbGFzcygnZmEtY2FyZXQtcmlnaHQnKS5hZGRDbGFzcygnZmEtY2FyZXQtZG93bicpXG5cdFx0XHRcdFx0XHQkdWwuc2xpZGVEb3duKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHQkaS5yZW1vdmVDbGFzcygnZmEtY2FyZXQtZG93bicpLmFkZENsYXNzKCdmYS1jYXJldC1yaWdodCcpXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHQkdWwuc2xpZGVVcCgpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkVtYmVkZGVkSW1hZ2VzOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHQvL2N0cmwuc2V0RGF0YSh7ZW1iZWRkZWRJbWFnZXM6IFtdfSlcblx0XHRcdFx0XHRjb25zdCAkaWZyYW1lID0gJChjdHJsLnNjb3BlLmlmcmFtZS5nZXQoMCkuY29udGVudFdpbmRvdy5kb2N1bWVudClcblxuXHRcdFx0XHRcdGNvbnN0IHtlbWJlZGRlZEltYWdlc30gPSBjdHJsLm1vZGVsXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtlbWJlZGRlZEltYWdlczogW119KVxuXG5cdFx0XHRcdFx0ZW1iZWRkZWRJbWFnZXMuZm9yRWFjaCgoZSkgPT4ge1xuXHRcdFx0XHRcdFx0Y29uc3Qge3R5cGUsIHN1YnR5cGUsIHBhcnRJRCwgY2lkfSA9IGVcblx0XHRcdFx0XHRcdHNydk1haWwub3BlbkF0dGFjaG1lbnQoY3VycmVudEFjY291bnQsIG1haWxib3hOYW1lLCBpdGVtLnNlcW5vLCBwYXJ0SUQpLnRoZW4oKG1lc3NhZ2UpID0+IHtcblx0XHRcdFx0XHRcdFx0Y29uc3QgdXJsID0gYGRhdGE6JHt0eXBlfS8ke3N1YnR5cGV9O2Jhc2U2NCxgICsgbWVzc2FnZS5kYXRhXG5cdFx0XHRcdFx0XHRcdGNvbnN0ICRpbWcgPSAkaWZyYW1lLmZpbmQoYGltZ1tzcmM9XCJjaWQ6JHtjaWR9XCJdYClcblx0XHRcdFx0XHRcdFx0JGltZy5hdHRyKCdzcmMnLCB1cmwpXG5cblx0XHRcdFx0XHRcdH0pXHRcdFx0XHRcdFxuXG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkZyYW1lTG9hZGVkOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkZyYW1lTG9hZGVkJylcblx0XHRcdFx0XHRjb25zdCAkaWZyYW1lID0gJCh0aGlzLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQpXG5cdFx0XHRcdFx0JGlmcmFtZS5maW5kKCdhJylcblx0XHRcdFx0XHQuYXR0cigndGFyZ2V0JywgJ19ibGFuaycpXG5cdFx0XHRcdFx0Lm9uKCdjbGljaycsIGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0XHRjb25zdCBocmVmID0gJCh0aGlzKS5hdHRyKCdocmVmJylcblx0XHRcdFx0XHRcdGlmIChocmVmLnN0YXJ0c1dpdGgoJ2h0dHBzOi8veW91dHUuYmUvJykpIHtcblx0XHRcdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdFx0XHRzY2hlZHVsZXIub3BlbkFwcCgneW91dHViZScsIHt1cmw6IGhyZWZ9KVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b25BZGRDb250YWN0OiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvbkFkZENvbnRhY3QnKVxuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnN0IGZyb20gPSBjdHJsLm1vZGVsLml0ZW0udG9baWR4XVxuXHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdhZGRDb250YWN0UGFnZScsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnQWRkIENvbnRhY3QnLFxuXHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0ZnJvbVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0bGV0IHBhcnRJRCA9IGl0ZW0ucGFydElELmh0bWxcblx0XHRsZXQgaXNIdG1sID0gdHJ1ZVxuXHRcdGlmIChwYXJ0SUQgPT0gZmFsc2UpIHtcblx0XHRcdHBhcnRJRCA9IGl0ZW0ucGFydElELnRleHRcblx0XHRcdGlzSHRtbCA9IGZhbHNlXG5cdFx0fVxuXHRcdGNvbnNvbGUubG9nKCdpc0h0bWwnLCBpc0h0bWwpXG5cblxuXHRcdHNydk1haWwub3Blbk1lc3NhZ2UoY3VycmVudEFjY291bnQsIG1haWxib3hOYW1lLCBpdGVtLnNlcW5vLCBwYXJ0SUQpLnRoZW4oKG1lc3NhZ2UpID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKCdtZXNzYWdlJywgbWVzc2FnZSlcblxuXG5cdFx0XHRjb25zdCB7dGV4dCwgYXR0YWNobWVudHMsIGVtYmVkZGVkSW1hZ2VzfSA9IG1lc3NhZ2VcblxuXHRcdFx0YXR0YWNobWVudHMuZm9yRWFjaCgoYSkgPT4ge1xuXHRcdFx0XHRhLmNhbk9wZW4gPSAkJC51dGlsLmdldEZpbGVUeXBlKGEubmFtZSkgIT0gdW5kZWZpbmVkICYmIGEuZW5jb2RpbmcudG9VcHBlckNhc2UoKSA9PSAnQkFTRTY0J1xuXG5cdFx0XHR9KVxuXG5cblx0XHRcdGN0cmwuc2V0RGF0YSh7dGV4dCwgYXR0YWNobWVudHMsIGVtYmVkZGVkSW1hZ2VzLCBsb2FkaW5nOmZhbHNlLCBpc0h0bWx9KVxuXG5cdFx0fSlcblxuXHRcdGZ1bmN0aW9uIHJlcGx5TWVzc2FnZSh0ZXh0LCB0bykge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygncmVwbHlNZXNzYWdlJywgdGV4dClcblx0XHRcdHBhZ2VyLnB1c2hQYWdlKCd3cml0ZU1haWxQYWdlJywge1xuXHRcdFx0XHR0aXRsZTogJ1JlcGx5IG1lc3NhZ2UnLFxuXHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdGFjY291bnROYW1lOiBjdXJyZW50QWNjb3VudCxcblx0XHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0XHR0byxcblx0XHRcdFx0XHRcdHN1YmplY3Q6ICdSZTogJyArIGl0ZW0uc3ViamVjdCxcblx0XHRcdFx0XHRcdGh0bWw6IGA8cHJlPiR7dGV4dH08L3ByZT5gXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KVx0XHRcdFxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGZvcndhcmRNZXNzYWdlKHRleHQpIHtcblx0XHRcdC8vY29uc29sZS5sb2coJ3JlcGx5TWVzc2FnZScsIHRleHQpXG5cdFx0XHRwYWdlci5wdXNoUGFnZSgnd3JpdGVNYWlsUGFnZScsIHtcblx0XHRcdFx0dGl0bGU6ICdGb3J3YXJkIG1lc3NhZ2UnLFxuXHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdGFjY291bnROYW1lOiBjdXJyZW50QWNjb3VudCxcblx0XHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0XHRzdWJqZWN0OiAnRndkOiAnICsgaXRlbS5zdWJqZWN0LFxuXHRcdFx0XHRcdFx0aHRtbDogYDxwcmU+JHt0ZXh0fTwvcHJlPmBcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pXHRcdFx0XG5cdFx0fVxuXG5cdFx0dGhpcy5vbkFjdGlvbiA9IGZ1bmN0aW9uKGFjdGlvbikge1xuXHRcdFx0Y29uc29sZS5sb2coJ29uQWN0aW9uJywgYWN0aW9uLCBpdGVtKVxuXG5cdFx0XHRpZiAoYWN0aW9uID09ICdyZXBseScgfHwgYWN0aW9uID09ICdyZXBseUFsbCcpIHtcblxuXHRcdFx0XHRjb25zdCBIRUFERVIgPSAnXFxuXFxuLS0tLS0gT3JpZ2luYWwgbWFpbCAtLS0tLVxcbidcblxuXHRcdFx0XHRsZXQgdG8gPSBpdGVtLmZyb20uZW1haWxcblxuXHRcdFx0XHRpZiAoYWN0aW9uID09ICdyZXBseUFsbCcgJiYgaXRlbS50by5sZW5ndGggPiAwKSB7XHRcdFx0XHRcdFxuXHRcdFx0XHRcdHRvICs9ICcsJyArIGl0ZW0udG8ubWFwKChhKSA9PiBhLmVtYWlsKS5qb2luKCcsJylcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChjdHJsLm1vZGVsLmlzSHRtbCAmJiBpdGVtLnBhcnRJRC50ZXh0ICE9IGZhbHNlKSB7XG5cdFx0XHRcdFx0c3J2TWFpbC5vcGVuTWVzc2FnZShjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIGl0ZW0uc2Vxbm8sIGl0ZW0ucGFydElELnRleHQpLnRoZW4oKG1lc3NhZ2UpID0+IHtcblx0XHRcdFx0XHRcdHJlcGx5TWVzc2FnZShIRUFERVIgKyBtZXNzYWdlLnRleHQsIHRvKVxuXHRcdFx0XHRcdH0pXHRcdFx0XHRcdFx0XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRlbHNlIGlmICghY3RybC5tb2RlbC5pc0h0bWwpIHtcblx0XHRcdFx0XHRyZXBseU1lc3NhZ2UoSEVBREVSICsgY3RybC5tb2RlbC50ZXh0LCB0bylcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRyZXBseU1lc3NhZ2UoJycsIHRvKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmIChhY3Rpb24gPT0gJ2ZvcndhcmQnKSB7XG5cdFx0XHRcdGNvbnN0IEhFQURFUiA9ICdcXG5cXG4tLS0tLSBGb3J3YXJkZWQgbWFpbCAtLS0tLVxcbidcblxuXG5cdFx0XHRcdGlmIChjdHJsLm1vZGVsLmlzSHRtbCAmJiBpdGVtLnBhcnRJRC50ZXh0ICE9IGZhbHNlKSB7XG5cdFx0XHRcdFx0c3J2TWFpbC5vcGVuTWVzc2FnZShjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIGl0ZW0uc2Vxbm8sIGl0ZW0ucGFydElELnRleHQpLnRoZW4oKG1lc3NhZ2UpID0+IHtcblx0XHRcdFx0XHRcdGZvcndhcmRNZXNzYWdlKEhFQURFUiArIG1lc3NhZ2UudGV4dClcblx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcdFxuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZWxzZSBpZiAoIWN0cmwubW9kZWwuaXNIdG1sKSB7XG5cdFx0XHRcdFx0Zm9yd2FyZE1lc3NhZ2UoSEVBREVSICsgY3RybC5tb2RlbC50ZXh0KVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGZvcndhcmRNZXNzYWdlKCcnKVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9XG5cblxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCd2aWV3ZXJQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxkaXYgc3R5bGU9XFxcImhlaWdodDogMTAwJTsgcG9zaXRpb246IHJlbGF0aXZlOyB0ZXh0LWFsaWduOiBjZW50ZXI7XFxcIj5cXG5cdDxzcGFuIGJuLXNob3c9XFxcIndhaXRcXFwiIGNsYXNzPVxcXCJ3My10ZXh0LWJsdWVcXFwiIHN0eWxlPVxcXCJwb3NpdGlvbjogcmVsYXRpdmU7IHRvcDogNTAlO1xcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXJlZG8tYWx0IGZhLTJ4IGZhLXB1bHNlXFxcIj48L2k+PC9zcGFuPlxcblxcblx0PGRpdiBcXG5cdFx0Ym4tc2hvdz1cXFwiIXdhaXRcXFwiXFxuXHRcdGJuLWNvbnRyb2w9XFxcImJyZWl6Ym90LnZpZXdlclxcXCIgXFxuXHRcdGJuLWRhdGE9XFxcInt0eXBlLCB1cmx9XFxcIiBcXG5cdFx0c3R5bGU9XFxcImhlaWdodDogMTAwJVxcXCIgXFxuXHRcdGJuLWlmYWNlPVxcXCJ2aWV3ZXJcXFwiPlxcblx0XHRcdFxcblx0XHQ8L2Rpdj5cdFxcblxcbjwvZGl2Plx0XCIsXG5cblx0ZGVwczogWydhcHAubWFpbHMnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHRcdGluZm86ICcnLFxuXHRcdGN1cnJlbnRBY2NvdW50OiAnJyxcblx0XHRtYWlsYm94TmFtZTogJycsXG5cdFx0c2Vxbm86ICcnXG5cdH0sXG5cblx0YnV0dG9uczogW1xuXHRcdHtuYW1lOiAnc2F2ZScsIGljb246ICdmYSBmYS1zYXZlJ31cblx0XSxcdFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgc3J2TWFpbCwgcGFnZXIpIHtcblxuXHRcdGNvbnN0IHtpbmZvLCBjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIHNlcW5vfSA9IHRoaXMucHJvcHNcblx0XHRjb25zdCB7cGFydElELCB0eXBlLCBzdWJ0eXBlfSA9IGluZm9cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0dXJsOiAnJyxcblx0XHRcdFx0d2FpdDogdHJ1ZSxcblx0XHRcdFx0dHlwZTogJCQudXRpbC5nZXRGaWxlVHlwZShpbmZvLm5hbWUpXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHR9XG5cdFx0fSlcblxuXHRcdHNydk1haWwub3BlbkF0dGFjaG1lbnQoY3VycmVudEFjY291bnQsIG1haWxib3hOYW1lLCBzZXFubywgcGFydElEKS50aGVuKChtZXNzYWdlKSA9PiB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdtZXNzYWdlJywgbWVzc2FnZSlcblx0XHRcdGNvbnN0IHVybCA9IGBkYXRhOiR7dHlwZX0vJHtzdWJ0eXBlfTtiYXNlNjQsYCArIG1lc3NhZ2UuZGF0YVxuXHRcdFx0Y3RybC5zZXREYXRhKHt3YWl0OmZhbHNlLCB1cmx9KVxuXG5cdFx0fSlcblxuXHRcdHRoaXMub25BY3Rpb24gPSBmdW5jdGlvbihhY3Rpb24pIHtcblx0XHRcdGNvbnNvbGUubG9nKCdvbkFjdGlvbicsIGFjdGlvbilcblx0XHRcdGlmIChhY3Rpb24gPT0gJ3NhdmUnKSB7XG5cdFx0XHRcdGN0cmwuc2NvcGUudmlld2VyLnNhdmUoJy9hcHBzL2VtYWlsJywgaW5mby5uYW1lLCAoKSA9PiB7XG5cdFx0XHRcdFx0cGFnZXIucG9wUGFnZSgpXG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblxufSk7XG5cblxuXG5cblxuXG5cblxuXG5cblxuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ3dyaXRlTWFpbFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGZvcm0gYm4tZXZlbnQ9XFxcInN1Ym1pdDogb25TZW5kXFxcIiBibi1mb3JtPVxcXCJkYXRhXFxcIj5cXG5cdDxkaXYgY2xhc3M9XFxcImhlYWRlclxcXCI+XFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHQ8ZGl2IGNsYXNzPVxcXCJvcGVuQ29udGFjdFBhbmVsXFxcIj5cXG5cdFx0XHRcdDxhIGJuLWV2ZW50PVxcXCJjbGljazogb3BlbkNvbnRhY3RcXFwiIGhyZWY9XFxcIiNcXFwiIGNsYXNzPVxcXCJ3My10ZXh0LWluZGlnb1xcXCI+VG86PC9hPlxcblx0XHRcdDwvZGl2Plxcblx0XHRcdDxpbnB1dCB0eXBlPVxcXCJlbWFpbFxcXCIgbXVsdGlwbGU9XFxcInRydWVcXFwiIG5hbWU9XFxcInRvXFxcIiBibi1wcm9wPVxcXCJwcm9wMVxcXCIgcmVxdWlyZWQ9XFxcIlxcXCIgYm4tYmluZD1cXFwidG9cXFwiPlx0XHRcXG5cdFx0PC9kaXY+XFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHQ8bGFiZWw+U3ViamVjdDo8L2xhYmVsPlxcblx0XHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJzdWJqZWN0XFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cdFx0XFxuXHRcdDwvZGl2Plx0XFxuXFxuXHRcdDxkaXYgYm4tc2hvdz1cXFwic2hvdzFcXFwiIGNsYXNzPVxcXCJhdHRhY2htZW50c1xcXCI+XFxuXHRcdFx0PGxhYmVsPjxpIGNsYXNzPVxcXCJmYSBmYS1wYXBlcmNsaXBcXFwiPjwvaT48L2xhYmVsPlx0XHRcdFxcblx0XHRcdDx1bCBibi1lYWNoPVxcXCJhdHRhY2htZW50c1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLmRlbGV0ZTogb25SZW1vdmVBdHRhY2htZW50XFxcIj5cXG5cdFx0XHRcdDxsaT5cXG5cdFx0XHRcdFx0PHNwYW4gYm4tdGV4dD1cXFwiJGkuZmlsZU5hbWVcXFwiPjwvc3Bhbj5cXG5cdFx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLXRpbWVzIGRlbGV0ZVxcXCI+PC9pPlxcblx0XHRcdFx0PC9saT5cXG5cdFx0XHQ8L3VsPlxcblx0XHQ8L2Rpdj5cXG5cdDwvZGl2Plxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmh0bWxlZGl0b3JcXFwiIGNsYXNzPVxcXCJjb250ZW50XFxcIiBuYW1lPVxcXCJodG1sXFxcIiBibi1pZmFjZT1cXFwiY29udGVudFxcXCI+PC9kaXY+XFxuPCEtLSBcdDx0ZXh0YXJlYSBuYW1lPVxcXCJ0ZXh0XFxcIiBibi1iaW5kPVxcXCJjb250ZW50XFxcIj48L3RleHRhcmVhPlx0XFxuIC0tPlx0PGlucHV0IHR5cGU9XFxcInN1Ym1pdFxcXCIgaGlkZGVuPVxcXCJcXFwiIGJuLWJpbmQ9XFxcInN1Ym1pdFxcXCI+XFxuPC9mb3JtPlxcblwiLFxuXG5cdGRlcHM6IFsnYXBwLm1haWxzJywgJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0cHJvcHM6IHtcblx0XHRhY2NvdW50TmFtZTogJycsXG5cdFx0ZGF0YToge31cblx0fSxcblxuXHRidXR0b25zOiBbXG5cdFx0e25hbWU6ICdhdHRhY2htZW50JywgaWNvbjogJ2ZhIGZhLXBhcGVyY2xpcCcsIHRpdGxlOiAnQWRkIGF0dGFjaG1lbnQnfSxcblx0XHR7bmFtZTogJ3NlbmQnLCBpY29uOiAnZmEgZmEtcGFwZXItcGxhbmUnLCB0aXRsZTogJ1NlbmQgTWVzc2FnZSd9XG5cdF0sXHRcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydk1haWwsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCB7YWNjb3VudE5hbWUsIGRhdGF9ID0gdGhpcy5wcm9wc1xuXHRcdGNvbnNvbGUubG9nKCdkYXRhJywgZGF0YSlcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZGF0YSxcblx0XHRcdFx0YXR0YWNobWVudHM6IFtdLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7cmV0dXJuIHRoaXMuYXR0YWNobWVudHMubGVuZ3RoID4gMH0sXG5cdFx0XHRcdHByb3AxOiBmdW5jdGlvbigpIHtyZXR1cm4ge2F1dG9mb2N1czogdGhpcy5kYXRhLmh0bWwgPT0gdW5kZWZpbmVkfX1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25TZW5kOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblNlbmQnKVxuXHRcdFx0XHRcdGV2LnByZXZlbnREZWZhdWx0KClcblx0XHRcdFx0XHRjb25zdCBkYXRhID0gJCh0aGlzKS5nZXRGb3JtRGF0YSgpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ2RhdGEnLCBkYXRhKVxuXHRcdFx0XHRcdGNvbnN0IHthdHRhY2htZW50c30gPSBjdHJsLm1vZGVsXG5cdFx0XHRcdFx0aWYgKGF0dGFjaG1lbnRzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRcdGRhdGEuYXR0YWNobWVudHMgPSBhdHRhY2htZW50cy5tYXAoKGEpID0+IGEucm9vdERpciArIGEuZmlsZU5hbWUpXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0c3J2TWFpbC5zZW5kTWFpbChhY2NvdW50TmFtZSwgZGF0YSlcblx0XHRcdFx0XHQudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKClcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5jYXRjaCgoZSkgPT4ge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0Vycm9yJywgY29udGVudDogZS5yZXNwb25zZVRleHR9KVxuXHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0fSxcblx0XHRcdFx0b3BlbkNvbnRhY3Q6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvcGVuQ29udGFjdCcpXG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2NvbnRhY3RzUGFnZScsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiAnU2VsZWN0IGEgY29udGFjdCcsXG5cdFx0XHRcdFx0XHRvblJldHVybjogZnVuY3Rpb24oZnJpZW5kcykge1xuXHRcdFx0XHRcdFx0XHRjb25zdCBjb250YWN0cyA9IGZyaWVuZHMubWFwKChhKSA9PiBhLmNvbnRhY3RFbWFpbClcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ2NvbnRhY3RzJywgY29udGFjdHMpXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHRvID0gY3RybC5zY29wZS50by52YWwoKVxuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygndG8nLCB0bylcblxuXHRcdFx0XHRcdFx0XHRpZiAodG8gIT0gJycpIHtcblx0XHRcdFx0XHRcdFx0XHRjb250YWN0cy51bnNoaWZ0KHRvKVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7ZGF0YToge3RvOiBjb250YWN0cy5qb2luKCcsJyl9fSlcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUmVtb3ZlQXR0YWNobWVudDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblJlbW92ZUF0dGFjaG1lbnQnLCBpZHgpXG5cdFx0XHRcdFx0Y3RybC5tb2RlbC5hdHRhY2htZW50cy5zcGxpY2UoaWR4LCAxKVxuXHRcdFx0XHRcdGN0cmwudXBkYXRlKClcblxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHR9KVxuXG5cdFx0aWYgKGRhdGEuaHRtbCAhPSB1bmRlZmluZWQpIHtcblx0XHRcdGN0cmwuc2NvcGUuY29udGVudC5mb2N1cygpXG5cdFx0fVx0XHRcblxuXHRcdHRoaXMub25BY3Rpb24gPSBmdW5jdGlvbihhY3Rpb24pIHtcblx0XHRcdGNvbnNvbGUubG9nKCdvbkFjdGlvbicsIGFjdGlvbilcblx0XHRcdGlmIChhY3Rpb24gPT0gJ3NlbmQnKSB7XG5cdFx0XHRcdGN0cmwuc2NvcGUuc3VibWl0LmNsaWNrKClcblx0XHRcdH1cblx0XHRcdGlmKCBhY3Rpb24gPT0gJ2F0dGFjaG1lbnQnKSB7XG5cdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdicmVpemJvdC5maWxlcycsIHtcblx0XHRcdFx0XHR0aXRsZTogJ1NlbGVjdCBhIGZpbGUgdG8gYXR0YWNoJyxcblx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0c2hvd1RodW1ibmFpbDogdHJ1ZVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0b25SZXR1cm46IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0XHRcdGNvbnN0IHtmaWxlTmFtZSwgcm9vdERpcn0gPSBkYXRhXG5cdFx0XHRcdFx0XHRjdHJsLm1vZGVsLmF0dGFjaG1lbnRzLnB1c2goe2ZpbGVOYW1lLCByb290RGlyfSlcblx0XHRcdFx0XHRcdGN0cmwudXBkYXRlKClcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHR9XG5cdFx0fVxuXG5cdH1cbn0pIl19
