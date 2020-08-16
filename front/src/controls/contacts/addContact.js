$$.control.registerControl('breizbot.addContactPage', {

	template: { gulp_inject: './addContact.html' },

	deps: ['breizbot.pager', 'breizbot.contacts', 'breizbot.cities'],

	props: {
		data: {}
	},

	init: function (elt, pager, contactsSrv, citiesSrv) {

		const info = this.props.info || {}
		//console.log('info', info)
		const id = info._id
		const { postalCode, city } = info

		const ctrl = $$.viewController(elt, {
			data: {
				info,
				cities: []
			},
			events: {
				onSubmit: async function (ev) {
					ev.preventDefault()
					const data = $(this).getFormData()
					pager.popPage({ id, data })
				},

				onPostalCodeLostFocus: async function () {
					//console.log('onPostalCodeLostFocus', this.value)
					const cities = await citiesSrv.getCitesFromPostalCode(this.value)
					ctrl.setData({ cities })

				}

			}
		})

		async function load() {
			const cities = await citiesSrv.getCitesFromPostalCode(postalCode)
			ctrl.setData({ cities })
			if (city && city != '') {
				ctrl.setData({ city })
			}
		}

		if (postalCode && postalCode != '') {
			load()
		}


		this.addContact = async function (info) {
			await contactsSrv.addContact(info)
		}

		this.updateContactInfo = async function (id, info) {
			await contactsSrv.updateContactInfo(id, info)
		}


		this.getButtons = function () {
			return {
				add: {
					title: 'Apply',
					icon: 'fa fa-check',
					onClick: function () {
						ctrl.scope.submit.click()
					}
				}
			}
		}
	}

});




