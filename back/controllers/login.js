const path = require('path')
const config = require('../lib/config')
const db = require('../lib/db')


module.exports = function(app) {

	app.get('/', function(req, res) {
		if (req.session.connected) {
			const {user, userInfo} = req.session

			if (user == config.ADMIN_USER) {
				res.render('admin', {})
			}
			else {
				res.render('home', {pseudo: userInfo.pseudo})
			}
		}
		else {
			res.render('login', {message: ''})
		}
	})

	app.post('/', function(req, res) {
		const {user, pwd} = req.body

		if (user == config.ADMIN_USER) {
			if (pwd == config.ADMIN_PWD) {
				req.session.connected = true
				req.session.user = user
				res.redirect('/')
			}
			else {
				res.render('login', {message: 'Bad password'})
			}
		}
		else {
			db.getUserInfo(user).then(function(data) {
				console.log('data', data)
				if (data == null) {
					res.render('login', {message: 'Unknown user'})
					return
				}
				if (data.pwd != pwd) {
					res.render('login', {message: 'Bad password'})
					return
				}
				db.updateLastLoginDate(user)
				req.session.connected = true
				req.session.user = user
				req.session.userInfo = data
				res.redirect('/')				
			})
			
		}


	})

	app.get('/logout', function(req, res) {
		req.session.connected = false
		req.session.destroy()

		res.redirect('/')
	})	
}