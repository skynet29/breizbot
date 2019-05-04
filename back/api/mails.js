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
	const {name, mailboxName, pageNo} = req.body

	mails.openMailbox(userName, name, mailboxName, pageNo).then((messages) => {
		res.json(messages)
	})
	.catch((err) => {
		console.log('err', err)
		res.sendStatus(400)
	})	
})

router.post('/openMessage', function(req, res) {
	const userName = req.session.user
	const {name, mailboxName, seqNo, partID} = req.body

	mails.openMessage(userName, name, mailboxName, seqNo, partID).then((data) => {
		res.json(data)
	})
	.catch((err) => {
		console.log('err', err)
		res.sendStatus(400)
	})	
})


router.post('/openAttachment', function(req, res) {
	const userName = req.session.user
	const {name, mailboxName, seqNo, partID} = req.body

	mails.openAttachment(userName, name, mailboxName, seqNo, partID).then((data) => {
		res.json(data)
	})
	.catch((err) => {
		console.log('err', err)
		res.sendStatus(400)
	})	
})

router.post('/deleteMessage', function(req, res) {
	const userName = req.session.user
	const {name, mailboxName, seqNos} = req.body

	mails.deleteMessage(userName, name, mailboxName, seqNos).then(() => {
		res.sendStatus(200)
	})
	.catch((err) => {
		console.log('err', err)
		res.sendStatus(400)
	})	
})

router.post('/moveMessage', function(req, res) {
	const userName = req.session.user
	const {name, mailboxName, seqNos, targetName} = req.body

	mails.moveMessage(userName, name, mailboxName, targetName, seqNos).then(() => {
		res.sendStatus(200)
	})
	.catch((err) => {
		console.log('err', err)
		res.sendStatus(400)
	})	
})

module.exports = router