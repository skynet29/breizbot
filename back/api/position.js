//@ts-check

const router = require('express').Router()
const wss = require('../lib/wss')
const dbFriends = require('../db/friends.js')

router.post('/position', async function (req, res) {
	const userName = req.session.user
	const coords = req.body

	//console.log('position', userName, data)

	try {
		const data = { userName, coords }
		const friends = await dbFriends.getPositionAuthFriends(userName)
		//console.log('friendsAuth', userName, friends)
		friends.forEach((friend) => {
			wss.sendNotifToUser(friend, 'breizbot.friendPosition', data)
		})
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

module.exports = router
