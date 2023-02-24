// @ts-check

$$.control.registerControl('actionsCtrl', {

	template: { gulp_inject: './actions.html' },

	deps: ['breizbot.pager', 'actionSrv'],

	props: {
		actions: null,
		isEdition: true,
		hubDevices: null
	},

	/**
	 * 
	 * @param {Breizbot.Services.Pager.Interface} pager 
	 * @param {ActionSrv.Interface} actionSrv
	 */
	init: function (elt, pager, actionSrv) {

		//console.log('props', this.props)

		const { isEdition, hubDevices } = this.props

		const actions = Array.from(this.props.actions || [])

		if (!isEdition) {
			actions.unshift({ name: 'None' })
		}

		const ctrl = $$.viewController(elt, {
			data: {
				actions,
				hasActions: function () {
					return this.actions.length > 0
				}
			},
			events: {
				onItemContextMenu: function (ev, data) {
					const idx = $(this).closest('.item').index()
					const action = ctrl.model.actions[idx]
					//console.log('onItemContextMenu', idx, action)

					if (data.cmd == 'delete') {
						ctrl.model.actions.splice(idx, 1)
						ctrl.update()
					}
					if (data.cmd == 'edit') {
						let { steps } = action
						if (!Array.isArray(steps)) {
							steps = [action]
						}
						pager.pushPage('actionCtrl', {
							title: action.name,
							props: {
								steps
							},
							onReturn: function (data) {
								//console.log('onReturn', data)
								ctrl.model.actions[idx] = { name: action.name, steps: data }
							}
						})
					}

				},
				onItemClick: function (ev) {
					const idx = $(this).closest('.item').index()
					//console.log('onItemClick', idx)
					const action = ctrl.model.actions[idx]
					if (isEdition) {
						actionSrv.execAction(hubDevices, ctrl.model.actions, action.name, 1)
					}
					else {
						pager.popPage(action.name)
					}

				}
			}
		})

		if (isEdition) {
			this.getButtons = function () {
				return {
					addAction: {
						title: 'Add Action',
						icon: 'fa fa-plus',
						onClick: async function () {
							//console.log('Add action')
							const name = await $$.ui.showPrompt({ label: 'Name', title: 'Add action' })
							if (name == null) return
							pager.pushPage('actionCtrl', {
								title: name,
								props: {
									steps: [{}]
								},
								onReturn: function (data) {
									//console.log('onReturn', data)
									ctrl.model.actions.push({ name, steps: data })
									ctrl.update()
								}
							})
						}
					},
					save: {
						title: 'Save',
						icon: 'fa fa-check',
						onClick: function () {
							pager.popPage(ctrl.model.actions)
						}
					}
				}
			}
		}


	}


});




