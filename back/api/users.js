const router = require('express').Router()
const dbUSers = require('../db/users.js')

router.get('/', async function (req, res) {
	const { match } = req.query

	try {
		const data = await dbUSers.getUserList(match)
		res.json(data)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.get('/getSharingGroups', async function (req, res) {
	try {
		const info = await dbUSers.getUserInfo(req.session.user)
		res.json(info.sharingGroups)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.post('/addSharingGroup', async function (req, res) {
	const { sharingGroupName } = req.body
	try {
		await dbUSers.addSharingGroup(req.session.user, sharingGroupName)
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.post('/', async function (req, res) {
	try {
		await dbUSers.createUser(req.body)
		console.log('created')
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.post('/changePwd', async function (req, res) {
	const { newPwd } = req.body
	const userName = req.session.user

	try {
		await dbUSers.changePassword(userName, newPwd)
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}
})



router.delete('/:userName', async function (req, res) {

	var userName = req.params.userName

	try {
		await dbUSers.deleteUser(userName)
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}

})

router.post('/activateApp', async function (req, res) {

	const { appName, activated } = req.body
	console.log('activateApp', appName, activated)

	try {
		await dbUSers.activateApp(req.session.user, appName, activated)
		req.session.userInfo = await dbUSers.getUserInfo(req.session.user)
		res.sendStatus(200)
	}
	catch (e) {
		console.error(e)
		res.sendStatus(400)
	}

})


module.exports = router