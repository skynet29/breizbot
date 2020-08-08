const router = require('express').Router()
const wss = require('../lib/wss')

router.post('/position', async function (req, res) {
	const userName = req.session.user
	const data = req.body

	//console.log('position', userName, data)

	try {
		await wss.sendPositionToAuthFriend(userName, data)
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

module.exports = router
