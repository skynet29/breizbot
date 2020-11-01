$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'breizbot.http'],


	init: function (elt, pager, http) {

		let keyPwd = null

		async function getFavorites() {
			const results = await http.post('/getFavorites')
			//console.log('results', results)
			ctrl.setData({ source: [results], selNode: null })
			ctrl.scope.tree.getRootNode().getFirstChild().setExpanded(true)
		}

		const options = {
			renderNode: function (evt, data) {
				const { node } = data
				//console.log('renderNode', node.title)
				if (node.data.icon) {
					const $span = $(node.span)
					$span.css({
						display: 'flex',
						alignItems: 'center'
					})
					$span.find("> span.fancytree-icon").css({
						backgroundImage: `url(${node.data.icon})`,
						backgroundPosition: "0 0",
						backgroundSize: "16px 16px"
					})
				}

			}
		}

		if (!$$.util.isTouchDevice()) {
			options.dnd = {
				autoExpandMS: 400,
				dragStart: function () {
					return true
				},
				dragEnter: function (node, data) {
					//console.log('dragEnter', node.isFolder())
					if (!node.isFolder() && !data.otherNode.isFolder()) {
						return ['before']
					}
					return ['before', 'over']
				},
				dragDrop: async function (node, data) {
					//console.log('dragDrop', data.hitMode)
					const id = data.otherNode.key
					if (data.hitMode == 'before') {
						const beforeIdx = node.getIndex()
						console.log('beforeIdx', beforeIdx)
						const newParentId = node.parent.key
						await http.post('/insertBefore', { id, newParentId, beforeIdx })
					}
					else {
						await http.post('/changeParent', { id, newParentId: node.key })
					}
					data.otherNode.moveTo(node, data.hitMode)
					node.setExpanded(true)
					//changeParent(data.otherNode.key, node.key)
				}
			}

		}


		const ctrl = $$.viewController(elt, {
			data: {
				source: [],
				options,
				getContextMenu: function () {
					return function (node) {
						node = ctrl.scope.tree.getActiveNode()
						//console.log('getContextMenu', node)
						const ret = {}
						if (node != ctrl.scope.tree.getRootNode().getFirstChild()) {
							ret.del = {
								name: 'Delete',
								icon: 'fas fa-trash-alt'
							}
						}
						if (node.isFolder()) {
							ret.addFolder = {
								name: 'Add Folder',
								icon: 'fas fa-folder-plus'
							}
							ret.addLink = {
								name: 'Add Link',
								icon: 'fas fa-link'
							}

						}
						else {
							ret.edit = {
								name: 'Edit',
								icon: 'fas fa-edit'
							}
							ret.setPwd = {
								name: 'Set Password',
								icon: 'fas fa-lock'
							}
							ret.getPwd = {
								name: 'View Password',
								icon: 'fas fa-eye'
							}
						}
						return ret
					}
				}


			},
			events: {
				onTreeContextMenu: async function (ev, data) {
					//console.log('onTreeContextMenu', data)
					const { action, node } = data
					if (action == 'addFolder') {
						const title = await $$.ui.showPrompt({ title: 'Add Folder', label: 'Name:' })
						if (title != null) {
							const parentId = node.key
							const ret = await http.post('/addFavorite', { parentId, info: { type: 'folder', name: title } })
							node.addNode({ title, folder: true, key: ret.id })
							node.setExpanded(true)
						}

					}
					else if (action == 'addLink') {
						pager.pushPage('addLink', {
							title: 'Add Link',
							onReturn: async function (data) {
								//console.log('onReturn', data)
								const { name, link } = data

								const parentId = node.key
								const ret = await http.post('/addFavorite', { parentId, info: { type: 'link', name, link } })

								node.addNode({ title: name, key: ret.id, data: { link, icon: ret.info.icon } })
								node.setExpanded(true)
							}
						})

					}
					else if (action == 'edit') {
						pager.pushPage('addLink', {
							title: 'Edit Link',
							props: {
								data: {
									name: node.title,
									link: node.data.link
								}
							},
							onReturn: async function (data) {
								//console.log('onReturn', data)
								const { name, link } = data
								const info = await http.post('/updateLink', { id: node.key, name, link })
								//console.log('info', info)
								node.setTitle(name)
								node.data.link = link
								node.data.icon = info.icon
								node.render()
							}
						})
					}
					else if (action == 'del') {
						await http.delete(`/removeFavorite/${node.key}`)
						node.remove()

					}
					else if (action == 'setPwd') {
						if (keyPwd == null) {
							keyPwd = await $$.ui.showPrompt({ title: 'Key Password', label: 'password' })
							//console.log('keyPwd', keyPwd)
						}
						if (keyPwd != null) {
							const sitePwd = await $$.ui.showPrompt({ title: 'Site Password', bale: 'password' })
							//console.log('sitePwd', sitePwd)
							const encryptedPwd = await $$.crypto.encrypt(keyPwd, sitePwd)
							//console.log('encryptedPwd', encryptedPwd)
							await http.post('/setPwd', { id: node.key, pwd: encryptedPwd })
						}

					}
					else if (action == 'getPwd') {
						if (keyPwd == null) {
							keyPwd = await $$.ui.showPrompt({ title: 'Key Password', label: 'password' })
							//console.log('keyPwd', keyPwd)
						}
						if (keyPwd != null) {
							const { pwd } = await http.post('/getPwd', { id: node.key })
							//console.log('pwd', pwd)
							const decryptedPwd = await $$.crypto.decrypt(keyPwd, pwd)
							//console.log('decryptedPwd', decryptedPwd)
							$$.ui.showAlert({ title: 'Site Password', content: decryptedPwd })
						}

					}
				},
				onItemSelected: function (ev, selNode) {
					console.log('onItemSelected', selNode.title)
					const { link } = selNode.data
					if (link != undefined) {
						window.open(link)
					}
				}

			}
		})

		getFavorites()

	}


});




