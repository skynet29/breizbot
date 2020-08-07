const bcrypt = require('bcrypt')

const events = require('./events')

const { collection, buildDbId } = require('./dbUtil.js')


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
		return collection('users').find(filter, {
			projection: { pwd: 0, _id: 0 }
		}).toArray()
	},

	getUserInfo: function (username) {

		//console.log('getUserInfo', username)
		return collection('users').findOne({ username })
	},

	getUserInfoById: function (id) {
		return collection('users').findOne(buildDbId(id), { projection: { username: 1, _id: 0 } })
	},

	getMusicByArtist(owner, artist) {
		return collection('music-songs').find({ owner, artist: { $regex: artist, $options: 'i' } }).toArray()
	},

	getSongById(id) {
		return collection('music-songs').findOne(buildDbId(id))
	},

	changePassword: async function (username, newPwd) {

		console.log(`[DB] changePassword`, username)
		const pwd = await bcrypt.hash(newPwd, 10)
		const update = { '$set': { pwd, crypted: true } }

		await collection('users').updateOne({ username }, update)

	},

	setAlexaUserId: async function (username, alexaUserId) {
		const update = { '$set': { alexaUserId } }

		await collection('users').updateOne({ username }, update)
	},

	updateLastLoginDate: async function (username) {

		//console.log(`[DB] updateLastLoginDate`, username)
		var update = { '$set': { lastLoginDate: Date.now() } }

		await collection('users').updateOne({ username }, update)

	},


	createUser: async function (data) {

		console.log(`[DB] createUser`, data)
		data.pwd = 'welcome'
		data.apps = []
		data.createDate = Date.now()
		data.lastLoginDate = 0

		await collection('users').insertOne(data)
		events.emit('userAdded', data.username)

	},


	deleteUser: async function (username) {

		console.log(`[DB] deleteUser`, username)

		await collection('users').deleteOne({ username })
		await collection('appData').deleteMany({ userName: username })
		await collection('contacts').deleteMany({ userName: username })
		await collection('friends').deleteMany({ $or: [{ username }, { friend: username }] })
		await collection('notifs').deleteMany({ $or: [{ from: username }, { to: username }] })

		events.emit('userdeleted', username)
	},

	activateApp: async function (username, appName, activated) {
		console.log(`[DB] activateApp`, username, appName, activated)
		const data = { apps: appName }
		let update = (activated) ? { $push: data } : { $pull: data }

		await collection('users').updateOne({ username }, update)
	},

	addNotif: function (to, from, notif) {
		console.log(`[DB] addNotif`, to, from, notif)
		collection('notifs').insertOne({ to, from, notif, date: Date.now() })
	},

	getNotifs: function (to) {
		//console.log('getNotifs')
		return collection('notifs').find({ to }).toArray()
	},

	getNotifCount: function (to) {
		//console.log('getNotifCount')
		return collection('notifs').countDocuments({ to })
	},

	removeNotif: async function (notifId) {
		console.log(`[DB] removeNotif`, notifId)
		await collection('notifs').deleteOne(buildDbId(notifId))
	},

	getFriends: async function (username) {
		//console.log(`[DB] getFriends`, userName)
		const friends = await collection('friends')
			.find({ username })
			.toArray()

		return friends.map((f) => f.friend)
	},

	getFriendInfo: async function (username, friend) {
		//console.log(`[DB] getFriends`, userName)
		const info = await collection('friends')
			.findOne({ username, friend })

		return info
	},

	getPositionAuthFriends: async function (username) {
		const friends = await collection('friends')
			.find({ username, positionAuth: true }).toArray()

		return friends.map((f) => f.friend)
	},

	setFriendInfo: async function (username, friend, groups, positionAuth) {
		//console.log(`[DB] getFriends`, userName)
		await collection('friends')
			.updateOne({ username, friend }, { $set: { groups, positionAuth } })

	},

	addSharingGroup: async function (username, sharingGroupName) {
		await collection('users').update({ username }, { $addToSet: { sharingGroups: sharingGroupName } })
	},

	addFriend: async function (username, friend) {
		console.log(`[DB] addFriend`, username, friend)
		await collection('friends').insertOne({ username, friend, groups: [] })
		await collection('friends').insertOne({ username: friend, friend: username, groups: [] })
	},

	addContact: async function (userName, contactName, contactEmail) {
		console.log(`[DB] addContact`, userName, contactName, contactEmail)
		const info = await collection('contacts').findOne({ userName, contactEmail })
		if (info != null) {
			throw ('Contact already exists')
		}

		return collection('contacts').insertOne({
			userName,
			contactName,
			contactEmail
		})
	},

	getContacts: function (userName) {
		//console.log(`[DB] getContacts`, userName)
		return collection('contacts')
			.find({ userName }, { projection: { userName: 0 } })
			.sort({ contactName: 1 }).toArray()
	},

	removeContact: async function (contactId) {
		console.log(`[DB] removeContact`, contactId)
		await collection('contacts').deleteOne(buildDbId(contactId))
	},

	getAppData: function (userName, appName) {
		//console.log(`[DB] getAppData`, {userName, appName})

		return collection('appData').findOne({ userName, appName })
	},

	saveAppData: async function (userName, appName, data) {
		console.log(`[DB] saveAppData`, { userName, appName, data })

		const update = { '$set': { data } }

		await collection('appData').updateOne({ userName, appName }, update, { upsert: true })
	},


	getCountries: function () {
		//console.log(`[DB] getCountries`)

		return collection('cities').distinct('country')
	},

	getCities: function (country, search) {
		//console.log(`[DB] getCities`, country, search)

		return collection('cities')
			.find({ country, name: { $regex: `^(?i)${search}(?-i)\w*` } })
			.sort({ name: 1 })
			.toArray()
	}

}


