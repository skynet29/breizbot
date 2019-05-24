const router = require('express').Router()
const wss = require('../lib/wss')


router.get('/drive', function(req, res) {
	console.log('/drive', req.session.user)

	const userName = req.session.user

	//console.log('clients', clients)
	wss.callService(userName, 'homebox.media.drive').then((result) => {
		res.json(result)		
	})
	.catch((err) => {
		res.status(400).send(err)
	})

})


router.post('/list', function(req, res) {
	console.log('/list', req.session.user)

	const userName = req.session.user
	const data = req.body

	//console.log('clients', clients)
	wss.callService(userName, 'homebox.media.list', data).then((result) => {
		res.json(result)		
	})

})

module.exports = router