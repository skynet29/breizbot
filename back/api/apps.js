const router = require('express').Router()
const apps = require('../lib/apps')


router.get('/all', function(req, res) {
	apps.getAppsInfo()
	.then(function(appsInfo) {
		const {apps} = req.session.userInfo
		appsInfo.forEach((appInfo) => {
			appInfo.activated = (appInfo.appName in apps)
		})
		res.json(appsInfo)
		
	})
})

router.get('/myapp', function(req, res) {
	apps.getAppsInfo()
	.then(function(appsInfo) {
		const {apps} = req.session.userInfo
		const ret = appsInfo.filter((appInfo) => appInfo.appName in apps)
	
		res.json(ret)
		
	})
})



module.exports = router