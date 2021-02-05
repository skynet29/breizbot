module.exports = function (ctx, router) {

	const db = require('./lib/db')(ctx.db)
	const mails = require('./lib/mails')(ctx)
	const { events } = ctx

	events.on('userDeleted', async (userName) => {
		try {
			await db.removeMailAccounts(userName)

		}
		catch (e) {
			console.error(e)
		}
	})

	router.get('/getMailAccounts', async function (req, res) {
		const userName = req.session.user

		try {
			const accounts = await db.getMailAccounts(userName)

			res.json(accounts.map((acc) => acc.name))
		}
		catch (e) {
			res.sendStatus(400)
		}
	})

	router.post('/getMailAccount', async function (req, res) {
		const userName = req.session.user
		const { name } = req.body

		try {
			const account = await db.getMailAccount(userName, name)
			account.smtpUser = account.smtpUser || account.user
			account.smtpPwd = account.smtpPwd || account.pwd

			res.json(account)
		}
		catch (e) {
			res.sendStatus(400)
		}

	})

	router.post('/removeMailAccount', async function (req, res) {
		const userName = req.session.user
		const { name } = req.body

		try {
			await db.removeMailAccount(userName, name)

			res.sendStatus(200)
		}
		catch (e) {
			res.sendStatus(400)
		}

	})


	router.post('/updateMailAccount', async function (req, res) {
		const userName = req.session.user
		const data = req.body

		try {
			await db.updateMailAccount(userName, data)
			res.sendStatus(200)
		}
		catch (e) {
			res.sendStatus(400)
		}
	})

	router.post('/createMailAccount', async function (req, res) {
		try {
			const data = await db.createMailAccount(req.session.user, req.body)
			res.json(data)
		}
		catch (e) {
			res.sendStatus(400)

		}
	})

	router.post('/getMailboxes', async function (req, res) {
		const userName = req.session.user
		const { name, addUnseenNb } = req.body
		try {
			const mailboxes = await mails.getMailboxes(userName, name, addUnseenNb)
			res.json(mailboxes)
		}
		catch (e) {
			console.log(e.message)
			res.status(400).send(e.message)
		}

	})

	router.post('/addMailbox', async function (req, res) {
		const userName = req.session.user
		const { name, mailboxName } = req.body

		try {
			await mails.addMailbox(userName, name, mailboxName)
			res.sendStatus(200)

		}
		catch (e) {
			res.sendStatus(400)
		}

	})

	router.post('/openMailbox', async function (req, res) {
		const userName = req.session.user
		const { name, mailboxName, idx } = req.body

		try {
			const messages = await mails.openMailbox(userName, name, mailboxName, idx)
			res.json(messages)
		}
		catch (e) {
			res.sendStatus(400)
		}

	})

	router.post('/openMessage', async function (req, res) {
		const userName = req.session.user
		const { name, mailboxName, seqNo, partID } = req.body

		try {
			const data = await mails.openMessage(userName, name, mailboxName, seqNo, partID)
			res.json(data)
		}
		catch (e) {
			res.sendStatus(400)
		}

	})


	router.post('/openAttachment', async function (req, res) {
		const userName = req.session.user
		const { name, mailboxName, seqNo, partID } = req.body

		try {
			const data = await mails.openAttachment(userName, name, mailboxName, seqNo, partID)
			res.json(data)

		}
		catch (e) {
			res.sendStatus(400)
		}

	})

	router.post('/deleteMessage', async function (req, res) {
		const userName = req.session.user
		const { name, mailboxName, seqNos } = req.body

		try {
			await mails.deleteMessage(userName, name, mailboxName, seqNos)
			res.sendStatus(200)

		}
		catch (e) {
			res.sendStatus(400)
		}

	})

	router.post('/moveMessage', async function (req, res) {
		const userName = req.session.user
		const { name, mailboxName, seqNos, targetName } = req.body

		try {
			await mails.moveMessage(userName, name, mailboxName, targetName, seqNos)
			res.sendStatus(200)

		}
		catch (e) {
			res.sendStatus(400)
		}

	})

	router.post('/sendMail', async function (req, res) {
		const userName = req.session.user
		const { accountName, data } = req.body

		try {
			const ret = await mails.sendMail(userName, accountName, data)
			console.log('sendMail', ret)
			res.sendStatus(200)
		}
		catch (e) {
			res.sendStatus(400)
		}
	})

}