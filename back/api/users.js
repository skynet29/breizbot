const router = require('express').Router()
const db = require('../lib/db')
const wss = require('../lib/wss')


router.get('/', function(req, res) {
	const {match} = req.query

	db.getUserList(match).then((data) => {
		res.json(data)
	})
	.catch(() => {
		res.sendStatus(400)
	})	
})

router.post('/', function(req, res) {
	db.createUser(req.body).then((data) => {
		res.json(data)
	})
	.catch(() => {
		res.sendStatus(400)
	})	
})

router.post('/changePwd', function(req, res) {
	const {newPwd} = req.body
	const userName = req.session.user

	db.changePassword(userName, newPwd).then(() => {
		res.sendStatus(200)
	})
	.catch(() => {
		res.sendStatus(400)
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
	const from = req.session.user

	db.addNotif(to, from, notif)
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

router.get('/getFriends', function(req, res) {
	console.log('getFriends', req.session.user)

	const userName = req.session.user
	db.getFriends(userName)
	.then((friends) => {
		res.json(friends.map((friend) => {
			return {
				friendUserName: friend, 
				isConnected: wss.isUserConnected(friend)
			}
		}))		
	})	
	.catch(() => {
		res.sendStatus(400)
	})

})
11
router.post('/addFriend', function(req, res) {
	console.log('addFriend', req.session.user)

	const userName = req.session.user
	const {friendUserName} = req.body

	db.addFriend(userName, friendUserName)
	.then(() => {
		res.sendStatus(200)	
	})	
	.catch(() => {
		res.sendStatus(400)
	})

})

module.exports = router