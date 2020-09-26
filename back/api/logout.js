//@ts-check

const router = require('express').Router()
const wss = require('../lib/wss')

router.post('/', function(req, res) {
	const sessionId = req.session.id

	//console.log('logout', sessionId)
	wss.logout(sessionId)

	res.sendStatus(200)
})


module.exports = router