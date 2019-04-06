const path = require('path')

const getBrainjsLib = require('../lib/brainjs')
const apps = require('../lib/apps')

const sysApps = ['store', 'notif', 'video']

module.exports = function(app) {
	app.get('/apps/:app', function(req, res) {
		console.log('requestedApp', req.params, req.query)
		if (req.session.connected) {
			const {app} = req.params
			const {userInfo} = req.session
			const appPath = path.join('/webapps/', app)


			if (sysApps.includes(app) || app in userInfo.apps) {
				apps.getAppInfo(app).then((appInfo) => {
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
				})

			}
			else {
				const message = `Connected user '${req.session.user}' is not allowed to access this app`
				res.render('error', {message})
			}					
		}
		else {
			res.redirect('/')
		}
	})	
}