const router = require('express').Router()
const wss = require('../lib/wss')



router.post('/sendToUser', function(req, res) {
	//console.log('[RTC] sendToUser', req.params, req.body)
	const from = req.session.user

	let {to, data, type, srcId} = req.body

	if (data == undefined) {
		data = {}
	}
	data.from = from

	if (wss.sendMsgToUser(to, {
		type: 'notif',
		srcId,
		topic: 'breizbot.rtc.' + type,
		data
	})) {
		res.sendStatus(200);
	}
	else {
		res.status(404).send('Client not connected')
	}
})

router.post('/sendToClient', function(req, res) {
	//console.log('[RTC] sendToClient', req.params, req.body)
	
	const {destId, data, type, srcId} = req.body

	if (wss.sendToClient(destId, {
		topic: 'breizbot.rtc.' + type,
		srcId,
		data})) {
		res.sendStatus(200)
	}
	else {
		res.status(404).send('Client not found')
	}
})


module.exports = router