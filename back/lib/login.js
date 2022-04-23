const path = require('path')
const dbUsers = require('../db/users.js')
const dbFriends = require('../db/friends.js')
const bcrypt = require('bcrypt')


const cloudPath = require('./config.js').CLOUD_HOME

function renderLogin(res, options) {

	options = Object.assign({
		message: '',
		state: '',
		redirect_uri: ''
	}, options)

	options.currentYear = new Date().getFullYear()

	console.log('render login', options)
	res.render('login', options)
}

async function checkLogin(req, res) {
	const { user, pwd } = req.body

	const data = await dbUsers.getUserInfo(user)
	console.log('checkLogin', user.blue)
	if (data == null) {
		renderLogin(res, { message: 'Unknown user' })
		return false
	}
	let match = false
	if (data.crypted === true) {
		match = await bcrypt.compare(pwd, data.pwd)
	}
	else {
		match = (data.pwd === pwd)
	}
	if (!match) {
		renderLogin(res, { message: 'Bad password' })
		console.log('pwd', pwd.red)
		return false
	}

	return data
}


async function getFilePathChecked(user, filePath, friendUser) {
	let rootPath = path.join(cloudPath, user, filePath)
	if (friendUser != undefined && friendUser != '') {
		const info = await dbFriends.getFriendInfo(friendUser, user)
		const group = filePath.split('/')[1]
		if (info == null || !info.groups.includes(group)) {
			throw 'access not authroized'
		}
		rootPath = path.join(cloudPath, friendUser, 'share', filePath)
	}
	return rootPath
}


module.exports = {
	renderLogin,
	checkLogin,
    getFilePathChecked
}