//@ts-check

const bcrypt = require('bcrypt')

const events = require('../lib/events')

const { collection, buildDbId } = require('../lib/dbUtil.js')

const db = collection('users')

module.exports = {

	getUserList: function (matchedUser) {

		//console.log('getUserList', matchedUser)

		let filter = {}
		if (matchedUser != undefined) {
			filter = {
				username: { $regex: `\w*${matchedUser}\w*` }
			}
		}

		console.log('getUserList')
		return db.find(filter, {
			projection: { pwd: 0, _id: 0 }
		}).toArray()
	},

	getUserInfo: function (username) {

		//console.log('getUserInfo', username)
		return db.findOne({ username })
	},

	getUserSettings: async function (username) {

		//console.log('getUserInfo', username)
		const info = await db.findOne({ username }, {projection: {settings: 1, _id: 0}})
		return info.settings || {}
	},

	setUserSettings: async function (username, settings) {

		//console.log('getUserInfo', username)
		const update = { '$set': { settings } }

		await db.updateOne({ username }, update)
	},

	getUserInfoById: function (id) {
		return db.findOne(buildDbId(id), { projection: { username: 1, _id: 0 } })
	},

	changePassword: async function (username, newPwd) {

		const pwd = await bcrypt.hash(newPwd, 10)
		const update = { '$set': { pwd, crypted: true } }

		await db.updateOne({ username }, update)

	},

	updateLastLoginDate: async function (username) {

		//console.log(`[DB] updateLastLoginDate`, username)
		var update = { '$set': { lastLoginDate: Date.now() } }

		await db.updateOne({ username }, update)

	},


	createUser: async function (data) {

		data.pwd = 'welcome'
		data.apps = ['folder', 'friends', 'share', 'youtube', 'gallery', 'jukebox']
		data.createDate = Date.now()
		data.lastLoginDate = 0

		await db.insertOne(data)
		events.emit('userAdded', data.username)

	},


	deleteUser: async function (username) {

		await db.deleteOne({ username })
		
		events.emit('userDeleted', username)
	},

	activateApp: async function (username, appName, activated) {
		const data = { apps: appName }
		let update = (activated) ? { $push: data } : { $pull: data }

		await db.updateOne({ username }, update)
	}

}


