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
			},

			openMessage(name, mailboxName, seqNo, partID)	{
				return http.post(`/api/mails/openMessage`, {name, mailboxName, seqNo, partID})
			},

			openAttachment(name, mailboxName, seqNo, partID)	{
				return http.post(`/api/mails/openAttachment`, {name, mailboxName, seqNo, partID})
			}
					
		}
	},

	$iface: `
		getMailAccount():Promise;
		createMaiAccount(data):Promise;
		getMailboxes(name):Promise;
		openMailbox(name, mailboxName):Promise;
		openMessage(name, mailboxName, seqNo, info):Promise
		openAttachment(name, mailboxName, seqNo, info):Promise
		`
});