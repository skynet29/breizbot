$$.service.registerService('app.mails', {

	deps: ['breizbot.http'],

	init: function (config, http) {

		return {
			getMailAccounts: function () {
				return http.get('/getMailAccounts')
			},

			getMailAccount: function (name) {
				return http.post('/getMailAccount', { name })
			},

			removeMailAccount: function (name) {
				return http.post('/removeMailAccount', { name })
			},

			createMailAccount: function (data) {
				return http.post('/createMailAccount', data)
			},

			updateMailAccount: function (data) {
				return http.post('/updateMailAccount', data)
			},

			getMailboxes: function (name, addUnseenNb = false) {
				return http.post(`/getMailboxes`, { name, addUnseenNb })
			},

			addMailbox: function (name, mailboxName) {
				return http.post(`/addMailbox`, { name, mailboxName })
			},

			openMailbox: function (name, mailboxName, idx) {
				return http.post(`/openMailbox`, { name, mailboxName, idx })
			},

			openMessage: function (name, mailboxName, seqNo, partID) {
				return http.post(`/openMessage`, { name, mailboxName, seqNo, partID })
			},

			openAttachment: function (name, mailboxName, seqNo, partID) {
				return http.post(`/openAttachment`, { name, mailboxName, seqNo, partID })
			},

			deleteMessage: function (name, mailboxName, seqNos) {
				return http.post(`/deleteMessage`, { name, mailboxName, seqNos })
			},

			moveMessage: function (name, mailboxName, targetName, seqNos) {
				return http.post(`/moveMessage`, { name, mailboxName, targetName, seqNos })
			},


			sendMail: function (accountName, data) {
				return http.post(`/sendMail`, { accountName, data })
			}
		}
	}

});
