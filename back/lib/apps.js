const path = require('path')
const fs = require('fs-extra')

const appPath = path.join(__dirname, '../../front/src/webapps')

function getAppFolders() {
	return fs.readdir(appPath)
}

function getAppInfo(appName) {
	const propsPath = path.join(appPath, appName, 'app.json')
	return fs.readJson(propsPath)
}


async function getAppsInfo() {
	const folders = await getAppFolders()
	const promises = folders.map(async (appName) => {
		const props = await getAppInfo(appName)
		return {appName, props}
	})

	return Promise.all(promises)
}

module.exports = {
	getAppFolders,
	getAppsInfo,
	getAppInfo
}

