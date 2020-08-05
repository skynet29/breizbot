const config = require('../lib/config')
const db = require('../lib/db')
const { renderLogin, checkLogin } = require('../lib/util')

module.exports = function (app) {

	app.get('/', function (req, res) {
		if (req.session.connected) {
			const { user, userInfo } = req.session

			if (user == config.ADMIN_USER) {
				res.render('admin', {})
			}
			else {
				res.render('home', { pseudo: userInfo.pseudo })
			}
		}
		else {
			renderLogin(res)
		}
	})

	app.post('/', async function (req, res) {
		const { user, pwd } = req.body

		if (user == config.ADMIN_USER) {
			if (pwd == config.ADMIN_PWD) {
				req.session.connected = true
				req.session.user = user
				res.redirect('/')
			}
			else {
				renderLogin(res, { message: 'Bad password' })
			}
		}
		else {
			const data = await checkLogin(req, res)
			if (data === false) {
				return
			}
			db.updateLastLoginDate(user)
			req.session.connected = true
			req.session.user = user
			req.session.userInfo = data
			res.redirect('/')

		}


	})

	app.get('/logout', function (req, res) {
		req.session.connected = false
		req.session.destroy()

		res.redirect('/')
	})
}