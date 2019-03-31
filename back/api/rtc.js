const router = require('express').Router()
const wss = require('../lib/wss')



router.post('/send', function(req, res) {
	const from = req.session.user

	const {to, data, type} = req.body

	const broker = wss.getBroker(to)
	if (broker.hasClient()) {
		broker.sendMessage('breizbot.rtc.' + type, {from, data})
		res.sendStatus(200);
	}
	else {
		res.status(404).send('Client not connected')
	}
})


module.exports = router