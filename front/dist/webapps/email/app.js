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
					pager.pushPage('breizbot.contacts', {
						title: 'Select a contact',
						props: {
							showSelection: true
						},
						buttons: {
							ok: {
								title: 'Apply',
								icon: 'fa fa-check',
								onClick: function() {
									pager.popPage(this.getSelection())
			
								}
							}
						},
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJzZXJ2aWNlcy9tYWlscy5qcyIsInBhZ2VzL2FkZENvbnRhY3QvYWRkQ29udGFjdC5qcyIsInBhZ2VzL2FjY291bnQvYWNjb3VudC5qcyIsInBhZ2VzL2JveGVzL2JveGVzLmpzIiwicGFnZXMvbWFpbGJveC9tYWlsYm94LmpzIiwicGFnZXMvbWVzc2FnZS9tZXNzYWdlLmpzIiwicGFnZXMvd3JpdGVNYWlsL3dyaXRlTWFpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgncm9vdFBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBjbGFzcz1cXFwidG9vbGJhclxcXCI+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJpbmZvXFxcIj5cXG5cdFx0PHNwYW4gYm4tc2hvdz1cXFwic2hvdzFcXFwiPllvdSBoYXZlIG5vIGVtYWlsIGFjY291bnQ8L3NwYW4+XFxuXHRcdDxkaXYgYm4tc2hvdz1cXFwic2hvdzJcXFwiIGNsYXNzPVxcXCJhY2NvdW50XFxcIj5cXG5cdFx0XHQ8c3Bhbj5BY2NvdW50OiZuYnNwOzwvc3Bhbj4gXFxuXHRcdFx0PGRpdiBcXG5cdFx0XHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMuc2VsZWN0bWVudVxcXCIgXFxuXHRcdFx0XHRibi1kYXRhPVxcXCJ7aXRlbXM6IGFjY291bnRzfVxcXCIgXFxuXHRcdFx0XHRibi12YWw9XFxcImN1cnJlbnRBY2NvdW50XFxcIlxcblx0XHRcdFx0Ym4tZXZlbnQ9XFxcInNlbGVjdG1lbnVjaGFuZ2U6IG9uQWNjb3VudENoYW5nZVxcXCI+XFxuXHRcdFx0PC9kaXY+XFxuXHRcdDwvZGl2Plxcblx0XHRcXG5cdDwvZGl2Plxcblx0PGRpdj5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmNvbnRleHRtZW51XFxcIiBcXG5cdFx0XHRibi1kYXRhPVxcXCJ7aXRlbXM6IGdldEl0ZW1zfVxcXCIgXFxuXHRcdFx0ZGF0YS10cmlnZ2VyPVxcXCJsZWZ0XFxcIiBcXG5cdFx0XHRjbGFzcz1cXFwidzMtYnV0dG9uIHczLWJsdWVcXFwiIFxcblx0XHRcdGJuLWV2ZW50PVxcXCJjb250ZXh0bWVudWNoYW5nZTogb25NZW51XFxcIlxcblx0XHRcdD5cXG5cdFx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1lbGxpcHNpcy12XFxcIj48L2k+XFxuICAgIFx0XFxuXHRcdDwvZGl2Plx0XHRcXG5cdFx0XFxuXHQ8L2Rpdj5cXG5cdFxcbjwvZGl2PlxcblxcbjxkaXY+XFxuXHRTZWxlY3QgZm9sZGVyIHRvIG9wZW46XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwic2Nyb2xsUGFuZWxUcmVlXFxcIj5cXG5cdDxkaXYgXFxuXHRcdGNsYXNzPVxcXCJ0cmVlXFxcIiBcXG5cdFx0Ym4tY29udHJvbD1cXFwiYnJhaW5qcy50cmVlXFxcIlxcblx0XHRibi1kYXRhPVxcXCJ7c291cmNlOiBtYWlsYm94ZXN9XFxcIlxcblx0XHRibi1ldmVudD1cXFwidHJlZWFjdGl2YXRlOiBvblRyZWVBY3RpdmF0ZVxcXCJcXG5cdFx0Ym4taWZhY2U9XFxcInRyZWVcXFwiXFxuXHQ+PC9kaXY+XFxuPC9kaXY+XFxuXFxuXFxuXCIsXG5cblx0ZGVwczogWydhcHAubWFpbHMnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgc3J2TWFpbCwgcGFnZXIpIHtcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0YWNjb3VudHM6IFtdLFxuXHRcdFx0XHRjdXJyZW50QWNjb3VudDogJycsXG5cdFx0XHRcdG1haWxib3hlczogW10sXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5hY2NvdW50cy5sZW5ndGggPT0gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93MjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuYWNjb3VudHMubGVuZ3RoID4gMFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRnZXRJdGVtczogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0aWYgKHRoaXMuYWNjb3VudHMubGVuZ3RoID09IDApIHtcblx0XHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRcdGFkZDoge25hbWU6ICdBZGQgQWNjb3VudCcsIGljb246ICdmYXMgZmEtcGx1cyd9LFxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0YWRkOiB7bmFtZTogJ0FkZCBBY2NvdW50JywgaWNvbjogJ2ZhcyBmYS1wbHVzJ30sXG5cdFx0XHRcdFx0XHRlZGl0OiB7bmFtZTogJ0VkaXQgU2VsZWN0ZWQgQWNjb3VudCcsIGljb246ICdmYXMgZmEtZWRpdCd9LFxuXHRcdFx0XHRcdFx0c2VwMjogJy0tLS0tLScsXG5cdFx0XHRcdFx0XHRuZXdGb2xkZXI6IHtuYW1lOiAnTmV3IEZvbGRlcicsIGljb246ICdmYXMgZmEtZm9sZGVyLXBsdXMnfSxcblx0XHRcdFx0XHRcdHNlcDogJy0tLS0tLScsXG5cdFx0XHRcdFx0XHRuZXc6IHtuYW1lOiAnTmV3IE1lc3NhZ2UnLCBpY29uOiAnZmFzIGZhLWVudmVsb3BlJ31cdFx0XHRcdFx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uTWVudTogZnVuY3Rpb24oZXYsIGRhdGEpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25NZW51JywgZGF0YSlcblx0XHRcdFx0XHRpZiAoZGF0YS5jbWQgPT0gJ2FkZCcpIHtcblx0XHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdhY2NvdW50UGFnZScsIHtcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdBZGQgTWFpbCBBY2NvdW50Jyxcblx0XHRcdFx0XHRcdFx0b25SZXR1cm46IGxvYWRBY2NvdW50XG5cdFx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZGF0YS5jbWQgPT0gJ25ldycpIHtcblx0XHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCd3cml0ZU1haWxQYWdlJywge1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ05ldyBNZXNzYWdlJyxcblx0XHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0XHRhY2NvdW50TmFtZTogY3RybC5tb2RlbC5jdXJyZW50QWNjb3VudFxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZGF0YS5jbWQgPT0gJ2VkaXQnKSB7XG5cdFx0XHRcdFx0XHRzcnZNYWlsLmdldE1haWxBY2NvdW50KGN0cmwubW9kZWwuY3VycmVudEFjY291bnQpLnRoZW4oKGRhdGEpID0+IHtcblx0XHRcdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2FjY291bnRQYWdlJywge1xuXHRcdFx0XHRcdFx0XHRcdHRpdGxlOiAnRWRpdCBNYWlsIEFjY291bnQnLFxuXHRcdFx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhXG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcdFxuXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZGF0YS5jbWQgPT0gJ25ld0ZvbGRlcicpIHtcblx0XHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdib3hlc1BhZ2UnLCB7XG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnQWRkIG5ldyBmb2xkZXInLFxuXHRcdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRcdGN1cnJlbnRBY2NvdW50OiBjdHJsLm1vZGVsLmN1cnJlbnRBY2NvdW50LFxuXHRcdFx0XHRcdFx0XHRcdHNob3dGb3JtOiB0cnVlXG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbih0YXJnZXROYW1lKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uUmV0dXJuJywgdGFyZ2V0TmFtZSlcblx0XHRcdFx0XHRcdFx0XHRzcnZNYWlsLmFkZE1haWxib3goY3RybC5tb2RlbC5jdXJyZW50QWNjb3VudCwgdGFyZ2V0TmFtZSkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRsb2FkTWFpbGJveGVzKClcblx0XHRcdFx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uQWNjb3VudENoYW5nZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQWNjb3VudENoYW5nZScsICQodGhpcykuZ2V0VmFsdWUoKSlcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe2N1cnJlbnRBY2NvdW50OiAkKHRoaXMpLmdldFZhbHVlKCl9KVxuXHRcdFx0XHRcdGxvYWRNYWlsYm94ZXMoKVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uVHJlZUFjdGl2YXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25UcmVlQWN0aXZhdGUnKVxuXHRcdFx0XHRcdGNvbnN0IHRyZWUgPSAkKHRoaXMpLmlmYWNlKClcblxuXHRcdFx0XHRcdGNvbnN0IG5vZGUgPSAgdHJlZS5nZXRBY3RpdmVOb2RlKClcblxuXHRcdFx0XHRcdGNvbnN0IG1haWxib3hOYW1lID0gdHJlZS5nZXROb2RlUGF0aChub2RlKVx0XHRcdFx0XHRcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnbWFpbGJveE5hbWUnLCBtYWlsYm94TmFtZSlcblx0XHRcdFx0XHRjb25zdCB7Y3VycmVudEFjY291bnR9ID0gY3RybC5tb2RlbFxuXHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdtYWlsYm94UGFnZScsIHtcblx0XHRcdFx0XHRcdHRpdGxlOiBub2RlLnRpdGxlLFxuXHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0Y3VycmVudEFjY291bnQsXG5cdFx0XHRcdFx0XHRcdG1haWxib3hOYW1lXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0b25CYWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0Y29uc3QgYWN0aXZlTm9kZSA9IGN0cmwuc2NvcGUudHJlZS5nZXRBY3RpdmVOb2RlKClcblx0XHRcdFx0XHRcdFx0aWYgKGFjdGl2ZU5vZGUgIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0XHRcdGFjdGl2ZU5vZGUuc2V0QWN0aXZlKGZhbHNlKVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cdFx0fSlcblxuXG5cdFx0ZnVuY3Rpb24gbG9hZEFjY291bnQoKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnbG9hZEFjY291bnQnKVxuXHRcdFx0c3J2TWFpbC5nZXRNYWlsQWNjb3VudHMoKS50aGVuKChhY2NvdW50cykgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnYWNjb3VudHMnLCBhY2NvdW50cylcblx0XHRcdFx0aWYgKGFjY291bnRzLmxlbmd0aCA9PSAwKSB7XG5cdFx0XHRcdFx0cmV0dXJuXG5cdFx0XHRcdH1cblx0XHRcdFx0Y29uc3QgY3VycmVudEFjY291bnQgPSBhY2NvdW50c1swXVxuXHRcdFx0XHRjb25zb2xlLmxvZygnY3VycmVudEFjY291bnQnLCBjdXJyZW50QWNjb3VudClcblx0XHRcdFx0Y3RybC5zZXREYXRhKHthY2NvdW50cywgY3VycmVudEFjY291bnR9KVxuXHRcdFx0XHRsb2FkTWFpbGJveGVzKClcblx0XHRcdH0pLmNhdGNoKChlcnIpID0+IHtcblx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHt0aXRsZTogJ0Vycm9yJywgY29udGVudDogZXJyfSlcblx0XHRcdH0pXHRcdFx0XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gbG9hZE1haWxib3hlcygpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdsb2FkTWFpbGJveGVzJylcblx0XHRcdGNvbnN0IHtjdXJyZW50QWNjb3VudH0gPSBjdHJsLm1vZGVsXG5cdFx0XHRzcnZNYWlsLmdldE1haWxib3hlcyhjdXJyZW50QWNjb3VudCkudGhlbigobWFpbGJveGVzKSA9PiB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdtYWlsYm94ZXMnLCBtYWlsYm94ZXMpXG5cblx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRtYWlsYm94ZXNcblx0XHRcdFx0fSlcblx0XHRcdH0pXG5cdFx0fVxuXG5cdFx0bG9hZEFjY291bnQoKVxuXG5cdH1cblxuXG59KTtcblxuXG5cblxuIiwiJCQuc2VydmljZS5yZWdpc3RlclNlcnZpY2UoJ2FwcC5tYWlscycsIHtcblxuXHRkZXBzOiBbJ2JyZWl6Ym90Lmh0dHAnXSxcblxuXHRpbml0OiBmdW5jdGlvbihjb25maWcsIGh0dHApIHtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRnZXRNYWlsQWNjb3VudHM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaHR0cC5nZXQoJy9nZXRNYWlsQWNjb3VudHMnKVxuXHRcdFx0fSxcblxuXHRcdFx0Z2V0TWFpbEFjY291bnQ6IGZ1bmN0aW9uKG5hbWUpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2dldE1haWxBY2NvdW50Jywge25hbWV9KVxuXHRcdFx0fSxcblxuXHRcdFx0Y3JlYXRlTWFpbEFjY291bnQ6IGZ1bmN0aW9uKGRhdGEpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdCgnL2NyZWF0ZU1haWxBY2NvdW50JywgZGF0YSlcblx0XHRcdH0sXG5cblx0XHRcdHVwZGF0ZU1haWxBY2NvdW50OiBmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoJy91cGRhdGVNYWlsQWNjb3VudCcsIGRhdGEpXG5cdFx0XHR9LFxuXG5cdFx0XHRnZXRNYWlsYm94ZXM6IGZ1bmN0aW9uKG5hbWUpIHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL2dldE1haWxib3hlc2AsIHtuYW1lfSlcblx0XHRcdH0sXG5cblx0XHRcdGFkZE1haWxib3g6IGZ1bmN0aW9uKG5hbWUsIG1haWxib3hOYW1lKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9hZGRNYWlsYm94YCwge25hbWUsIG1haWxib3hOYW1lfSlcblx0XHRcdH0sXG5cblx0XHRcdG9wZW5NYWlsYm94OiBmdW5jdGlvbihuYW1lLCBtYWlsYm94TmFtZSwgcGFnZU5vKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9vcGVuTWFpbGJveGAsIHtuYW1lLCBtYWlsYm94TmFtZSwgcGFnZU5vfSlcblx0XHRcdH0sXG5cblx0XHRcdG9wZW5NZXNzYWdlOiBmdW5jdGlvbihuYW1lLCBtYWlsYm94TmFtZSwgc2VxTm8sIHBhcnRJRClcdHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL29wZW5NZXNzYWdlYCwge25hbWUsIG1haWxib3hOYW1lLCBzZXFObywgcGFydElEfSlcblx0XHRcdH0sXG5cblx0XHRcdG9wZW5BdHRhY2htZW50OiBmdW5jdGlvbihuYW1lLCBtYWlsYm94TmFtZSwgc2VxTm8sIHBhcnRJRClcdHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL29wZW5BdHRhY2htZW50YCwge25hbWUsIG1haWxib3hOYW1lLCBzZXFObywgcGFydElEfSlcblx0XHRcdH0sXG5cblx0XHRcdGRlbGV0ZU1lc3NhZ2U6IGZ1bmN0aW9uKG5hbWUsIG1haWxib3hOYW1lLCBzZXFOb3MpXHR7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9kZWxldGVNZXNzYWdlYCwge25hbWUsIG1haWxib3hOYW1lLCBzZXFOb3N9KVxuXHRcdFx0fSxcdFxuXG5cdFx0XHRtb3ZlTWVzc2FnZTogZnVuY3Rpb24obmFtZSwgbWFpbGJveE5hbWUsIHRhcmdldE5hbWUsIHNlcU5vcylcdHtcblx0XHRcdFx0cmV0dXJuIGh0dHAucG9zdChgL21vdmVNZXNzYWdlYCwge25hbWUsIG1haWxib3hOYW1lLCB0YXJnZXROYW1lLCBzZXFOb3N9KVxuXHRcdFx0fSxcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcblxuXHRcdFx0c2VuZE1haWw6IGZ1bmN0aW9uKGFjY291bnROYW1lLCBkYXRhKSB7XG5cdFx0XHRcdHJldHVybiBodHRwLnBvc3QoYC9zZW5kTWFpbGAsIHthY2NvdW50TmFtZSwgZGF0YX0pXG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdCRpZmFjZTogYFxuXHRcdGdldE1haWxBY2NvdW50KCk6UHJvbWlzZTtcblx0XHRjcmVhdGVNYWlBY2NvdW50KGRhdGEpOlByb21pc2U7XG5cdFx0Z2V0TWFpbGJveGVzKG5hbWUpOlByb21pc2U7XG5cdFx0b3Blbk1haWxib3gobmFtZSwgbWFpbGJveE5hbWUsIHBhZ2VObyk6UHJvbWlzZTtcblx0XHRvcGVuTWVzc2FnZShuYW1lLCBtYWlsYm94TmFtZSwgc2VxTm8sIHBhcnRJRCk6UHJvbWlzZTtcblx0XHRvcGVuQXR0YWNobWVudChuYW1lLCBtYWlsYm94TmFtZSwgc2VxTm8sIHBhcnRJRCk6UHJvbWlzZTtcblx0XHRkZWxldGVNZXNzYWdlKG5hbWUsIG1haWxib3hOYW1lLCBzZXFOb3MpOlByb21pc2U7XG5cdFx0bW92ZU1lc3NhZ2UobmFtZSwgbWFpbGJveE5hbWUsIHRhcmdldE5hbWUsIHNlcU5vcyk6UHJvbWlzZVxuXHRcdGBcbn0pO1xuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2FkZENvbnRhY3RQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxmb3JtIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU3VibWl0XFxcIiBibi1mb3JtPVxcXCJmcm9tXFxcIj5cXG5cdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0PGxhYmVsPk5hbWU6PC9sYWJlbD48YnI+XFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJuYW1lXFxcIiBzdHlsZT1cXFwibWluLXdpZHRoOiAzMDBweFxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XHRcXG5cdDwvZGl2Plxcblx0PGJyPlxcblxcblx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHQ8bGFiZWw+RW1haWw6PC9sYWJlbD48YnI+XFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJlbWFpbFxcXCIgbmFtZT1cXFwiZW1haWxcXFwiIHN0eWxlPVxcXCJtaW4td2lkdGg6IDMwMHB4XFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cdFxcblx0PC9kaXY+XHRcXG5cXG5cdDxpbnB1dCB0eXBlPVxcXCJzdWJtaXRcXFwiIGJuLWJpbmQ9XFxcInN1Ym1pdFxcXCIgaGlkZGVuPVxcXCJcXFwiPlxcbjwvZm9ybT5cXG5cIixcblxuXHRkZXBzOiBbJ2JyZWl6Ym90LnVzZXJzJywgJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0cHJvcHM6IHtcblx0XHRmcm9tOiB7fVxuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgdXNlcnMsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCB7ZnJvbX0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdGZyb21cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25TdWJtaXQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdGNvbnN0IGRhdGEgPSAkKHRoaXMpLmdldEZvcm1EYXRhKClcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnZGF0YScsIGRhdGEpXG5cdFx0XHRcdFx0dXNlcnMuYWRkQ29udGFjdChkYXRhLm5hbWUsIGRhdGEuZW1haWwpLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ2NvbnRhY3QgYWRkZWQgIScpXG5cdFx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKCdhZGRDb250YWN0Jylcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5jYXRjaCgoZXJyKSA9PiB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnRXJyb3InLCBjb250ZW50OiBlcnIucmVzcG9uc2VUZXh0fSlcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9KVxuXG5cdFx0dGhpcy5nZXRCdXR0b25zID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRhZGQ6IHtcblx0XHRcdFx0XHR0aXRsZTogJ0FkZCcsXG5cdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLXVzZXItcGx1cycsXG5cdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRjdHJsLnNjb3BlLnN1Ym1pdC5jbGljaygpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XHRcdFx0XG5cdFx0fVxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdhY2NvdW50UGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJtYWluXFxcIj5cXG5cdDxmb3JtIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU3VibWl0XFxcIiBibi1iaW5kPVxcXCJmb3JtXFxcIiBibi1mb3JtPVxcXCJkYXRhXFxcIj5cXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdDxsYWJlbD5Qcm92aWRlcjwvbGFiZWw+XFxuXHRcdFx0PHNwYW4gYm4tY29udHJvbD1cXFwiYnJhaW5qcy5zZWxlY3RtZW51XFxcIiBcXG5cdFx0XHRcdGJuLWV2ZW50PVxcXCJzZWxlY3RtZW51Y2hhbmdlOiBvblByb3ZpZGVyQ2hhbmdlXFxcIiBibi12YWw9XFxcInByb3ZpZGVyXFxcIlxcblx0XHRcdFx0Ym4tZGF0YT1cXFwie2l0ZW1zOiBwcm92aWRlcnN9XFxcIlxcblx0XHRcdFx0Ym4tcHJvcD1cXFwie2Rpc2FibGVkOiBpc0VkaXR9XFxcIlxcblx0XHRcdD5cXG5cdFx0XHQ8L3NwYW4+XHRcdFxcblx0XHQ8L2Rpdj5cdFx0XHRcXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdDxsYWJlbD5BY2NvdW50IE5hbWU8L2xhYmVsPlxcblx0XHRcdDxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJuYW1lXFxcIiByZXF1aXJlZD1cXFwiXFxcIiBhdXRvZm9jdXM9XFxcIlxcXCIgYm4tcHJvcD1cXFwie2Rpc2FibGVkOiBpc0VkaXR9XFxcIj5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIj5cXG5cdFx0XHQ8bGFiZWw+VXNlcjwvbGFiZWw+XFxuXHRcdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcInVzZXJcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdDxsYWJlbD5QYXNzd29yZDwvbGFiZWw+XFxuXHRcdFx0PGlucHV0IHR5cGU9XFxcInBhc3N3b3JkXFxcIiBuYW1lPVxcXCJwd2RcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlx0XHRcdFxcblx0XHQ8L2Rpdj5cXG5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdDxsYWJlbD5FbWFpbDwvbGFiZWw+XFxuXHRcdFx0PGlucHV0IHR5cGU9XFxcImVtYWlsXFxcIiBuYW1lPVxcXCJlbWFpbFxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XHRcdFx0XFxuXHRcdDwvZGl2Plxcblxcblx0XFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIiBibi1zaG93PVxcXCJzaG93MVxcXCI+XFxuXHRcdFx0PGxhYmVsPklNQVAgU2VydmVyPC9sYWJlbD5cXG5cdFx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwiaW1hcEhvc3RcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPlx0XHRcdFxcblx0XHQ8L2Rpdj5cdFx0XFxuXFxuXHRcdDxkaXYgYm4tY29udHJvbD1cXFwiYnJhaW5qcy5pbnB1dGdyb3VwXFxcIiAgYm4tc2hvdz1cXFwic2hvdzFcXFwiPlxcblx0XHRcdDxsYWJlbD5TTVRQIFNlcnZlcjwvbGFiZWw+XFxuXHRcdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcInNtdHBIb3N0XFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cdFx0XHRcXG5cdFx0PC9kaXY+XHRcdFxcblxcblx0XHQ8ZGl2IGNsYXNzPVxcXCJjb3B5U2VudFxcXCI+XFxuXHRcdFx0PGxhYmVsPk1ha2UgYSBjb3B5IG9mIHNlbnQgbWFpbCBpbiBTZW50IGZvbGRlcjwvbGFiZWw+XFxuXHRcdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmZsaXBzd2l0Y2hcXFwiIGJuLWRhdGE9XFxcImRhdGExXFxcIiBuYW1lPVxcXCJtYWtlQ29weVxcXCI+PC9kaXY+XFxuXHRcdDwvZGl2Plxcblxcblx0XHQ8aW5wdXQgdHlwZT1cXFwic3VibWl0XFxcIiBoaWRkZW49XFxcIlxcXCIgYm4tYmluZD1cXFwic3VibWl0XFxcIj5cXG5cdDwvZm9ybT5cXG5cXG48L2Rpdj5cIixcblxuXHRkZXBzOiBbJ2FwcC5tYWlscycsICdicmVpemJvdC5wYWdlciddLFxuXG5cdHByb3BzOiB7XG5cdFx0ZGF0YTogbnVsbFxuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgc3J2TWFpbCwgcGFnZXIpIHtcblxuXHRcdGNvbnN0IHtkYXRhfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IG1hcCA9IHtcblx0XHRcdCdHbWFpbCc6IHtcblx0XHRcdFx0aW1hcEhvc3Q6ICdpbWFwLmdtYWlsLmNvbScsXG5cdFx0XHRcdHNtdHBIb3N0OiAnc210cC5nbWFpbC5jb20nXG5cdFx0XHR9LFxuXHRcdFx0J091dGxvb2snOiB7XG5cdFx0XHRcdGltYXBIb3N0OiAnaW1hcC5vdXRsb29rLmNvbScsXG5cdFx0XHRcdHNtdHBIb3N0OiAnc210cC5vdXRsb29rLmNvbSdcblx0XHRcdH0sXG5cdFx0XHQnRnJlZSc6IHtcblx0XHRcdFx0aW1hcEhvc3Q6ICdpbWFwLmZyZWUuZnInLFxuXHRcdFx0XHRzbXRwSG9zdDogJ3NtdHAuZnJlZS5mcidcblx0XHRcdH0sXG5cdFx0XHQnU0ZSJzoge1xuXHRcdFx0XHRpbWFwSG9zdDogJ2ltYXAuc2ZyLmZyJyxcblx0XHRcdFx0c210cEhvc3Q6ICdzbXRwLnNmci5mcidcblx0XHRcdH0sXG5cdFx0XHQnT3JhbmdlJzoge1xuXHRcdFx0XHRpbWFwSG9zdDogJ2ltYXAub3JhbmdlLmZyJyxcblx0XHRcdFx0c210cEhvc3Q6ICdzbXRwLm9yYW5nZS5mcidcblx0XHRcdH0sXG5cdFx0XHQnQm91eWd1ZXMgVGVsZWNvbSc6IHtcblx0XHRcdFx0aW1hcEhvc3Q6ICdpbWFwLmJib3guZnInLFxuXHRcdFx0XHRzbXRwSG9zdDogJ3NtdHAuYmJveC5mcidcblx0XHRcdH0sXG5cdFx0XHQnT3RoZXInOiB7XG5cdFx0XHRcdGltYXBIb3N0OiAnJyxcblx0XHRcdFx0c210cEhvc3Q6ICcnXG5cdFx0XHR9LFxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGdldFByb3ZpZGVyKGluZm8pIHtcblx0XHRcdGZvcihsZXQgayBpbiBtYXApIHtcblx0XHRcdFx0aWYgKG1hcFtrXS5pbWFwSG9zdCA9PSBpbmZvLmltYXBIb3N0KSB7XG5cdFx0XHRcdFx0cmV0dXJuIGtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuICdPdGhlcidcblx0XHR9XG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdHByb3ZpZGVyOiAoZGF0YSAhPSBudWxsKSA/IGdldFByb3ZpZGVyKGRhdGEpIDogJ0dtYWlsJyxcblx0XHRcdFx0cHJvdmlkZXJzOiBPYmplY3Qua2V5cyhtYXApLFxuXHRcdFx0XHRkYXRhLFxuXHRcdFx0XHRpc0VkaXQ6IGRhdGEgIT0gbnVsbCxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uKCkge3JldHVybiB0aGlzLnByb3ZpZGVyID09ICdPdGhlcid9LFxuXHRcdFx0XHRkYXRhMTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHtoZWlnaHQ6IDI1LCB3aWR0aDogMTAwLCB0ZXh0czoge2xlZnQ6ICdZRVMnLCByaWdodDogJ05PJ319XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25TdWJtaXQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdGNvbnN0IGZvcm1EYXRhID0gJCh0aGlzKS5nZXRGb3JtRGF0YSgpXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ2Zvcm1EYXRhJywgZm9ybURhdGEpXG5cdFx0XHRcdFx0aWYgKGRhdGEgPT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0c3J2TWFpbC5jcmVhdGVNYWlsQWNjb3VudChmb3JtRGF0YSkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoKVxuXHRcdFx0XHRcdFx0fSlcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRzcnZNYWlsLnVwZGF0ZU1haWxBY2NvdW50KGZvcm1EYXRhKS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdFx0cGFnZXIucG9wUGFnZSgpXG5cdFx0XHRcdFx0XHR9KVx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblByb3ZpZGVyQ2hhbmdlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRjb25zdCBwcm92aWRlciA9ICQodGhpcykuZ2V0VmFsdWUoKVxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdvblByb3ZpZGVyQ2hhbmdlJywgcHJvdmlkZXIpXG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtwcm92aWRlcn0pXG5cblx0XHRcdFx0XHRjdHJsLnNjb3BlLmZvcm0uc2V0Rm9ybURhdGEobWFwW3Byb3ZpZGVyXSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRjdHJsLnNjb3BlLmZvcm0uc2V0Rm9ybURhdGEobWFwW2N0cmwubW9kZWwucHJvdmlkZXJdKVxuXG5cdFx0dGhpcy5nZXRCdXR0b25zID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRhcHBseToge1xuXHRcdFx0XHRcdHRpdGxlOiAnQXBwbHknLFxuXHRcdFx0XHRcdGljb246ICdmYSBmYS1jaGVjaycsXG5cdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRjdHJsLnNjb3BlLnN1Ym1pdC5jbGljaygpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XHRcdFx0XHRcblx0XHR9XG5cblx0fVxuXG59KTtcblxuXG5cblxuIiwiJCQuY29udHJvbC5yZWdpc3RlckNvbnRyb2woJ2JveGVzUGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGJuLXNob3c9XFxcInNob3dGb3JtXFxcIj5cXG5cdDxmb3JtIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU3VibWl0XFxcIj5cXG5cdFx0PGRpdiBibi1jb250cm9sPVxcXCJicmFpbmpzLmlucHV0Z3JvdXBcXFwiPlxcblx0XHRcdDxsYWJlbD5OYW1lOjwvbGFiZWw+XFxuXHRcdFx0PGlucHV0IHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcIm5hbWVcXFwiIHJlcXVpcmVkPVxcXCJcXFwiIGF1dG9mb2N1cz1cXFwiXFxcIj5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXHRcdDxpbnB1dCB0eXBlPVxcXCJzdWJtaXRcXFwiIGhpZGRlbj1cXFwiXFxcIiBibi1iaW5kPVxcXCJzdWJtaXRcXFwiPlxcblx0PC9mb3JtPlxcblxcblx0PHA+U2VsZWN0IHRhcmdldCBmb2xkZXI6PC9wPlxcbjwvZGl2PlxcblxcbjxkaXYgY2xhc3M9XFxcInNjcm9sbFBhbmVsVHJlZVxcXCI+XFxuXHQ8ZGl2IFxcblx0XHRjbGFzcz1cXFwidHJlZVxcXCIgXFxuXHRcdGJuLWNvbnRyb2w9XFxcImJyYWluanMudHJlZVxcXCJcXG5cdFx0Ym4tZGF0YT1cXFwie3NvdXJjZTogbWFpbGJveGVzfVxcXCJcXG5cdFx0Ym4taWZhY2U9XFxcInRyZWVcXFwiXFxuXHQ+PC9kaXY+XFxuPC9kaXY+XFxuXFxuXFxuXCIsXG5cblx0ZGVwczogWydhcHAubWFpbHMnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHRcdGN1cnJlbnRBY2NvdW50OiAnJyxcblx0XHRzaG93Rm9ybTogZmFsc2Vcblx0fSxcblxuXHRpbml0OiBmdW5jdGlvbihlbHQsIHNydk1haWwsIHBhZ2VyKSB7XG5cblx0XHRjb25zdCB7Y3VycmVudEFjY291bnQsIHNob3dGb3JtfSA9IHRoaXMucHJvcHNcblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0bWFpbGJveGVzOiBbXSxcblx0XHRcdFx0c2hvd0Zvcm1cblx0XHRcdH0sXG5cdFx0XHRldmVudHM6IHtcblx0XHRcdFx0b25TdWJtaXQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdGNvbnN0IHtuYW1lfSA9ICQodGhpcykuZ2V0Rm9ybURhdGEoKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ29uU3VibWl0JywgbmFtZSlcblxuXHRcdFx0XHRcdGNvbnN0IHt0cmVlfSA9IGN0cmwuc2NvcGVcblx0XHRcdFx0XHRjb25zdCBub2RlID0gdHJlZS5nZXRBY3RpdmVOb2RlKClcblx0XHRcdFx0XHRpZiAobm9kZSA9PSBudWxsKSB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnV2FybmluZycsIGNvbnRlbnQ6ICdQbGVhc2Ugc2VsZWN0IGEgdGFyZ2V0IG1haWxib3gnfSlcblx0XHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRsZXQgdGFyZ2V0TmFtZSA9IHRyZWUuZ2V0Tm9kZVBhdGgobm9kZSkgKyAnLycgKyBuYW1lXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygndGFyZ2V0TmFtZScsIHRhcmdldE5hbWUpXG5cdFx0XHRcdFx0Y29uc3QgdG9rZW4gPSB0YXJnZXROYW1lLnNwbGl0KCcvJylcblx0XHRcdFx0XHR0b2tlbi5zaGlmdCgpXG5cdFx0XHRcdFx0dGFyZ2V0TmFtZSA9IHRva2VuLmpvaW4oJy8nKVxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ3RhcmdldE5hbWUnLCB0YXJnZXROYW1lKVxuXG5cblx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKHRhcmdldE5hbWUpXHRcdFx0XHRcdFxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSlcblxuXG5cdFx0ZnVuY3Rpb24gbG9hZE1haWxib3hlcygpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdsb2FkTWFpbGJveGVzJylcblx0XHRcdHNydk1haWwuZ2V0TWFpbGJveGVzKGN1cnJlbnRBY2NvdW50KS50aGVuKChtYWlsYm94ZXMpID0+IHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ21haWxib3hlcycsIG1haWxib3hlcylcblx0XHRcdFx0aWYgKHNob3dGb3JtKSB7XG5cdFx0XHRcdFx0Y3RybC5zZXREYXRhKHtcblx0XHRcdFx0XHRcdG1haWxib3hlczogW3tcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdGb2xkZXJzJyxcblx0XHRcdFx0XHRcdFx0Zm9sZGVyOiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRjaGlsZHJlbjogbWFpbGJveGVzLFxuXHRcdFx0XHRcdFx0XHRleHBhbmRlZDogdHJ1ZVxuXHRcdFx0XHRcdFx0fV1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdGN0cmwuc2V0RGF0YSh7XG5cdFx0XHRcdFx0XHRtYWlsYm94ZXNcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXHRcdH1cblxuXHRcdGxvYWRNYWlsYm94ZXMoKVxuXG5cdFx0dGhpcy5nZXRCdXR0b25zID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRhcHBseToge1xuXHRcdFx0XHRcdHRpdGxlOiAnQXBwbHknLFxuXHRcdFx0XHRcdGljb246ICdmYSBmYS1jaGVjaycsXG5cdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRpZiAoc2hvd0Zvcm0pIHtcblx0XHRcdFx0XHRcdFx0Y3RybC5zY29wZS5zdWJtaXQuY2xpY2soKVxuXHRcdFx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0XHRcdH1cblx0XHRcblx0XHRcdFx0XHRcdGNvbnN0IHt0cmVlfSA9IGN0cmwuc2NvcGVcblx0XHRcdFx0XHRcdGNvbnN0IG5vZGUgPSB0cmVlLmdldEFjdGl2ZU5vZGUoKVxuXHRcdFx0XHRcdFx0aWYgKG5vZGUgPT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnU2VsZWN0IFRhcmdldCBNYWlsYm94JywgY29udGVudDogJ1BsZWFzZSBzZWxlY3QgYSB0YXJnZXQgbWFpbGJveCd9KVxuXHRcdFx0XHRcdFx0XHRyZXR1cm5cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGNvbnN0IHRhcmdldE5hbWUgPSB0cmVlLmdldE5vZGVQYXRoKG5vZGUpXG5cdFx0XG5cdFx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKHRhcmdldE5hbWUpXG5cdFx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XHRcdFx0XHRcdFxuXHRcdH1cblxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCdtYWlsYm94UGFnZScsIHtcblxuXHR0ZW1wbGF0ZTogXCI8ZGl2IGNsYXNzPVxcXCJ0b29sYmFyXFxcIj5cXG5cdDxkaXY+XFxuXHRcdDxkaXYgYm4tc2hvdz1cXFwic2hvdzFcXFwiPlxcblx0XHRcdDxzcGFuID5QYWdlOiA8c3BhbiBibi10ZXh0PVxcXCJ0ZXh0MVxcXCI+PC9zcGFuPjwvc3Bhbj5cXG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJwcmV2aW91cyBwYWdlXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uUHJldlBhZ2VcXFwiPlxcblx0XHRcdFx0PGkgY2xhc3M9XFxcImZhIGZhLWFuZ2xlLWxlZnRcXFwiPjwvaT5cXG5cdFx0XHQ8L2J1dHRvbj5cdFx0XHRcXG5cdFx0XHQ8YnV0dG9uIGNsYXNzPVxcXCJ3My1idXR0b25cXFwiIHRpdGxlPVxcXCJuZXh0IHBhZ2VcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25OZXh0UGFnZVxcXCI+XFxuXHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtYW5nbGUtcmlnaHRcXFwiPjwvaT5cXG5cdFx0XHQ8L2J1dHRvbj5cdFx0XHRcXG5cdFx0PC9kaXY+XFxuXHRcdDxkaXYgYm4tc2hvdz1cXFwibG9hZGluZ1xcXCIgY2xhc3M9XFxcImxvYWRpbmdcXFwiPlxcblx0XHRcdDxpIGNsYXNzPVxcXCJmYSBmYS1zcGlubmVyIGZhLXB1bHNlXFxcIj48L2k+XFxuXHRcdFx0bG9hZGluZyAuLi5cXG5cdFx0PC9kaXY+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgY2xhc3M9XFxcIm5iTXNnXFxcIj48c3Ryb25nIGJuLXRleHQ9XFxcIm5iTXNnXFxcIj48L3N0cm9uZz4mbmJzcDtNZXNzYWdlczwvZGl2Plx0XHRcXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJzY3JvbGxQYW5lbFRhYmxlXFxcIj5cXG5cdDx0YWJsZSBjbGFzcz1cXFwidzMtdGFibGUtYWxsIHczLWhvdmVyYWJsZSB3My1zbWFsbFxcXCI+XFxuXHRcdDx0aGVhZD5cXG5cdFx0XHQ8dHIgY2xhc3M9XFxcInczLWdyZWVuXFxcIj5cXG5cdFx0XHRcdDx0aD48aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGJuLWV2ZW50PVxcXCJjbGljazogb25NYWluQ2hlY2tCb3hDbGlja1xcXCIgYm4tdmFsPVxcXCJjaGVja1xcXCIgYm4tdXBkYXRlPVxcXCJjbGlja1xcXCI+PC90aD5cXG5cdFx0XHRcdDx0aCBibi1zaG93PVxcXCIhaXNTZW50Qm94XFxcIj5Gcm9tPC90aD5cXG5cdFx0XHRcdDx0aCBibi1zaG93PVxcXCJpc1NlbnRCb3hcXFwiPlRvPC90aD5cXG5cdFx0XHRcdDx0aD5TdWJqZWN0PC90aD5cXG5cdFx0XHRcdDx0aCB0aXRsZT1cXFwibmIgQXR0YWNobWVudHNcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1wYXBlcmNsaXBcXFwiPjwvaT48L3RoPlxcblx0XHRcdFx0PHRoPkRhdGU8L3RoPlxcblx0XHRcdDwvdHI+XFxuXHRcdDwvdGhlYWQ+XFxuXHRcdDx0Ym9keSBibi1lYWNoPVxcXCJtZXNzYWdlc1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLml0ZW06IG9uSXRlbUNsaWNrXFxcIj5cXG5cdFx0XHQ8dHIgYm4tY2xhc3M9XFxcInt1bnNlZW46ICFpc1NlZW59XFxcIj5cXG5cdFx0XHRcdDx0aD48aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGNsYXNzPVxcXCJjaGVja1xcXCIgPjwvdGg+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLmZyb20ubmFtZVxcXCIgYm4tYXR0cj1cXFwie3RpdGxlOiAkc2NvcGUuJGkuZnJvbS5lbWFpbH1cXFwiIGJuLXNob3c9XFxcIiFpc1NlbnRCb3hcXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwidGV4dDJcXFwiIGJuLWF0dHI9XFxcImF0dHIxXFxcIiBibi1zaG93PVxcXCJpc1NlbnRCb3hcXFwiPjwvdGQ+XFxuXHRcdFx0XHQ8dGQgYm4tdGV4dD1cXFwiJHNjb3BlLiRpLnN1YmplY3RcXFwiIGNsYXNzPVxcXCJpdGVtXFxcIiA+PC90ZD5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCIkc2NvcGUuJGkubmJBdHRhY2htZW50c1xcXCI+PC90ZD5cXG5cdFx0XHRcdDx0ZCBibi10ZXh0PVxcXCJnZXREYXRlXFxcIj48L3RkPlxcblx0XHRcdDwvdHI+XFxuXHRcdDwvdGJvZHk+XFxuXHQ8L3RhYmxlPlxcbjwvZGl2PlxcblxcblxcblwiLFxuXG5cdGRlcHM6IFsnYXBwLm1haWxzJywgJ2JyZWl6Ym90LnBhZ2VyJ10sXG5cblx0cHJvcHM6IHtcblx0XHRjdXJyZW50QWNjb3VudDogJycsXG5cdFx0bWFpbGJveE5hbWU6ICcnXG5cdH0sXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBzcnZNYWlsLCBwYWdlcikge1xuXG5cdFx0Y29uc3Qge2N1cnJlbnRBY2NvdW50LCBtYWlsYm94TmFtZX0gPSB0aGlzLnByb3BzXG5cblx0XHRjb25zdCBjdHJsID0gJCQudmlld0NvbnRyb2xsZXIoZWx0LCB7XG5cdFx0XHRkYXRhOiB7XG5cdFx0XHRcdG1lc3NhZ2VzOiBbXSxcblx0XHRcdFx0bmJNc2c6IDAsXG5cdFx0XHRcdHBhZ2VObzogMCxcblx0XHRcdFx0bmJQYWdlOiAwLFxuXHRcdFx0XHRjaGVjazogZmFsc2UsXG5cdFx0XHRcdGxvYWRpbmc6IGZhbHNlLFxuXHRcdFx0XHRtYWlsYm94TmFtZSxcblx0XHRcdFx0c2hvdzE6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiAhdGhpcy5sb2FkaW5nICYmIHRoaXMubmJNc2cgPiAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHRleHQxOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gYCR7dGhpcy5wYWdlTm99IC8gJHt0aGlzLm5iUGFnZX1gXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHRleHQyOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiBzY29wZS4kaS50b1swXSAmJiBzY29wZS4kaS50b1swXS5uYW1lXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGF0dHIxOiBmdW5jdGlvbihzY29wZSkge1xuXHRcdFx0XHRcdHJldHVybiB7dGl0bGU6IHNjb3BlLiRpLnRvWzBdICYmIHNjb3BlLiRpLnRvWzBdLmVtYWlsfVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdGdldERhdGU6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZ2V0RGF0ZScsIGRhdGUpXG5cdFx0XHRcdFx0Y29uc3QgZGF0ZSA9IHNjb3BlLiRpLmRhdGVcblx0XHRcdFx0XHRjb25zdCBkID0gbmV3IERhdGUoZGF0ZSlcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKCdkJywgZClcblx0XHRcdFx0XHRyZXR1cm4gZC50b0xvY2FsZURhdGVTdHJpbmcoJ2ZyLUZSJylcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRpc1NlZW46IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLiRpLmZsYWdzLmluY2x1ZGVzKCdcXFxcU2VlbicpXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0aXNTZW50Qm94OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5tYWlsYm94TmFtZSA9PSAnU2VudCdcblx0XHRcdFx0fVxuXG5cdFx0XHR9LFxuXHRcdFx0ZXZlbnRzOiB7XG5cdFx0XHRcdG9uSXRlbUNsaWNrOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdC8vICQodGhpcykuY2xvc2VzdCgndGJvZHknKS5maW5kKCd0cicpLnJlbW92ZUNsYXNzKCd3My1ibHVlJylcblx0XHRcdFx0XHQvLyAkKHRoaXMpLmFkZENsYXNzKCd3My1ibHVlJylcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuaW5kZXgoKVxuXHRcdFx0XHRcdGNvbnN0IGl0ZW0gPSBjdHJsLm1vZGVsLm1lc3NhZ2VzW2lkeF1cblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnbWVzc2FnZVBhZ2UnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogYE1lc3NhZ2UgIyR7Y3RybC5tb2RlbC5uYk1zZyAtIGl0ZW0uc2Vxbm8gKyAxfWAsXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRjdXJyZW50QWNjb3VudCxcblx0XHRcdFx0XHRcdFx0bWFpbGJveE5hbWUsXG5cdFx0XHRcdFx0XHRcdGl0ZW1cdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdG9uQmFjazogbG9hZFxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0b25NYWluQ2hlY2tCb3hDbGljazogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRlbHQuZmluZCgnLmNoZWNrJykucHJvcCgnY2hlY2tlZCcsICQodGhpcykucHJvcCgnY2hlY2tlZCcpKVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdG9uUHJldlBhZ2U6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3Qge25iUGFnZSwgcGFnZU5vfSA9IGN0cmwubW9kZWxcblxuXHRcdFx0XHRcdGlmIChwYWdlTm8gPiAxKSB7XG5cdFx0XHRcdFx0XHRsb2FkKHBhZ2VObyAtIDEpXG5cdFx0XHRcdFx0fVx0XHRcdFx0XHRcblx0XHRcdFx0fSxcblxuXHRcdFx0XHRvbk5leHRQYWdlOiBmdW5jdGlvbihldikge1xuXHRcdFx0XHRcdGNvbnN0IHtuYlBhZ2UsIHBhZ2VOb30gPSBjdHJsLm1vZGVsXG5cblx0XHRcdFx0XHRpZiAocGFnZU5vIDwgbmJQYWdlKSB7XG5cdFx0XHRcdFx0XHRsb2FkKHBhZ2VObyArIDEpXG5cdFx0XHRcdFx0fVx0XHRcdFx0XG5cdFx0XHRcdH1cdFx0XHRcdFxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRmdW5jdGlvbiBsb2FkKHBhZ2VObykge1xuXHRcdFx0aWYgKHBhZ2VObyA9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cGFnZU5vID0gY3RybC5tb2RlbC5wYWdlTm9cblx0XHRcdH1cblxuXHRcdFx0Y3RybC5zZXREYXRhKHtsb2FkaW5nOiB0cnVlfSlcblxuXHRcdFx0c3J2TWFpbC5vcGVuTWFpbGJveChjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIHBhZ2VObykudGhlbigoZGF0YSkgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZGF0YScsIGRhdGEpXG5cdFx0XHRcdGNvbnN0IHttZXNzYWdlcywgbmJNc2d9ID0gZGF0YVxuXHRcdFx0XHRjdHJsLnNldERhdGEoe1xuXHRcdFx0XHRcdGxvYWRpbmc6IGZhbHNlLFxuXHRcdFx0XHRcdGNoZWNrOiBmYWxzZSxcblx0XHRcdFx0XHRwYWdlTm8sXG5cdFx0XHRcdFx0bmJQYWdlOiBNYXRoLmNlaWwobmJNc2cgLyAyMCksXG5cdFx0XHRcdFx0bmJNc2csXG5cdFx0XHRcdFx0bWVzc2FnZXM6IG1lc3NhZ2VzLnJldmVyc2UoKVxuXHRcdFx0XHR9KVxuXHRcdFx0fSlcdFx0XHRcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRTZXFOb3MoKSB7XG5cdFx0XHRjb25zdCBpdGVtcyA9IGVsdC5maW5kKCcuY2hlY2s6Y2hlY2tlZCcpXG5cdFx0XHRjb25zdCBzZXFOb3MgPSBbXVxuXHRcdFx0aXRlbXMuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmluZGV4KClcblx0XHRcdFx0c2VxTm9zLnB1c2goY3RybC5tb2RlbC5tZXNzYWdlc1tpZHhdLnNlcW5vKVxuXHRcdFx0fSlcblx0XHRcdGNvbnNvbGUubG9nKCdzZXFOb3MnLCBzZXFOb3MpXG5cdFx0XHRyZXR1cm4gc2VxTm9zXG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZGVsZXRlTWVzc2FnZSgpIHtcblx0XHRcdGNvbnN0IHNlcU5vcyA9IGdldFNlcU5vcygpXG5cdFx0XHRpZiAoc2VxTm9zLmxlbmd0aCA9PSAwKSB7XG5cdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdEZWxldGUgTWVzc2FnZScsIGNvbnRlbnQ6ICdQbGVhc2Ugc2VsZWN0IG9uZSBvciBzZXZlcmFsbCBtZXNzYWdlcyAhJ30pXG5cdFx0XHRcdHJldHVyblxuXHRcdFx0fVxuXG5cdFx0XHRzcnZNYWlsLmRlbGV0ZU1lc3NhZ2UoY3VycmVudEFjY291bnQsIG1haWxib3hOYW1lLCBzZXFOb3MpLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnTWVzc2FnZXMgZGVsZXRlZCcpXG5cdFx0XHRcdGxvYWQoKVxuXHRcdFx0fSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBtb3ZlTWVzc2FnZSgpIHtcblx0XHRcdGNvbnN0IHNlcU5vcyA9IGdldFNlcU5vcygpXG5cdFx0XHRpZiAoc2VxTm9zLmxlbmd0aCA9PSAwKSB7XG5cdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdNb3ZlIE1lc3NhZ2UnLCBjb250ZW50OiAnUGxlYXNlIHNlbGVjdCBvbmUgb3Igc2V2ZXJhbGwgbWVzc2FnZXMgISd9KVxuXHRcdFx0XHRyZXR1cm5cblx0XHRcdH1cblxuXHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JveGVzUGFnZScsIHtcblx0XHRcdFx0dGl0bGU6ICdTZWxlY3QgdGFyZ2V0IG1haWxib3gnLFxuXHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdGN1cnJlbnRBY2NvdW50XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uUmV0dXJuOiBmdW5jdGlvbih0YXJnZXROYW1lKSB7XG5cdFx0XHRcdFx0aWYgKHRhcmdldE5hbWUgPT0gbWFpbGJveE5hbWUpIHtcblx0XHRcdFx0XHRcdCQkLnVpLnNob3dBbGVydCh7dGl0bGU6ICdTZWxlY3QgVGFyZ2V0IE1haWxib3gnLCBjb250ZW50OiAnVGFyZ2V0IG1haWxib3ggbXVzdCBiZSBkaWZmZXJlbnQgZnJvbSBjdXJyZW50IG1haWxib3gnfSlcblx0XHRcdFx0XHRcdHJldHVyblxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHNydk1haWwubW92ZU1lc3NhZ2UoY3VycmVudEFjY291bnQsIG1haWxib3hOYW1lLCB0YXJnZXROYW1lLCBzZXFOb3MpXG5cdFx0XHRcdFx0LnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0bG9hZCgpXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fVxuXHRcdFx0fSlcblx0XHRcdC8vIHNydk1haWwuZGVsZXRlTWVzc2FnZShjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIHNlcU5vcykudGhlbigoKSA9PiB7XG5cdFx0XHQvLyBcdGNvbnNvbGUubG9nKCdNZXNzYWdlcyBkZWxldGVkJylcblx0XHRcdC8vIFx0bG9hZCgpXG5cdFx0XHQvLyB9KVxuXHRcdH1cdFx0XG5cblx0XHRsb2FkKDEpXG5cblx0XHRmdW5jdGlvbiBuZXdNZXNzYWdlKCkge1xuXHRcdFx0cGFnZXIucHVzaFBhZ2UoJ3dyaXRlTWFpbFBhZ2UnLCB7XG5cdFx0XHRcdHRpdGxlOiAnTmV3IE1lc3NhZ2UnLFxuXHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdGFjY291bnROYW1lOiBjdXJyZW50QWNjb3VudFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblJldHVybjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0aWYgKG1haWxib3hOYW1lID09ICdTZW50Jykge1xuXHRcdFx0XHRcdFx0bG9hZCgpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KVx0XHRcdFxuXHRcdH1cblxuXHRcdHRoaXMuZ2V0QnV0dG9ucyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0cmVsb2FkOiB7XG5cdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLXN5bmMtYWx0Jyxcblx0XHRcdFx0XHR0aXRsZTogJ1VwZGF0ZScsXG5cdFx0XHRcdFx0b25DbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRsb2FkKDEpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRuZXdNYWlsOiB7XG5cdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLWVudmVsb3BlJyxcblx0XHRcdFx0XHR0aXRsZTogJ05ldyBNZXNzYWdlJyxcblx0XHRcdFx0XHRvbkNsaWNrOiBuZXdNZXNzYWdlXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG1vdmU6IHtcblx0XHRcdFx0XHRpY29uOiAnZmEgZmEtZmlsZS1leHBvcnQnLFxuXHRcdFx0XHRcdHRpdGxlOiAnTW92ZSBzZWxlY3RlZCBtZXNzYWdlcycsXG5cdFx0XHRcdFx0b25DbGljazogbW92ZU1lc3NhZ2Vcblx0XHRcdFx0fSxcblx0XHRcdFx0ZGVsZXRlOiB7XG5cdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLXRyYXNoJyxcblx0XHRcdFx0XHR0aXRsZTogJ0RlbGV0ZSBzZWxlY3RlZCBtZXNzYWdlcycsXG5cdFx0XHRcdFx0b25DbGljazogZGVsZXRlTWVzc2FnZVxuXHRcdFx0XHR9XHRcblx0XHRcdH1cdFxuXHRcdFx0XHRcblx0XHR9XG5cblx0fVxuXG5cbn0pO1xuXG5cblxuXG4iLCIkJC5jb250cm9sLnJlZ2lzdGVyQ29udHJvbCgnbWVzc2FnZVBhZ2UnLCB7XG5cblx0dGVtcGxhdGU6IFwiPGRpdiBibi1zaG93PVxcXCJsb2FkaW5nXFxcIiBjbGFzcz1cXFwibG9hZGluZ1xcXCI+XFxuXHQ8aSBjbGFzcz1cXFwiZmEgZmEtc3Bpbm5lciBmYS1wdWxzZVxcXCI+PC9pPlxcblx0bG9hZGluZyAuLi5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJoZWFkZXIgdzMtYmx1ZVxcXCIgYm4tc2hvdz1cXFwiIWxvYWRpbmdcXFwiPlxcblx0PGRpdiBjbGFzcz1cXFwiZnJvbVxcXCI+PHN0cm9uZz5Gcm9tOjwvc3Ryb25nPjxhIGhyZWY9XFxcIiNcXFwiIGJuLXRleHQ9XFxcIml0ZW0uZnJvbS5uYW1lXFxcIiBibi1ldmVudD1cXFwiY2xpY2s6IG9uQWRkQ29udGFjdFxcXCIgYm4tZGF0YT1cXFwie2FkZHI6IGl0ZW0uZnJvbX1cXFwiPjwvYT48L2Rpdj5cXG5cdDxkaXYgY2xhc3M9XFxcInN1YmplY3RcXFwiPjxzdHJvbmc+U3ViamVjdDo8L3N0cm9uZz48c3BhbiBibi10ZXh0PVxcXCJpdGVtLnN1YmplY3RcXFwiID48L3NwYW4+PC9kaXY+XFxuXHQ8ZGl2IGJuLXNob3c9XFxcInNob3cxXFxcIiBjbGFzcz1cXFwidG9cXFwiPlxcblx0XHQ8c3Ryb25nIGJuLWV2ZW50PVxcXCJjbGljazogb25Ub2dnbGVEaXZcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1jYXJldC1kb3duIGZhLWZ3XFxcIj48L2k+XFxuXHRcdFRvPC9zdHJvbmc+XFxuXHRcdDx1bCBibi1lYWNoPVxcXCJpdGVtLnRvXFxcIiBibi1ldmVudD1cXFwiY2xpY2suY29udGFjdDogb25BZGRDb250YWN0XFxcIj5cXG5cdFx0XHQ8bGk+XFxuXHRcdFx0XHQ8YSBocmVmPVxcXCIjXFxcIiBibi10ZXh0PVxcXCIkc2NvcGUuJGkubmFtZVxcXCIgY2xhc3M9XFxcImNvbnRhY3RcXFwiPjwvYT5cdFx0XHRcdFxcblx0XHRcdDwvbGk+XFxuXHRcdDwvdWw+XFxuXHQ8L2Rpdj5cXG5cdDxkaXYgY2xhc3M9XFxcImF0dGFjaG1lbnRzXFxcIiBibi1zaG93PVxcXCJzaG93MlxcXCI+XFxuXHRcdDxzdHJvbmcgYm4tZXZlbnQ9XFxcImNsaWNrOiBvblRvZ2dsZURpdlxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWNhcmV0LWRvd24gZmEtZndcXFwiPjwvaT5cXG5cdFx0QXR0YWNobWVudHM8L3N0cm9uZz5cXG5cdFx0PHVsICBibi1lYWNoPVxcXCJhdHRhY2htZW50c1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrLml0ZW06IG9wZW5BdHRhY2htZW50XFxcIj5cXG5cdFx0XHQ8bGk+XFxuXHRcdFx0XHQ8YSBocmVmPVxcXCIjXFxcIiBibi10ZXh0PVxcXCIkc2NvcGUuJGkubmFtZVxcXCIgY2xhc3M9XFxcIml0ZW1cXFwiPjwvYT5cXG5cdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcImdldFNpemVcXFwiPjwvc3Bhbj5cXG5cdFx0XHQ8L2xpPlxcblx0XHQ8L3VsPlxcblx0PC9kaXY+XFxuXHRcXG48L2Rpdj5cXG5cXG48ZGl2IGNsYXNzPVxcXCJtYWluSHRtbFxcXCIgYm4tc2hvdz1cXFwic2hvdzRcXFwiPlxcblx0PGRpdiBibi1zaG93PVxcXCJzaG93M1xcXCIgY2xhc3M9XFxcImVtYmVkZGVkSW1hZ2VzIHczLXBhbGUteWVsbG93XFxcIj5cXG5cdFx0PGEgaHJlZj1cXFwiI1xcXCIgYm4tZXZlbnQ9XFxcImNsaWNrOiBvbkVtYmVkZGVkSW1hZ2VzXFxcIj5Eb3dubG9hZCBlbWJlZGRlZCBpbWFnZXM8L2E+XFxuXHQ8L2Rpdj5cXG5cdDxpZnJhbWUgYm4tYXR0cj1cXFwie3NyY2RvYzp0ZXh0fVxcXCIgYm4tYmluZD1cXFwiaWZyYW1lXFxcIiBibi1ldmVudD1cXFwibG9hZDogb25GcmFtZUxvYWRlZFxcXCI+PC9pZnJhbWU+XFxuPC9kaXY+XFxuXFxuPGRpdiBjbGFzcz1cXFwibWFpblRleHRcXFwiIGJuLXNob3c9XFxcInNob3c1XFxcIj5cXG4gXHQ8cHJlIGJuLXRleHQ9XFxcInRleHRcXFwiPjwvcHJlPlxcbjwvZGl2PlwiLFxuXG5cdGRlcHM6IFsnYXBwLm1haWxzJywgJ2JyZWl6Ym90LnNjaGVkdWxlcicsICdicmVpemJvdC5wYWdlcicsICdicmVpemJvdC5maWxlcyddLFxuXG5cdHByb3BzOiB7XG5cdFx0Y3VycmVudEFjY291bnQ6ICcnLFxuXHRcdG1haWxib3hOYW1lOiAnJyxcblx0XHRpdGVtOiBudWxsXG5cdH0sXG5cblx0aW5pdDogZnVuY3Rpb24oZWx0LCBzcnZNYWlsLCBzY2hlZHVsZXIsIHBhZ2VyLCBzcnZGaWxlcykge1xuXG5cdFx0Y29uc3Qge2N1cnJlbnRBY2NvdW50LCBtYWlsYm94TmFtZSwgaXRlbX0gPSB0aGlzLnByb3BzXG5cblxuXHRcdGNvbnN0IHdhaXREbGcgPSAkJC5kaWFsb2dDb250cm9sbGVyKHtcblx0XHRcdHRpdGxlOiAnTG9hZGluZyAuLi4nLFxuXHRcdFx0dGVtcGxhdGU6IGA8ZGl2IGNsYXNzPVwidzMtY2VudGVyIHczLXBhZGRpbmctMTZcIj48aSBjbGFzcz1cImZhIGZhLXJlZG8tYWx0IGZhLTJ4IGZhLXB1bHNlIHczLXRleHQtYmx1ZVwiPjwvaT48L2Rpdj5gLFxuXHRcdFx0d2lkdGg6IDEwMCxcblx0XHRcdGNhbkNsb3NlOiBmYWxzZVxuXHRcdH0pXG5cblxuXHRcdGNvbnN0IGN0cmwgPSAkJC52aWV3Q29udHJvbGxlcihlbHQsIHtcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0ZW1iZWRkZWRJbWFnZXM6IFtdLFxuXHRcdFx0XHRpc0h0bWw6IGZhbHNlLFxuXHRcdFx0XHRsb2FkaW5nOiB0cnVlLFxuXHRcdFx0XHR0ZXh0OiAnJyxcblx0XHRcdFx0aXRlbSxcblx0XHRcdFx0YXR0YWNobWVudHM6IFtdLFxuXHRcdFx0XHRzaG93MTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuaXRlbS50by5sZW5ndGggPiAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3cyOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5hdHRhY2htZW50cy5sZW5ndGggPiAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3czOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5lbWJlZGRlZEltYWdlcy5sZW5ndGggPiAwXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNob3c0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gIXRoaXMubG9hZGluZyAmJiB0aGlzLmlzSHRtbFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRzaG93NTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuICF0aGlzLmxvYWRpbmcgJiYgIXRoaXMuaXNIdG1sXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldFNpemU6IGZ1bmN0aW9uKHNjb3BlKSB7XG5cdFx0XHRcdFx0bGV0IHNpemUgPSBzY29wZS4kaS5zaXplXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZygnZ2V0U2l6ZScsIHNpemUpXG5cdFx0XHRcdFx0c2l6ZSAvPSAxMDI0XG5cdFx0XHRcdFx0bGV0IHVuaXQgPSAnS28nXG5cdFx0XHRcdFx0aWYgKHNpemUgPiAxMDI0KSB7XG5cdFx0XHRcdFx0XHRzaXplIC89IDEwMjRcblx0XHRcdFx0XHRcdHVuaXQgPSAnTW8nXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0cmV0dXJuIGAgKCR7c2l6ZS50b0ZpeGVkKDEpfSAke3VuaXR9KWBcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvcGVuQXR0YWNobWVudDogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCdsaScpLmluZGV4KClcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gY3RybC5tb2RlbC5hdHRhY2htZW50c1tpZHhdXG5cdFx0XHRcdFx0Y29uc3Qge3BhcnRJRCwgdHlwZSwgc3VidHlwZX0gPSBpbmZvXG5cblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb3BlbkF0dGFjaG1lbnRzJywgaW5mbylcblxuXHRcdFx0XHRcdGlmIChpbmZvLmNhbk9wZW4pIHtcblx0XHRcdFx0XHRcdHdhaXREbGcuc2hvdygpXG5cdFx0XHRcdFx0XHRzcnZNYWlsLm9wZW5BdHRhY2htZW50KGN1cnJlbnRBY2NvdW50LCBtYWlsYm94TmFtZSwgaXRlbS5zZXFubywgcGFydElEKS50aGVuKChtZXNzYWdlKSA9PiB7XG5cdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ21lc3NhZ2UnLCBtZXNzYWdlKVxuXHRcdFx0XHRcdFx0XHR3YWl0RGxnLmhpZGUoKVxuXHRcdFx0XHRcdFx0XHRjb25zdCB1cmwgPSBgZGF0YToke3R5cGV9LyR7c3VidHlwZX07YmFzZTY0LGAgKyBtZXNzYWdlLmRhdGFcblx0XHRcdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2JyZWl6Ym90LnZpZXdlcicsIHtcblx0XHRcdFx0XHRcdFx0XHR0aXRsZTogaW5mby5uYW1lLFxuXHRcdFx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0eXBlOiAkJC51dGlsLmdldEZpbGVUeXBlKGluZm8ubmFtZSksXG5cdFx0XHRcdFx0XHRcdFx0XHR1cmxcdFxuXHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0YnV0dG9uczoge1xuXHRcdFx0XHRcdFx0XHRcdFx0c2F2ZToge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ1NhdmUnLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpY29uOiAnZmEgZmEtc2F2ZScsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdG9uQ2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IGJsb2IgPSAkJC51dGlsLmRhdGFVUkx0b0Jsb2IodXJsKVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHNydkZpbGVzLnVwbG9hZEZpbGUoYmxvYiwgaW5mby5uYW1lLCAnL2FwcHMvZW1haWwnKS50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcClcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoKVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0pXHRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24ocmVzcCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0JCQudWkuc2hvd0FsZXJ0KHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGl0bGU6ICdFcnJvcicsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnRlbnQ6IHJlc3AucmVzcG9uc2VUZXh0XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0pXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH0sXHRcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdH0pXHRcdFxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0fSlcdFx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0JCQudWkuc2hvd0NvbmZpcm0oe1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ09wZW4gQXR0YWNobWVudCcsIFxuXHRcdFx0XHRcdFx0XHRva1RleHQ6ICdZZXMnLFxuXHRcdFx0XHRcdFx0XHRjYW5jZWxUZXh0OiAnTm8nLFxuXHRcdFx0XHRcdFx0XHRjb250ZW50OiBgVGhpcyBhdHRhY2htZW50IGNhbm5vdCBiZSBvcGVuIHdpdGggTmV0T1M8YnI+XG5cdFx0XHRcdFx0XHRcdFx0RG8geW91IHdhbnQgdG8gZG93bmxvYWQgaXQgP2Bcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ09LJylcblx0XHRcdFx0XHRcdFx0XHR3YWl0RGxnLnNob3coKVxuXHRcdFx0XHRcdFx0XHRcdHNydk1haWwub3BlbkF0dGFjaG1lbnQoY3VycmVudEFjY291bnQsIG1haWxib3hOYW1lLCBpdGVtLnNlcW5vLCBwYXJ0SUQpLnRoZW4oKG1lc3NhZ2UpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRcdC8vY29uc29sZS5sb2coJ21lc3NhZ2UnLCBtZXNzYWdlKVxuXHRcdFx0XHRcdFx0XHRcdFx0d2FpdERsZy5oaWRlKClcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IHVybCA9IGBkYXRhOiR7dHlwZX0vJHtzdWJ0eXBlfTtiYXNlNjQsYCArIG1lc3NhZ2UuZGF0YVxuXHRcdFx0XHRcdFx0XHRcdFx0JCQudXRpbC5kb3dubG9hZFVybCh1cmwsIGluZm8ubmFtZSlcblxuXHRcdFx0XHRcdFx0XHRcdH0pXG5cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblRvZ2dsZURpdjogZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25BdHRhY2hDbGljaycpXG5cdFx0XHRcdFx0Y29uc3QgJGkgPSAkKHRoaXMpLmZpbmQoJ2knKVxuXHRcdFx0XHRcdGNvbnN0ICR1bCA9ICQodGhpcykuc2libGluZ3MoJ3VsJylcblx0XHRcdFx0XHRpZiAoJGkuaGFzQ2xhc3MoJ2ZhLWNhcmV0LXJpZ2h0JykpIHtcblx0XHRcdFx0XHRcdCRpLnJlbW92ZUNsYXNzKCdmYS1jYXJldC1yaWdodCcpLmFkZENsYXNzKCdmYS1jYXJldC1kb3duJylcblx0XHRcdFx0XHRcdCR1bC5zbGlkZURvd24oKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdCRpLnJlbW92ZUNsYXNzKCdmYS1jYXJldC1kb3duJykuYWRkQ2xhc3MoJ2ZhLWNhcmV0LXJpZ2h0JylcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdCR1bC5zbGlkZVVwKClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uRW1iZWRkZWRJbWFnZXM6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdC8vY3RybC5zZXREYXRhKHtlbWJlZGRlZEltYWdlczogW119KVxuXHRcdFx0XHRcdGNvbnN0ICRpZnJhbWUgPSAkKGN0cmwuc2NvcGUuaWZyYW1lLmdldCgwKS5jb250ZW50V2luZG93LmRvY3VtZW50KVxuXG5cdFx0XHRcdFx0Y29uc3Qge2VtYmVkZGVkSW1hZ2VzfSA9IGN0cmwubW9kZWxcblx0XHRcdFx0XHRjdHJsLnNldERhdGEoe2VtYmVkZGVkSW1hZ2VzOiBbXX0pXG5cblx0XHRcdFx0XHRlbWJlZGRlZEltYWdlcy5mb3JFYWNoKChlKSA9PiB7XG5cdFx0XHRcdFx0XHRjb25zdCB7dHlwZSwgc3VidHlwZSwgcGFydElELCBjaWR9ID0gZVxuXHRcdFx0XHRcdFx0c3J2TWFpbC5vcGVuQXR0YWNobWVudChjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIGl0ZW0uc2Vxbm8sIHBhcnRJRCkudGhlbigobWVzc2FnZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRjb25zdCB1cmwgPSBgZGF0YToke3R5cGV9LyR7c3VidHlwZX07YmFzZTY0LGAgKyBtZXNzYWdlLmRhdGFcblx0XHRcdFx0XHRcdFx0Y29uc3QgJGltZyA9ICRpZnJhbWUuZmluZChgaW1nW3NyYz1cImNpZDoke2NpZH1cIl1gKVxuXHRcdFx0XHRcdFx0XHQkaW1nLmF0dHIoJ3NyYycsIHVybClcblxuXHRcdFx0XHRcdFx0fSlcdFx0XHRcdFx0XG5cblx0XHRcdFx0XHR9KVxuXG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uRnJhbWVMb2FkZWQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uRnJhbWVMb2FkZWQnKVxuXHRcdFx0XHRcdGNvbnN0ICRpZnJhbWUgPSAkKHRoaXMuY29udGVudFdpbmRvdy5kb2N1bWVudClcblx0XHRcdFx0XHQkaWZyYW1lLmZpbmQoJ2EnKVxuXHRcdFx0XHRcdC5hdHRyKCd0YXJnZXQnLCAnX2JsYW5rJylcblx0XHRcdFx0XHQub24oJ2NsaWNrJywgZnVuY3Rpb24oZXYpIHtcblx0XHRcdFx0XHRcdGNvbnN0IGhyZWYgPSAkKHRoaXMpLmF0dHIoJ2hyZWYnKVxuXHRcdFx0XHRcdFx0aWYgKGhyZWYuc3RhcnRzV2l0aCgnaHR0cHM6Ly95b3V0dS5iZS8nKSkge1xuXHRcdFx0XHRcdFx0XHRldi5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHRcdFx0XHRcdHNjaGVkdWxlci5vcGVuQXBwKCd5b3V0dWJlJywge3VybDogaHJlZn0pXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkFkZENvbnRhY3Q6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uQWRkQ29udGFjdCcpXG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdGNvbnN0IHtpdGVtfSA9IGN0cmwubW9kZWxcblx0XHRcdFx0XHRjb25zdCBpZHggPSAkKHRoaXMpLmNsb3Nlc3QoJ2xpJykuaW5kZXgoKVxuXHRcdFx0XHRcdGxldCBmcm9tID0gKGlkeCA8IDApID8gaXRlbS5mcm9tIDogaXRlbS50b1tpZHhdXG5cdFx0XHRcdFx0cGFnZXIucHVzaFBhZ2UoJ2FkZENvbnRhY3RQYWdlJywge1xuXHRcdFx0XHRcdFx0dGl0bGU6ICdBZGQgQ29udGFjdCcsXG5cdFx0XHRcdFx0XHRwcm9wczoge1xuXHRcdFx0XHRcdFx0XHRmcm9tXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pXG5cblx0XHRsZXQgcGFydElEID0gaXRlbS5wYXJ0SUQuaHRtbFxuXHRcdGxldCBpc0h0bWwgPSB0cnVlXG5cdFx0aWYgKHBhcnRJRCA9PSBmYWxzZSkge1xuXHRcdFx0cGFydElEID0gaXRlbS5wYXJ0SUQudGV4dFxuXHRcdFx0aXNIdG1sID0gZmFsc2Vcblx0XHR9XG5cdFx0Y29uc29sZS5sb2coJ2lzSHRtbCcsIGlzSHRtbClcblxuXG5cdFx0c3J2TWFpbC5vcGVuTWVzc2FnZShjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIGl0ZW0uc2Vxbm8sIHBhcnRJRCkudGhlbigobWVzc2FnZSkgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coJ21lc3NhZ2UnLCBtZXNzYWdlKVxuXG5cblx0XHRcdGNvbnN0IHt0ZXh0LCBhdHRhY2htZW50cywgZW1iZWRkZWRJbWFnZXN9ID0gbWVzc2FnZVxuXG5cdFx0XHRhdHRhY2htZW50cy5mb3JFYWNoKChhKSA9PiB7XG5cdFx0XHRcdGEuY2FuT3BlbiA9ICQkLnV0aWwuZ2V0RmlsZVR5cGUoYS5uYW1lKSAhPSB1bmRlZmluZWQgJiYgYS5lbmNvZGluZy50b1VwcGVyQ2FzZSgpID09ICdCQVNFNjQnXG5cblx0XHRcdH0pXG5cblxuXHRcdFx0Y3RybC5zZXREYXRhKHt0ZXh0LCBhdHRhY2htZW50cywgZW1iZWRkZWRJbWFnZXMsIGxvYWRpbmc6ZmFsc2UsIGlzSHRtbH0pXG5cblx0XHR9KVxuXG5cdFx0ZnVuY3Rpb24gcmVwbHlNZXNzYWdlKHRleHQsIHRvKSB7XG5cdFx0XHQvL2NvbnNvbGUubG9nKCdyZXBseU1lc3NhZ2UnLCB0ZXh0KVxuXHRcdFx0cGFnZXIucHVzaFBhZ2UoJ3dyaXRlTWFpbFBhZ2UnLCB7XG5cdFx0XHRcdHRpdGxlOiAnUmVwbHkgbWVzc2FnZScsXG5cdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0YWNjb3VudE5hbWU6IGN1cnJlbnRBY2NvdW50LFxuXHRcdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRcdHRvLFxuXHRcdFx0XHRcdFx0c3ViamVjdDogJ1JlOiAnICsgaXRlbS5zdWJqZWN0LFxuXHRcdFx0XHRcdFx0aHRtbDogYDxwcmU+JHt0ZXh0fTwvcHJlPmBcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pXHRcdFx0XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gZm9yd2FyZE1lc3NhZ2UodGV4dCkge1xuXHRcdFx0Ly9jb25zb2xlLmxvZygncmVwbHlNZXNzYWdlJywgdGV4dClcblx0XHRcdHBhZ2VyLnB1c2hQYWdlKCd3cml0ZU1haWxQYWdlJywge1xuXHRcdFx0XHR0aXRsZTogJ0ZvcndhcmQgbWVzc2FnZScsXG5cdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0YWNjb3VudE5hbWU6IGN1cnJlbnRBY2NvdW50LFxuXHRcdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRcdHN1YmplY3Q6ICdGd2Q6ICcgKyBpdGVtLnN1YmplY3QsXG5cdFx0XHRcdFx0XHRodG1sOiBgPHByZT4ke3RleHR9PC9wcmU+YFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSlcdFx0XHRcblx0XHR9XG5cblx0XHR0aGlzLmdldEJ1dHRvbnMgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHJlcGx5OiB7XG5cdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLXJlcGx5Jyxcblx0XHRcdFx0XHR0aXRsZTogJ1JlcGx5Jyxcblx0XHRcdFx0XHRvbkNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHJlcGx5KCdyZXBseScpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRyZXBseUFsbDoge1xuXHRcdFx0XHRcdGljb246ICdmYSBmYS1yZXBseS1hbGwnLFxuXHRcdFx0XHRcdHRpdGxlOiAnUmVwbHkgQWxsJyxcblx0XHRcdFx0XHRvbkNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHJlcGx5KCdyZXBseUFsbCcpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRmb3J3YXJkOiB7XG5cdFx0XHRcdFx0aWNvbjogJ2ZhIGZhLXNoYXJlLXNxdWFyZScsXG5cdFx0XHRcdFx0dGl0bGU6ICdGb3J3YXJkJyxcblx0XHRcdFx0XHRvbkNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGNvbnN0IEhFQURFUiA9ICdcXG5cXG4tLS0tLSBGb3J3YXJkZWQgbWFpbCAtLS0tLVxcbidcblxuXG5cdFx0XHRcdFx0XHRpZiAoY3RybC5tb2RlbC5pc0h0bWwgJiYgaXRlbS5wYXJ0SUQudGV4dCAhPSBmYWxzZSkge1xuXHRcdFx0XHRcdFx0XHRzcnZNYWlsLm9wZW5NZXNzYWdlKGN1cnJlbnRBY2NvdW50LCBtYWlsYm94TmFtZSwgaXRlbS5zZXFubywgaXRlbS5wYXJ0SUQudGV4dCkudGhlbigobWVzc2FnZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdGZvcndhcmRNZXNzYWdlKEhFQURFUiArIG1lc3NhZ2UudGV4dClcblx0XHRcdFx0XHRcdFx0fSlcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdH1cblx0XHRcblx0XHRcdFx0XHRcdGVsc2UgaWYgKCFjdHJsLm1vZGVsLmlzSHRtbCkge1xuXHRcdFx0XHRcdFx0XHRmb3J3YXJkTWVzc2FnZShIRUFERVIgKyBjdHJsLm1vZGVsLnRleHQpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdFx0Zm9yd2FyZE1lc3NhZ2UoJycpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XHRcdFx0XHRcblx0XHR9XG5cdFx0XG5cdFx0ZnVuY3Rpb24gcmVwbHkoYWN0aW9uKSB7XG5cdFx0XHRjb25zb2xlLmxvZygncmVwbHknKVxuXG5cdFx0XHRpZiAoYWN0aW9uID09ICdyZXBseScgfHwgYWN0aW9uID09ICdyZXBseUFsbCcpIHtcblxuXHRcdFx0XHRjb25zdCBIRUFERVIgPSAnXFxuXFxuLS0tLS0gT3JpZ2luYWwgbWFpbCAtLS0tLVxcbidcblxuXHRcdFx0XHRsZXQgdG8gPSBpdGVtLmZyb20uZW1haWxcblxuXHRcdFx0XHRpZiAoYWN0aW9uID09ICdyZXBseUFsbCcgJiYgaXRlbS50by5sZW5ndGggPiAwKSB7XHRcdFx0XHRcdFxuXHRcdFx0XHRcdHRvICs9ICcsJyArIGl0ZW0udG8ubWFwKChhKSA9PiBhLmVtYWlsKS5qb2luKCcsJylcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChjdHJsLm1vZGVsLmlzSHRtbCAmJiBpdGVtLnBhcnRJRC50ZXh0ICE9IGZhbHNlKSB7XG5cdFx0XHRcdFx0c3J2TWFpbC5vcGVuTWVzc2FnZShjdXJyZW50QWNjb3VudCwgbWFpbGJveE5hbWUsIGl0ZW0uc2Vxbm8sIGl0ZW0ucGFydElELnRleHQpLnRoZW4oKG1lc3NhZ2UpID0+IHtcblx0XHRcdFx0XHRcdHJlcGx5TWVzc2FnZShIRUFERVIgKyBtZXNzYWdlLnRleHQsIHRvKVxuXHRcdFx0XHRcdH0pXHRcdFx0XHRcdFx0XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRlbHNlIGlmICghY3RybC5tb2RlbC5pc0h0bWwpIHtcblx0XHRcdFx0XHRyZXBseU1lc3NhZ2UoSEVBREVSICsgY3RybC5tb2RlbC50ZXh0LCB0bylcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRyZXBseU1lc3NhZ2UoJycsIHRvKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHR9XG5cblxuXHR9XG5cblxufSk7XG5cblxuXG5cbiIsIiQkLmNvbnRyb2wucmVnaXN0ZXJDb250cm9sKCd3cml0ZU1haWxQYWdlJywge1xuXG5cdHRlbXBsYXRlOiBcIjxmb3JtIGJuLWV2ZW50PVxcXCJzdWJtaXQ6IG9uU2VuZFxcXCIgYm4tZm9ybT1cXFwiZGF0YVxcXCI+XFxuXHQ8ZGl2IGNsYXNzPVxcXCJoZWFkZXJcXFwiPlxcblx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdFx0PGRpdiBjbGFzcz1cXFwib3BlbkNvbnRhY3RQYW5lbFxcXCI+XFxuXHRcdFx0XHQ8YSBibi1ldmVudD1cXFwiY2xpY2s6IG9wZW5Db250YWN0XFxcIiBocmVmPVxcXCIjXFxcIiBjbGFzcz1cXFwidzMtdGV4dC1pbmRpZ29cXFwiPlRvOjwvYT5cXG5cdFx0XHQ8L2Rpdj5cXG5cdFx0XHQ8aW5wdXQgdHlwZT1cXFwiZW1haWxcXFwiIG11bHRpcGxlPVxcXCJ0cnVlXFxcIiBuYW1lPVxcXCJ0b1xcXCIgYm4tcHJvcD1cXFwicHJvcDFcXFwiIHJlcXVpcmVkPVxcXCJcXFwiIGJuLWJpbmQ9XFxcInRvXFxcIj5cdFx0XFxuXHRcdDwvZGl2Plxcblxcblx0XHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaW5wdXRncm91cFxcXCI+XFxuXHRcdFx0PGxhYmVsPlN1YmplY3Q6PC9sYWJlbD5cXG5cdFx0XHQ8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwic3ViamVjdFxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XHRcdFxcblx0XHQ8L2Rpdj5cdFxcblxcblx0XHQ8ZGl2IGJuLXNob3c9XFxcInNob3cxXFxcIiBjbGFzcz1cXFwiYXR0YWNobWVudHNcXFwiPlxcblx0XHRcdDxsYWJlbD48aSBjbGFzcz1cXFwiZmEgZmEtcGFwZXJjbGlwXFxcIj48L2k+PC9sYWJlbD5cdFx0XHRcXG5cdFx0XHQ8dWwgYm4tZWFjaD1cXFwiYXR0YWNobWVudHNcXFwiIGJuLWV2ZW50PVxcXCJjbGljay5kZWxldGU6IG9uUmVtb3ZlQXR0YWNobWVudFxcXCI+XFxuXHRcdFx0XHQ8bGk+XFxuXHRcdFx0XHRcdDxzcGFuIGJuLXRleHQ9XFxcIiRzY29wZS4kaS5maWxlTmFtZVxcXCI+PC9zcGFuPlxcblx0XHRcdFx0XHQ8aSBjbGFzcz1cXFwiZmEgZmEtdGltZXMgZGVsZXRlXFxcIj48L2k+XFxuXHRcdFx0XHQ8L2xpPlxcblx0XHRcdDwvdWw+XFxuXHRcdDwvZGl2Plxcblx0PC9kaXY+XFxuXHQ8ZGl2IGJuLWNvbnRyb2w9XFxcImJyYWluanMuaHRtbGVkaXRvclxcXCIgY2xhc3M9XFxcImNvbnRlbnRcXFwiIG5hbWU9XFxcImh0bWxcXFwiIGJuLWlmYWNlPVxcXCJjb250ZW50XFxcIj48L2Rpdj5cXG48IS0tIFx0PHRleHRhcmVhIG5hbWU9XFxcInRleHRcXFwiIGJuLWJpbmQ9XFxcImNvbnRlbnRcXFwiPjwvdGV4dGFyZWE+XHRcXG4gLS0+XHQ8aW5wdXQgdHlwZT1cXFwic3VibWl0XFxcIiBoaWRkZW49XFxcIlxcXCIgYm4tYmluZD1cXFwic3VibWl0XFxcIj5cXG48L2Zvcm0+XFxuXCIsXG5cblx0ZGVwczogWydhcHAubWFpbHMnLCAnYnJlaXpib3QucGFnZXInXSxcblxuXHRwcm9wczoge1xuXHRcdGFjY291bnROYW1lOiAnJyxcblx0XHRkYXRhOiB7fVxuXHR9LFxuXG5cdGluaXQ6IGZ1bmN0aW9uKGVsdCwgc3J2TWFpbCwgcGFnZXIpIHtcblxuXHRcdGNvbnN0IHthY2NvdW50TmFtZSwgZGF0YX0gPSB0aGlzLnByb3BzXG5cdFx0Y29uc29sZS5sb2coJ2RhdGEnLCBkYXRhKVxuXG5cdFx0Y29uc3QgY3RybCA9ICQkLnZpZXdDb250cm9sbGVyKGVsdCwge1xuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRkYXRhLFxuXHRcdFx0XHRhdHRhY2htZW50czogW10sXG5cdFx0XHRcdHNob3cxOiBmdW5jdGlvbigpIHtyZXR1cm4gdGhpcy5hdHRhY2htZW50cy5sZW5ndGggPiAwfSxcblx0XHRcdFx0cHJvcDE6IGZ1bmN0aW9uKCkge3JldHVybiB7YXV0b2ZvY3VzOiB0aGlzLmRhdGEuaHRtbCA9PSB1bmRlZmluZWR9fVxuXHRcdFx0fSxcblx0XHRcdGV2ZW50czoge1xuXHRcdFx0XHRvblNlbmQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29uU2VuZCcpXG5cdFx0XHRcdFx0ZXYucHJldmVudERlZmF1bHQoKVxuXHRcdFx0XHRcdGNvbnN0IGRhdGEgPSAkKHRoaXMpLmdldEZvcm1EYXRhKClcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnZGF0YScsIGRhdGEpXG5cdFx0XHRcdFx0Y29uc3Qge2F0dGFjaG1lbnRzfSA9IGN0cmwubW9kZWxcblx0XHRcdFx0XHRpZiAoYXR0YWNobWVudHMubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdFx0ZGF0YS5hdHRhY2htZW50cyA9IGF0dGFjaG1lbnRzLm1hcCgoYSkgPT4gYS5yb290RGlyICsgYS5maWxlTmFtZSlcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzcnZNYWlsLnNlbmRNYWlsKGFjY291bnROYW1lLCBkYXRhKVxuXHRcdFx0XHRcdC50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdHBhZ2VyLnBvcFBhZ2UoKVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LmNhdGNoKChlKSA9PiB7XG5cdFx0XHRcdFx0XHQkJC51aS5zaG93QWxlcnQoe3RpdGxlOiAnRXJyb3InLCBjb250ZW50OiBlLnJlc3BvbnNlVGV4dH0pXG5cdFx0XHRcdFx0fSlcblxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvcGVuQ29udGFjdDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ29wZW5Db250YWN0Jylcblx0XHRcdFx0XHRwYWdlci5wdXNoUGFnZSgnYnJlaXpib3QuY29udGFjdHMnLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogJ1NlbGVjdCBhIGNvbnRhY3QnLFxuXHRcdFx0XHRcdFx0cHJvcHM6IHtcblx0XHRcdFx0XHRcdFx0c2hvd1NlbGVjdGlvbjogdHJ1ZVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdGJ1dHRvbnM6IHtcblx0XHRcdFx0XHRcdFx0b2s6IHtcblx0XHRcdFx0XHRcdFx0XHR0aXRsZTogJ0FwcGx5Jyxcblx0XHRcdFx0XHRcdFx0XHRpY29uOiAnZmEgZmEtY2hlY2snLFxuXHRcdFx0XHRcdFx0XHRcdG9uQ2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0cGFnZXIucG9wUGFnZSh0aGlzLmdldFNlbGVjdGlvbigpKVxuXHRcdFx0XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0b25SZXR1cm46IGZ1bmN0aW9uKGZyaWVuZHMpIHtcblx0XHRcdFx0XHRcdFx0Y29uc3QgY29udGFjdHMgPSBmcmllbmRzLm1hcCgoYSkgPT4gYS5jb250YWN0RW1haWwpXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdjb250YWN0cycsIGNvbnRhY3RzKVxuXHRcdFx0XHRcdFx0XHRjb25zdCB0byA9IGN0cmwuc2NvcGUudG8udmFsKClcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ3RvJywgdG8pXG5cblx0XHRcdFx0XHRcdFx0aWYgKHRvICE9ICcnKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29udGFjdHMudW5zaGlmdCh0bylcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRjdHJsLnNldERhdGEoe2RhdGE6IHt0bzogY29udGFjdHMuam9pbignLCcpfX0pXHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblJlbW92ZUF0dGFjaG1lbnQ6IGZ1bmN0aW9uKGV2KSB7XG5cdFx0XHRcdFx0Y29uc3QgaWR4ID0gJCh0aGlzKS5jbG9zZXN0KCdsaScpLmluZGV4KClcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnb25SZW1vdmVBdHRhY2htZW50JywgaWR4KVxuXHRcdFx0XHRcdGN0cmwubW9kZWwuYXR0YWNobWVudHMuc3BsaWNlKGlkeCwgMSlcblx0XHRcdFx0XHRjdHJsLnVwZGF0ZSgpXG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0fSlcblxuXHRcdGlmIChkYXRhLmh0bWwgIT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRjdHJsLnNjb3BlLmNvbnRlbnQuZm9jdXMoKVxuXHRcdH1cdFx0XG5cblx0XHR0aGlzLmdldEJ1dHRvbnMgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGF0dGFjaG1lbnQ6IHtcblx0XHRcdFx0XHRpY29uOiAnZmEgZmEtcGFwZXJjbGlwJyxcblx0XHRcdFx0XHR0aXRsZTogJ0FkZCBhdHRhY2htZW50Jyxcblx0XHRcdFx0XHRvbkNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHBhZ2VyLnB1c2hQYWdlKCdicmVpemJvdC5maWxlcycsIHtcblx0XHRcdFx0XHRcdFx0dGl0bGU6ICdTZWxlY3QgYSBmaWxlIHRvIGF0dGFjaCcsXG5cdFx0XHRcdFx0XHRcdHByb3BzOiB7XG5cdFx0XHRcdFx0XHRcdFx0c2hvd1RodW1ibmFpbDogdHJ1ZVxuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRldmVudHM6IHtcblx0XHRcdFx0XHRcdFx0XHRmaWxlY2xpY2s6IGZ1bmN0aW9uKGV2LCBkYXRhKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRwYWdlci5wb3BQYWdlKGRhdGEpXG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRvblJldHVybjogZnVuY3Rpb24oZGF0YSkge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHtmaWxlTmFtZSwgcm9vdERpcn0gPSBkYXRhXG5cdFx0XHRcdFx0XHRcdFx0Y3RybC5tb2RlbC5hdHRhY2htZW50cy5wdXNoKHtmaWxlTmFtZSwgcm9vdERpcn0pXG5cdFx0XHRcdFx0XHRcdFx0Y3RybC51cGRhdGUoKVx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KVxuXHRcdFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0c2VuZDoge1xuXHRcdFx0XHRcdGljb246ICdmYSBmYS1wYXBlci1wbGFuZScsXG5cdFx0XHRcdFx0dGl0bGU6ICdTZW5kIE1lc3NhZ2UnLFxuXHRcdFx0XHRcdG9uQ2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0Y3RybC5zY29wZS5zdWJtaXQuY2xpY2soKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVx0XHRcdFx0XG5cdFx0fVxuXG5cdH1cbn0pIl19
