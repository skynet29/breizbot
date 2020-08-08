$$.service.registerService('breizbot.contacts', {

	deps: ['brainjs.resource'],

	init: function (config, resource) {

		const http = resource('/api/contacts')

		return {

			addContact: function (name, email) {
				return http.post(`/addContact`, { name, email })
			},
			getContacts: function () {
				return http.get(`/getContacts`)
			},

			removeContact: function (contactId) {
				return http.delete(`/removeContact/${contactId}`)
			}

		}
	},
	$iface: `
		addContact(name, email):Promise
		getContacts():Promise(contacts)
		removeContact(contactId):Promise
	`
});
