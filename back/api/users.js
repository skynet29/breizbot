const router = require('express').Router()
const db = require('../lib/db')


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

module.exports = router