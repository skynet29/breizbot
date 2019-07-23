module.exports = function(app) {

	app.get('/alexa/authresponse', function(req, res) {	
		console.log('authresponse')
		res.render('alexa', {})
	})


}