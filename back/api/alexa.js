//@ts-check

const router = require('express').Router()
const wss = require('../lib/wss')


router.post('/auth', function(req, res) {

	const body = req.body

	console.log('auth', body)
	const destId = body.state
	delete body.state

	res.sendStatus(200)
	wss.sendToClient(destId, {topic: 'breizbot.alexa.auth', data: body})
})

module.exports = router