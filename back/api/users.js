//@ts-check

const router = require('express').Router()
const dbUsers = require('../db/users.js')
const config = require('../lib/config.js')

router.get('/', async function (req, res) {
	const { match } = req.query

	try {
		const data = await dbUsers.getUserList(match)
		res.json(data)
	}
	catch (e) {
		res.sendStatus(400)
	}
})


router.post('/', async function (req, res) {
	try {
		if (req.session.user != config.ADMIN_USER) {
			res.sendStatus(401)
		}
		else {
			await dbUsers.createUser(req.body)
			console.log('created')
			res.sendStatus(200)
		}
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.post('/resetPwd', async function (req, res) {
	try {
		if (req.session.user != config.ADMIN_USER) {
			res.sendStatus(401)
		}
		else {
			await dbUsers.resetPassword(req.body.userName)
			res.sendStatus(200)
		}
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.post('/changePwd', async function (req, res) {
	const { newPwd } = req.body
	const userName = req.session.user

	try {
		await dbUsers.changePassword(userName, newPwd)
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}
})



router.delete('/:userName', async function (req, res) {

	var userName = req.params.userName

	try {
		if (req.session.user != config.ADMIN_USER) {
			res.sendStatus(401)
		}
		else {
			await dbUsers.deleteUser(userName)
			res.sendStatus(200)
		}
	}
	catch (e) {
		res.sendStatus(400)
	}

})

router.post('/activateApp', async function (req, res) {

	const { appName, activated } = req.body

	try {
		await dbUsers.activateApp(req.session.user, appName, activated)
		req.session.userInfo = await dbUsers.getUserInfo(req.session.user)
		res.sendStatus(200)
	}
	catch (e) {
		console.error(e)
		res.sendStatus(400)
	}

})

router.post('/getUserSettings', async function (req, res) {

	try {
		const info = await dbUsers.getUserSettings(req.session.user)

		res.json(info)
	}
	catch (e) {
		console.error(e)
		res.sendStatus(400)
	}

})


router.post('/setUserSettings', async function (req, res) {

	try {
		await dbUsers.setUserSettings(req.session.user, req.body)
		req.session.userInfo.settings = req.body

		res.sendStatus(200)
	}
	catch (e) {
		console.error(e)
		res.sendStatus(400)
	}

})

module.exports = router