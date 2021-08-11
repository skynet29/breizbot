$$.service.registerService('breizbot.contacts', {

	deps: ['brainjs.resource'],

	init: function (config, resource) {

		const http = resource('/api/contacts')

		return {

			addContact: function (info) {
				return http.post(`/addContact`, info)
			},
			getContacts: function () {
				return http.get(`/getContacts`)
			},

			removeContact: function (contactId) {
				return http.delete(`/removeContact/${contactId}`)
			},

			updateContactInfo: function (contactId, info) {
				return http.post(`/updateContactInfo/${contactId}`, info)
			}
			

		}
	}
});
