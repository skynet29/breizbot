const router = require('express').Router()
const wss = require('../lib/wss')


router.get('/broker/clients', function(req, res) {

	const clients = wss.getClients().map((client) => {
		const {path, clientId, userName, registeredTopics} = client
		return {path, clientId, userName, topics: Object.keys(registeredTopics)}
	})

	//console.log('clients', clients)
	res.json(clients)		

})

module.exports = router