const router = require('express').Router()
const wss = require('../lib/wss')



router.post('/sendToUser/:srcId', function(req, res) {
	//console.log('[RTC] sendToUser', req.params, req.body)
	const from = req.session.user
	const {srcId} =  req.params

	let {to, data, type} = req.body

	if (data == undefined) {
		data = {}
	}
	data.from = from

	const broker = wss.getBroker(to)
	if (broker.hasClient()) {
		broker.sendMessage(srcId, 'breizbot.rtc.' + type, data)
		res.sendStatus(200);
	}
	else {
		res.status(404).send('Client not connected')
	}
})

router.post('/sendToClient/:srcId', function(req, res) {
	//console.log('[RTC] sendToClient', req.params, req.body)
	const {srcId} =  req.params

	const {destId, data, type} = req.body

	if (wss.sendTo(srcId, destId, 'breizbot.rtc.' + type, data)) {
		res.sendStatus(200)
	}
	else {
		res.status(404).send('Client not found')
	}
})


module.exports = router