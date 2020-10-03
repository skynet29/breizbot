//@ts-check

const router = require('express').Router()
const dbAppData = require('../db/appData.js')


router.get('/', async function (req, res) {
	const userName = req.session.user
	// @ts-ignore
	const appName = req.appName

	try {
		const info = await dbAppData.getAppData(userName, appName)
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
	// @ts-ignore
	const appName = req.appName
	const data = req.body
	try {
		dbAppData.saveAppData(userName, appName, data)
		res.sendStatus(200)
	}
	catch (e) {
		console.log('Error', e)

		res.status(400).send(e)
	}
})


module.exports = router