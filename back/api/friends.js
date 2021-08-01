//@ts-check

const router = require('express').Router()
const dbFriends = require('../db/friends.js')
const wss = require('../lib/wss')

router.get('/getFriends', async function (req, res) {

	const userName = req.session.user

	try {
		const friends = await dbFriends.getFriends(userName)
		res.json(friends.map((friend) => {
			return {
				friendUserName: friend,
				isConnected: wss.isUserConnected(friend)
			}
		}))
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.post('/getFriendInfo', async function (req, res) {
	const { friend } = req.body

	const userName = req.session.user

	try {
		const info = await dbFriends.getFriendInfo(userName, friend)
		res.json(info)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.post('/setFriendInfo', async function (req, res) {
	const { friend, groups, positionAuth } = req.body

	const userName = req.session.user

	try {
		await dbFriends.setFriendInfo(userName, friend, groups, positionAuth)
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.post('/addFriend', async function (req, res) {

	const userName = req.session.user
	const { friendUserName } = req.body

	try {
		await dbFriends.addFriend(userName, friendUserName)
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

module.exports = router