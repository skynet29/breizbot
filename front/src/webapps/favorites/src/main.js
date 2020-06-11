$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'breizbot.http'],


	init: function (elt, pager, http) {

		function getFavorites(parentId) {
			return http.post('/getFavorites', { parentId })
		}

		function addFavorite(parentId, info) {
			return http.post('/addFavorite', { parentId, info })
		}

		function removeFavorite(id) {
			return http.delete('/removeFavorite/' + id)
		}


		const ctrl = $$.viewController(elt, {
			data: {
				isEdited: false,
				selNode: null,
				isVisible: function () {
					return this.isEdited ? 'visible' : 'hidden'
				},
				canRemove: function () {
					return this.selNode != null
				},
				canAdd: function () {
					return this.selNode != null && this.selNode.folder === true
				},
				source: [{ title: 'Home', folder: true, lazy: true, key: "0" }],
				options: {
					lazyLoad: function (event, data) {
						console.log('lazyLoad')
						const parentId = data.node.key

						data.result = getFavorites(parentId).then((results) => {
							console.log('results', results)
							return results.map((i) => {
								const { name, type, link } = i.info
								if (type == 'folder') {
									return {
										title: name,
										folder: true,
										lazy: true,
										key: i._id,
									}
								}
								else {
									return {
										title: name,
										key: i._id,
										data: { link }
									}

								}
							})
						})
					}
				}

			},
			events: {
				onItemSelected: function (ev, selNode) {
					//console.log('onItemSelected', selNode)
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
					ctrl.setData({ isEdited: true })
				},
				onBack: function () {
					ctrl.setData({ isEdited: false })
				},
				onAddFolder: async function () {
					const title = await $$.ui.showPrompt({ title: 'Add Folder', label: 'Name:' })
					if (title != null) {
						const { selNode } = ctrl.model
						const parentId = selNode.key
						const ret = await addFavorite(parentId, { type: 'folder', name: title })
						selNode.addNode({ title, folder: true, lazy: true, key: ret.id })
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

							selNode.addNode({ title: name, key: ret._id, data: { link } })
							selNode.setExpanded(true)
						}
					})

				},

				onRemove: async function () {
					const { selNode } = ctrl.model
					await removeFavorite(selNode.key)
					selNode.remove()

				}

			}
		})

	}


});




