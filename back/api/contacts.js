const router = require('express').Router()
const dbContacts = require('../db/contacts.js')

router.post('/addContact', async function (req, res) {
	console.log('addContact', req.session.user, req.body)

	const userName = req.session.user

	try {
		await dbContacts.addContact(userName, req.body)
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.get('/getContacts', async function (req, res) {
	console.log('getContacts', req.session.user)

	const userName = req.session.user

	try {
		const contacts = await dbContacts.getContacts(userName)
		res.json(contacts)
	}
	catch (e) {
		res.sendStatus(400)
	}
})


router.delete('/removeContact/:id', async function (req, res) {
	console.log('removeContact', req.params)
	const { id } = req.params

	try {
		await dbContacts.removeContact(id)
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.post('/updateContactInfo/:id', async function (req, res) {
	console.log('updateContactInfo', req.params, req.body)
	const { id } = req.params

	try {
		await dbContacts.updateContactInfo(id, req.body)
		res.sendStatus(200)
	}
	catch (e) {
		console.log(e)
		res.sendStatus(400)
	}
})


module.exports = router