$$.control.registerControl('rootPage', {

	template: { gulp_inject: './main.html' },

	deps: ['breizbot.pager', 'breizbot.http'],

	init: function (elt, pager, http) {

		async function load() {
			const webcasts = await http.get('/')
			//console.log('webcasts', webcasts)
			ctrl.setData({ webcasts })
			ctrl.scope.tree.expandAll()
		}


		const ctrl = $$.viewController(elt, {
			data: {
				webcasts: [],
				getContextMenu: function() {
					return function(node) {
						node = ctrl.scope.tree.getActiveNode()
						const ret = {}
						if (node.data.type == 'server') {
							ret.edit =  {name: 'Edit', icon: 'fas fa-edit'}
							ret.del =  {name: 'Remove', icon: 'fas fa-trash'}
						}
						return ret
					}
				}
			},
			events: {
				onTreeContextMenu: async function(ev, data) {
					console.log('onTreeContextMenu', data)
					const {action, node} = data
					const {id} = node.data
					console.log('id', id)
					if (action == 'del') {
						await http.delete(`/${id}`)
						load()
					}
					if (action == 'edit') {
						const data = await http.get(`/${id}`)
						pager.pushPage('addWebcast', {
							title: 'Edit Webcast',
							props: {
								data
							},
							onReturn: async function (data) {
								console.log('onReturn', data)
								await http.put(`/${id}`, data)
								load()
							}
	
						})
					}
				},
				onTreeActivate: function () {
					const tree = $(this).iface()
					const node = tree.getActiveNode()

					const { type, id } = node.data
					if (type) {
						pager.pushPage(type, {
							title: `${type} ${node.title}`,
							props: {
								id
							},
							onBack: function () {
								const activeNode = tree.getActiveNode()
								if (activeNode != null) {
									activeNode.setActive(false)
								}
							}							
						})
					}
				},
				onAddWebcast: function () {
					console.log('onAddWebcast')
					pager.pushPage('addWebcast', {
						title: 'Add Webcast',
						onReturn: async function (data) {
							//console.log('onReturn', data)
							await http.post('/', data)
							load()
						}
					})

				}

			}
		})

		load()
	}


});




