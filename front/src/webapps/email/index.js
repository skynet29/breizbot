module.exports = function (ctx, router) {

	const db = require('./lib/db')(ctx.db)
	const mails = require('./lib/mails')(ctx)
	const { events } = ctx

	
	router.get('/getMailAccounts', async function (req, res) {

		try {
			const accounts = await db.getMailAccounts()

			res.json(accounts.map((acc) => acc.name))
		}
		catch (e) {
			res.sendStatus(400)
		}
	})

	router.post('/getMailAccount', async function (req, res) {
		const { name } = req.body

		try {
			const account = await db.getMailAccount(name)
			account.smtpUser = account.smtpUser || account.user
			account.smtpPwd = account.smtpPwd || account.pwd

			res.json(account)
		}
		catch (e) {
			res.sendStatus(400)
		}

	})

	router.post('/removeMailAccount', async function (req, res) {
		const { name } = req.body

		try {
			await db.removeMailAccount(name)

			res.sendStatus(200)
		}
		catch (e) {
			res.sendStatus(400)
		}

	})


	router.post('/updateMailAccount', async function (req, res) {
		const data = req.body

		try {
			await db.updateMailAccount(data)
			res.sendStatus(200)
		}
		catch (e) {
			res.sendStatus(400)
		}
	})

	router.post('/createMailAccount', async function (req, res) {
		try {
			const data = await db.createMailAccount(req.body)
			res.json(data)
		}
		catch (e) {
			res.sendStatus(400)

		}
	})

	router.post('/getMailboxes', async function (req, res) {
		const { name, addUnseenNb } = req.body
		try {
			const mailboxes = await mails.getMailboxes(name, addUnseenNb)
			res.json(mailboxes)
		}
		catch (e) {
			console.log(e.message)
			res.status(400).send(e.message)
		}

	})

	router.post('/addMailbox', async function (req, res) {
		const { name, mailboxName } = req.body

		try {
			await mails.addMailbox(name, mailboxName)
			res.sendStatus(200)

		}
		catch (e) {
			res.sendStatus(400)
		}

	})

	router.post('/openMailbox', async function (req, res) {
		const { name, mailboxName, idx } = req.body

		try {
			const messages = await mails.openMailbox(name, mailboxName, idx)
			res.json(messages)
		}
		catch (e) {
			console.error(e)
			res.sendStatus(400)
		}

	})

	router.post('/openMessage', async function (req, res) {
		const { name, mailboxName, seqNo, partID } = req.body

		try {
			const data = await mails.openMessage(name, mailboxName, seqNo, partID)
			res.json(data)
		}
		catch (e) {
			res.sendStatus(400)
		}

	})


	router.post('/openAttachment', async function (req, res) {
		const { name, mailboxName, seqNo, partID } = req.body

		try {
			const data = await mails.openAttachment(name, mailboxName, seqNo, partID)
			res.json(data)

		}
		catch (e) {
			res.sendStatus(400)
		}

	})

	router.post('/deleteMessage', async function (req, res) {
		const { name, mailboxName, seqNos } = req.body

		try {
			await mails.deleteMessage(name, mailboxName, seqNos)
			res.sendStatus(200)

		}
		catch (e) {
			res.sendStatus(400)
		}

	})

	router.post('/moveMessage', async function (req, res) {
		const { name, mailboxName, seqNos, targetName } = req.body

		try {
			await mails.moveMessage(name, mailboxName, targetName, seqNos)
			res.sendStatus(200)

		}
		catch (e) {
			res.sendStatus(400)
		}

	})

	router.post('/sendMail', async function (req, res) {
		const { accountName, data } = req.body

		try {
			const ret = await mails.sendMail(accountName, data)
			console.log('sendMail', ret)
			res.sendStatus(200)
		}
		catch (e) {
			res.sendStatus(400)
		}
	})

}