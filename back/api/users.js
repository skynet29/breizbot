const router = require('express').Router()
const db = require('../lib/db')
const wss = require('../lib/wss')
const fetch = require('node-fetch')


router.get('/', async function (req, res) {
	const { match } = req.query

	try {
		const data = await db.getUserList(match)
		res.json(data)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.get('/getSharingGroups', async function (req, res) {
	try {
		const info = await db.getUserInfo(req.session.user)
		res.json(info.sharingGroups)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.post('/addSharingGroup', async function (req, res) {
	const { sharingGroupName } = req.body
	try {
		await db.addSharingGroup(req.session.user, sharingGroupName)
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.post('/', async function (req, res) {
	try {
		await db.createUser(req.body)
		console.log('created')
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.post('/changePwd', async function (req, res) {
	const { newPwd } = req.body
	const userName = req.session.user

	try {
		await db.changePassword(userName, newPwd)
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.post('/computeAlexaUserId', async function (req, res) {
	const { accessToken } = req.body
	const userName = req.session.user

	try {
		const amazonProfileURL = 'https://api.amazon.com/user/profile?access_token=' + accessToken
		const resp = await fetch(amazonProfileURL)
		console.log('resp', resp)
		const { user_id } = await resp.json()
		console.log('user_id', user_id)

		await db.setAlexaUserId(userName, user_id)

		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}
})




router.delete('/:userName', async function (req, res) {

	var userName = req.params.userName

	try {
		await db.deleteUser(userName)
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}

})

router.post('/activateApp', async function (req, res) {

	const { appName, activated } = req.body
	console.log('activateApp', appName, activated)

	try {
		await db.activateApp(req.session.user, appName, activated)
		req.session.userInfo = await db.getUserInfo(req.session.user)
		res.sendStatus(200)
	}
	catch (e) {
		console.error(e)
		res.sendStatus(400)
	}

})



router.post('/sendNotif', async function (req, res) {
	console.log('sendNotif', req.body)
	const { to, notif } = req.body
	const from = req.session.user

	try {
		await db.addNotif(to, from, notif)
		const notifCount = await db.getNotifCount(to)
		wss.sendTopic(to, 'breizbot.notifCount', notifCount)
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}

})


router.delete('/removeNotif/:id', async function (req, res) {
	console.log('removeNotif', req.params)
	const { id } = req.params
	const to = req.session.user

	try {
		await db.removeNotif(id)
		const notifCount = await db.getNotifCount(to)
		wss.sendTopic(to, 'breizbot.notifCount', notifCount)
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.get('/getNotifs', async function (req, res) {
	console.log('getNotifs', req.session.user)

	try {
		const notifs = await db.getNotifs(req.session.user)
		res.json(notifs)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.get('/getNotifCount', async function (req, res) {
	console.log('getNotifCount', req.session.user)

	try {
		const notifCount = await db.getNotifCount(req.session.user)
		res.json(notifCount)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.get('/getFriends', async function (req, res) {
	console.log('getFriends', req.session.user)

	const userName = req.session.user

	try {
		const friends = await db.getFriends(userName)
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
	console.log('getFriendInfo', req.session.user)

	const userName = req.session.user

	try {
		const info = await db.getFriendInfo(userName, friend)
		res.json(info)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.post('/setFriendInfo', async function (req, res) {
	const { friend, groups, positionAuth } = req.body
	console.log('setFriendInfo', req.session.user)

	const userName = req.session.user

	try {
		await db.setFriendInfo(userName, friend, groups, positionAuth)
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.post('/addFriend', async function (req, res) {
	console.log('addFriend', req.session.user)

	const userName = req.session.user
	const { friendUserName } = req.body

	try {
		await db.addFriend(userName, friendUserName)
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.post('/addContact', async function (req, res) {
	console.log('addContact', req.session.user)

	const userName = req.session.user
	const { name, email } = req.body

	try {
		await db.addContact(userName, name, email)
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.get('/getContacts', async function (req, res) {
	console.log('getContacts', req.session.user)

	const userName = req.session.user

	try {
		const contacts = await db.getContacts(userName)
		res.json(contacts)
	}
	catch (e) {
		res.sendStatus(400)
	}
})


router.delete('/removeContact/:id', async function (req, res) {
	console.log('removeContact', req.params)
	const { id } = req.params

	try {
		await db.removeContact(id)
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

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