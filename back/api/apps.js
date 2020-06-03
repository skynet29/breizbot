const router = require('express').Router()
const apps = require('../lib/apps')


router.get('/all', async function (req, res) {
	apps.getAppsInfo().then((appsInfo) => {
		const { apps } = req.session.userInfo
		appsInfo.forEach((appInfo) => {
			if (!Array.isArray(apps)) {
				appInfo.activated = (appInfo.appName in apps)
			}
			else {
				appInfo.activated = apps.includes(appInfo.appName)
			}
		})
		res.json(appsInfo)

	})

})


module.exports = router