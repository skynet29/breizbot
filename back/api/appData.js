const router = require('express').Router()
const db = require('../lib/db')


router.get('/', async function (req, res) {
	const userName = req.session.user
	const appName = req.appName

	try {
		const info = await db.getAppData(userName, appName)
		const data = (info && info.data) || {}
		console.log('data', data)

		res.json(data)

	}
	catch (e) {
		console.log('Error', e)
		res.status(400).send(e)
	}
})

router.post('/', async function (req, res) {
	const userName = req.session.user
	const appName = req.appName
	const data = req.body
	try {
		db.saveAppData(userName, appName, data)
		res.sendStatus(200)
	}
	catch (e) {
		console.log('Error', e)

		res.status(400).send(e)
	}
})


module.exports = router