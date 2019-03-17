const router = require('express').Router()
const db = require('../lib/db')
const wss = require('../lib/wss')


router.get('/', function(req, res) {
	db.getUserList().then((data) => {
		res.json(data)
	})
})

router.post('/', function(req, res) {
	db.createUser(req.body).then((data) => {
		res.json(data)
	})
})

router.delete('/:userName',function(req, res) {

	var userName = req.params.userName

	db.deleteUser(userName).then((doc) => {
		res.sendStatus(200)
	})	
	.catch(() => {
		res.sendStatus(400)
	})	

})

router.post('/activateApp',function(req, res) {

	const {appName, activated} = req.body
	console.log('activateApp', appName, activated)

	if (activated) {
		req.session.userInfo.apps[appName] = {}
	}
	else {
		delete req.session.userInfo.apps[appName]
	}

	db.activateApp(req.session.user, appName, activated)
	.then(() => {
		res.sendStatus(200)
	})
	.catch(() => {
		res.sendStatus(400)
	})

})

router.post('/sendNotif', function(req, res) {
	console.log('sendNotif', req.body)
	const {to, notif} = req.body

	db.addNotif(to, notif)
	.then(() => {
		return db.getNotifCount(to)
	})
	.then((notifCount) => {
		console.log('notifCount', notifCount)
		wss.sendMessage(to, 'breizbot.notifCount', notifCount)
		res.sendStatus(200)		
	})	
	.catch(() => {
		res.sendStatus(400)
	})

})

router.delete('/removeNotif/:id', function(req, res) {
	console.log('removeNotif', req.params)
	const {id} = req.params
	const to = req.session.user

	db.removeNotif(id)
	.then(() => {
		return db.getNotifCount(to)
	})
	.then((notifCount) => {
		console.log('notifCount', notifCount)
		wss.sendMessage(to, 'breizbot.notifCount', notifCount)
		res.sendStatus(200)		
	})	
	.catch(() => {
		res.sendStatus(400)
	})

})

router.get('/getNotifs', function(req, res) {
	console.log('getNotifs', req.session.user)

	db.getNotifs(req.session.user)
	.then((notifs) => {
		res.json(notifs)		
	})	
	.catch(() => {
		res.sendStatus(400)
	})

})

router.get('/getNotifCount', function(req, res) {
	console.log('getNotifCount', req.session.user)

	db.getNotifCount(req.session.user)
	.then((notifCount) => {
		res.json(notifCount)		
	})	
	.catch(() => {
		res.sendStatus(400)
	})

})


module.exports = router