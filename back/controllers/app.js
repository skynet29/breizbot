//@ts-check

const path = require('path')

const getBrainjsLib = require('../lib/brainjs')
const apps = require('../lib/apps')
const dbUsers = require('../db/users.js')

module.exports = function (app) {
	app.get('/apps/:app', async function (req, res) {
		console.log('requestedApp', req.params, req.query)
		const { app } = req.params
		if (app == 'cast') {
			const { id } = req.query

			const userInfo = await dbUsers.getUserInfoFromId(id)
			//console.log('userInfo', userInfo)
			if (userInfo != null) {
				req.session.connected = true
				req.session.user = userInfo.username
				req.session.userInfo = userInfo
			}
		}
		if (req.session.connected) {
			const { userInfo } = req.session
			const appPath = path.join('/webapps/', app)
			req.query.$userName = req.session.user
			req.query.$appName = app
			req.query.$id = req.session.userInfo._id.toString()


			const appInfo = await apps.getAppInfo(app)
			let styles = appInfo.styles || []
			styles = styles.map((fileName) => {
				return (fileName.startsWith('/')) ? fileName : path.join(appPath, fileName)
			})
			let scripts = appInfo.scripts || []
			scripts = scripts.map((fileName) => {
				return (fileName.startsWith('/')) ? fileName : path.join(appPath, fileName)
			})

			const brainjs = appInfo.brainjs || []
			getBrainjsLib(brainjs, scripts, styles)

			res.render('app', {
				appName: app,
				title: appInfo.title,
				pseudo: userInfo.pseudo,
				styles,
				scripts,
				params: JSON.stringify(req.query)
			})

		}
		else {
			res.render('error', { message: 'Your session has expired' })
		}
	})
}