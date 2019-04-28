$$.service.registerService('breizbot.mails', {

	deps: ['brainjs.http'],

	init: function(config, http) {

		return {
			getMailAccount: function() {
				return http.get('/api/mails/')
			},

			createMailAccount: function(data) {
				return http.post('/api/mails', data)
			},

			getMailboxes: function(name) {
				return http.post(`/api/mails/getMailboxes`, {name})
			},

			openMailbox: function(name, mailboxName) {
				return http.post(`/api/mails/openMailbox`, {name, mailboxName})
			}
			
		}
	},

	$iface: `
		getMailAccount():Promise;
		createMaiAccount(data):Promise
		`
});
