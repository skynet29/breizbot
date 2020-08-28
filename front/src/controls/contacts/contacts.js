$$.control.registerControl('breizbot.contacts', {

	deps: ['breizbot.contacts'],

	props: {
		showSelection: false,
		hasSearchbar: false,
		contextMenu: {}
	},

	template: { gulp_inject: './contacts.html' },

	init: function (elt, contactsSrv) {

		const { showSelection, contextMenu, hasSearchbar } = this.props
		console.log('props', this.props)


		const ctrl = $$.viewController(elt, {
			data: {
				contacts: [],
				showSelection,
				hasSearchbar,
				filter: '',
				contextMenu,
				getContacts: function() {
					if (this.filter != '') {
						//console.log('OK', this.filter)
						const regex = new RegExp(`\w*${this.filter}\w*`, 'i')
						return this.contacts.filter((c) => regex.test(c.name))
					}
					if (this.showSelection) {
						return this.contacts.filter((c) => c.email && c.email != '')
					}
					return this.contacts
				},
				show1: function () {
					return this.contacts.length > 0
				},
				show2: function () {
					return this.contacts.length == 0
				},
				getCellPhone: function(scope) {
					return 'tel:' + scope.$i.mobilePhone
				},
				getHomePhone: function(scope) {
					return 'tel:' + scope.$i.phone
				},
				getAddress: function(scope) {
					const {address, city, postalCode} = scope.$i
					return `${address || ''} ${postalCode || ''} ${city || ''}`
				}
			},
			events: {
				onSearch: function(ev, data) {
					//console.log('onSearch', data)
					ctrl.setData({filter: data.value})

				},
				onInputClick: function() {
					//console.log('onInputClick')
					$(this).closest('div').find('a').get(0).click()
				},
				onItemContextMenu: function (ev, data) {
					//console.log('onItemContextMenu', data)
					const { cmd } = data
					const idx = $(this).index()
					const info = ctrl.model.contacts[idx]
					//console.log('onItemClick', data)
					if (showSelection) {
						//$(this).siblings('.w3-blue').removeClass('w3-blue')
						$(this).toggleClass('w3-blue')
					}
					elt.trigger('contactcontextmenu', { cmd, info })
				},
				onItemClick: function () {
					//console.log('onItemClick', data)
					if (showSelection) {
						//$(this).siblings('.w3-blue').removeClass('w3-blue')
						$(this).toggleClass('w3-blue')
					}
				}

			}
		})

		async function load() {
			const contacts = await contactsSrv.getContacts()
			//console.log('contacts', contacts)
			ctrl.setData({ contacts })
		}


		load()

		this.update = load

		this.removeContact = async function(id) {
			await contactsSrv.removeContact(id)
			await load()
		}

		this.getSelection = function () {
			const ret = []
			elt.find('li.w3-blue').each(function () {
				const idx = $(this).index()
				ret.push(ctrl.model.contacts[idx])
			})
			console.log('ret', ret)
			return ret
		}

	},
	$iface: `getSelection(): [ContactInfo]`,
	$events: 'contactclick'
});




