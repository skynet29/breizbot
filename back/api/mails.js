const router = require('express').Router()
const db = require('../lib/db')
const mails = require('../lib/mails')


router.get('/', function(req, res) {
	const userName = req.session.user

	db.getMailAccounts(userName).then((accounts) => {

		res.json(accounts.map((acc) => acc.name))
	})
	.catch(() => {
		res.sendStatus(400)
	})	
})

router.post('/', function(req, res) {
	db.createMailAccount(req.session.user, req.body).then((data) => {
		res.json(data)
	})
	.catch(() => {
		res.sendStatus(400)
	})	
})

router.post('/getMailboxes', function(req, res) {
	const userName = req.session.user
	const {name} = req.body

	mails.getMailboxes(userName, name).then((mailboxes) => {
		res.json(mailboxes)
	})
	.catch((err) => {
		console.log('err', err)
		res.sendStatus(400)
	})	
})

router.post('/openMailbox', function(req, res) {
	const userName = req.session.user
	const {name, mailboxName} = req.body

	mails.openMailbox(userName, name, mailboxName).then((messages) => {
		res.json(messages)
	})
	.catch((err) => {
		console.log('err', err)
		res.sendStatus(400)
	})	
})

module.exports = router