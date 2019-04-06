const router = require('express').Router()
const wss = require('../lib/wss')



router.post('/sendToUser', function(req, res) {
	const from = req.session.user

	let {to, data, type} = req.body

	if (data == undefined) {
		data = {}
	}
	data.from = from

	const broker = wss.getBroker(to)
	if (broker.hasClient()) {
		broker.sendMessage('breizbot.rtc.' + type, data)
		res.sendStatus(200);
	}
	else {
		res.status(404).send('Client not connected')
	}
})

router.post('/sendToClient', function(req, res) {
	const from = req.session.user

	let {clientId, data, type} = req.body

	if (data == undefined) {
		data = {}
	}
	data.from = from

	if (wss.sendTo(clientId, 'breizbot.rtc.' + type, data)) {
		res.sendStatus(200)
	}
	else {
		res.status(404).send('Client not found')
	}
})


module.exports = router