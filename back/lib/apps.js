const path = require('path')
const fs = require('fs-extra')

const appPath = path.join(__dirname, '../../front/src/webapps')

function getAppFolders() {
	return fs.readdir(appPath)
}

function getAppInfo(appName) {
	const propsPath = path.join(appPath, appName, 'app.json')
	return fs.readJson(propsPath)
		.then(function(props) {
			return props
		})
		.catch(function(e) {
			return {
				iconCls: 'fa fa-question fa-2x',
				colorCls: 'w3-blue',
				title: appName
			}
		})
}


function getPropFiles(folders) {
	//console.log('folders', folders)
	const promises = folders.filter((name) => name != 'store').map(function(appName) {

		return getAppInfo(appName)
				.then(function(props) {
					//console.log('props', props)
					return {appName, props}
				})

	})

	return Promise.all(promises)
}

function getAppsInfo() {
	return getAppFolders().then(getPropFiles)
}

module.exports = {
	getAppFolders,
	getAppsInfo,
	getAppInfo
}

