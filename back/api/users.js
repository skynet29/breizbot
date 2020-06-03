const router = require('express').Router()
const db = require('../lib/db')
const wss = require('../lib/wss')


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

router.post('/', async function (req, res) {
	try {
		const data = await db.createUser(req.body)
		res.json(data)
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
		res.json(data)
	}
	catch (e) {
		res.sendStatus(400)
	}
})


router.delete('/:userName', async function (req, res) {

	var userName = req.params.userName

	try {
		await db.deleteUser(userName)
		res.json(data)
	}
	catch (e) {
		res.sendStatus(400)
	}

})

router.post('/activateApp', async function (req, res) {

	const { appName, activated } = req.body
	console.log('activateApp', appName, activated)

	if (activated) {
		req.session.userInfo.apps[appName] = {}
	}
	else {
		delete req.session.userInfo.apps[appName]
	}

	try {
		const data = await db.activateApp(req.session.user, appName, activated)
		res.json(data)
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
		await wss.sendToFriends(userName, 'breizbot.friendPosition', {
			userName, coords: data
		})
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

module.exports = router