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
		return db.getNotifs(to)
	})
	.then((notifs) => {
		console.log('notifs', notifs)
		wss.sendMessage(to, 'breizbot.notif', notifs)
		res.sendStatus(200)		
	})	
	.catch(() => {
		res.sendStatus(400)
	})

})

router.post('/removeNotif', function(req, res) {
	console.log('removeNotif', req.body)
	const {_id, to} = req.body

	db.removeNotif(_id)
	.then(() => {
		return db.getNotifs(to)
	})
	.then((notifs) => {
		console.log('notifs', notifs)
		wss.sendMessage(to, 'breizbot.notif', notifs)
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


module.exports = router