const path = require('path')

const getBrainjsLib = require('../lib/brainjs')
const apps = require('../lib/apps')

module.exports = function (app) {
	app.get('/apps/:app', async function (req, res) {
		console.log('requestedApp', req.params, req.query)
		if (req.session.connected) {
			const { app } = req.params
			const { userInfo } = req.session
			const appPath = path.join('/webapps/', app)
			req.query.$userName = req.session.user
			req.query.$appName = app


			const appInfo = await apps.getAppInfo(app)
			let styles = appInfo.styles || []
			styles = styles.map((fileName) => {
				return (fileName.startsWith('/')) ? fileName : path.join(appPath, fileName)
			})
			let scripts = appInfo.scripts || []

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