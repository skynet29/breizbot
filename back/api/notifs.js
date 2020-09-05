const router = require('express').Router()
const dbNotifs = require('../db/notifs.js')
const wss = require('../lib/wss')


router.post('/sendNotif', async function (req, res) {
	console.log('sendNotif', req.body)
	const { to, notif } = req.body
	const from = req.session.user

	try {
		await dbNotifs.addNotif(to, from, notif)
		const notifCount = await dbNotifs.getNotifCount(to)
		wss.sendNotifToUser(to, 'breizbot.notifCount', notifCount)
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
		await dbNotifs.removeNotif(id)
		const notifCount = await dbNotifs.getNotifCount(to)
		wss.sendNotifToUser(to, 'breizbot.notifCount', notifCount)
		res.sendStatus(200)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.get('/getNotifs', async function (req, res) {
	console.log('getNotifs', req.session.user)

	try {
		const notifs = await dbNotifs.getNotifs(req.session.user)
		res.json(notifs)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

router.get('/getNotifCount', async function (req, res) {
	console.log('getNotifCount', req.session.user)

	try {
		const notifCount = await dbNotifs.getNotifCount(req.session.user)
		res.json(notifCount)
	}
	catch (e) {
		res.sendStatus(400)
	}
})

module.exports = router