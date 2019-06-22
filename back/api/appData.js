const router = require('express').Router()
const db = require('../lib/db')


router.get('/', function(req, res) {
	const userName = req.session.user
	const appName = req.appName
	db.getAppData(userName, appName)
	.then((info) => {
		const data = (info && info.data) || {}
		console.log('data', data)

		res.json(data)
		
	})
	.catch((e) => {
		console.log('Error', e)
		res.status(400).send(e)
	})
})

router.post('/', function(req, res) {
	const userName = req.session.user
	const appName = req.appName
	const data = req.body
	db.saveAppData(userName, appName, data)
	.then(() => {
		res.sendStatus(200)
		
	})
	.catch((e) => {
		console.log('Error', e)
		
		res.status(400).send(e)
	})	
})


module.exports = router