const router = require('express').Router()
const wss = require('../lib/wss')


router.post('/auth', function(req, res) {

	const body = req.body

	console.log('auth', body)
	const destId = body.state
	delete body.state

	res.sendStatus(200)
	wss.sendTo(undefined, destId, 'breizbot.alexa.auth', body)
})

module.exports = router