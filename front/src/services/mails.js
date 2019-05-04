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

			openMailbox: function(name, mailboxName, pageNo) {
				return http.post(`/api/mails/openMailbox`, {name, mailboxName, pageNo})
			},

			openMessage(name, mailboxName, seqNo, partID)	{
				return http.post(`/api/mails/openMessage`, {name, mailboxName, seqNo, partID})
			},

			openAttachment(name, mailboxName, seqNo, partID)	{
				return http.post(`/api/mails/openAttachment`, {name, mailboxName, seqNo, partID})
			},

			deleteMessage(name, mailboxName, seqNos)	{
				return http.post(`/api/mails/deleteMessage`, {name, mailboxName, seqNos})
			},	

			moveMessage(name, mailboxName, targetName, seqNos)	{
				return http.post(`/api/mails/moveMessage`, {name, mailboxName, targetName, seqNos})
			}						
					
		}
	},

	$iface: `
		getMailAccount():Promise;
		createMaiAccount(data):Promise;
		getMailboxes(name):Promise;
		openMailbox(name, mailboxName, pageNo):Promise;
		openMessage(name, mailboxName, seqNo, partID):Promise;
		openAttachment(name, mailboxName, seqNo, partID):Promise;
		deleteMessage(name, mailboxName, seqNos):Promise;
		moveMessage(name, mailboxName, targetName, seqNos):Promise
		`
});
