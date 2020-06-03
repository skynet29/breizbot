const router = require('express').Router()
const { getAppsInfo } = require('../lib/apps')


router.get('/all', async function (req, res) {
	const appsInfo = await getAppsInfo()
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


module.exports = router