$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'breizbot.http'],


	init: function (elt, pager, http) {

		async function getFavorites() {
			const results = await http.post('/getFavorites')
			console.log('results', results)
			ctrl.setData({ source: [results], selNode: null })
			ctrl.scope.tree.getRootNode().getFirstChild().setExpanded(true)
		}

		function addFavorite(parentId, info) {
			return http.post('/addFavorite', { parentId, info })
		}

		function removeFavorite(id) {
			return http.delete('/removeFavorite/' + id)
		}

		function changeParent(id, newParentId) {
			return http.post('/changeParent', { id, newParentId })
		}

		const options = {
			renderNode: function (evt, data) {
				const { node } = data
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
					//console.log('dragStart', ctrl.model.isEdited)
					return ctrl.model.isEdited
				},
				dragEnter: function (node, data) {
					//console.log('dragEnter', node.isFolder())
					if (!node.isFolder()) {
						return false
					}
					return ['over']
				},
				dragDrop: function (node, data) {
					//console.log('dragDrop')
					data.otherNode.moveTo(node, data.hitMode)
					node.setExpanded(true)
					changeParent(data.otherNode.key, node.key)
				}
			}

		}


		const ctrl = $$.viewController(elt, {
			data: {
				isEdited: false,
				selNode: null,
				isVisible: function () {
					return this.isEdited ? 'visible' : 'hidden'
				},
				canRemove: function () {
					return this.selNode != null && this.selNode.key != "0"
				},
				canAdd: function () {
					return this.selNode != null && this.selNode.isFolder()
				},
				source: [],
				options

			},
			events: {
				onUpdate: function () {
					getFavorites()
				},
				onItemSelected: function (ev, selNode) {
					console.log('onItemSelected', selNode.title)
					// if (selNode.isFolder()) {
					// 	selNode.setExpanded(!selNode.isExpanded())
					// }
					ctrl.setData({ selNode })
					if (!ctrl.model.isEdited) {
						const { link } = selNode.data
						if (link != undefined) {
							window.open(link)
						}
						selNode.setActive(false)
					}
				},
				onEdit: function () {
					ctrl.setData({ isEdited: true, selNode: null })
				},
				onBack: function () {
					const { selNode } = ctrl.model
					if (selNode != null) {
						selNode.setActive(false)
					}
					ctrl.setData({ isEdited: false, selNode: null })
				},
				onAddFolder: async function () {
					const title = await $$.ui.showPrompt({ title: 'Add Folder', label: 'Name:' })
					if (title != null) {
						const { selNode } = ctrl.model
						const parentId = selNode.key
						const ret = await addFavorite(parentId, { type: 'folder', name: title })
						selNode.addNode({ title, folder: true, key: ret.id })
						selNode.setExpanded(true)
					}
				},
				onAddLink: function () {
					pager.pushPage('addLink', {
						title: 'Add Link',
						onReturn: async function (data) {
							//console.log('onReturn', data)
							const { name, link } = data
							const { selNode } = ctrl.model

							const parentId = selNode.key
							const ret = await addFavorite(parentId, { type: 'link', name, link })

							selNode.addNode({ title: name, key: ret.id, data: { link, icon: ret.info.icon } })
							selNode.setExpanded(true)
						}
					})

				},

				onRemove: async function () {
					const { selNode } = ctrl.model
					await removeFavorite(selNode.key)
					selNode.remove()
					ctrl.setData({ selNode: null })

				}

			}
		})

		getFavorites()

	}


});



