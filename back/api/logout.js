const router = require('express').Router()
const wss = require('../lib/wss')

router.post('/', function(req, res) {
	const sessionId = req.session.id

	//console.log('logout', sessionId)
	wss.getClients().find((client) => {
		if (client.sessionId == sessionId && client.path == '/hmi/') {
			wss.sendMsg(client, {type: 'notif', topic: 'breizbot.logout'})
		}
	})

	res.sendStatus(200)
})


module.exports = router