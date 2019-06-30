const router = require('express').Router()

const qwant = require("qwant-api")
 
module.exports = function(ctx) {

	router.post('/search', function(req, res) {
		console.log('browser/search', req.body)

		const {query} = req.body

		qwant.search("web", { query, count: 10, offset: 1, language: "french" }, function(err, data){
		    if (err) {
		    	res.sendStatus('404')
		    }
		    else {
		    	res.json(data)
		    }
		})		

	})

	return router

}

