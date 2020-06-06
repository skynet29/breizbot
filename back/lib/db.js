const { MongoClient, ObjectID } = require('mongodb')

const config = require('./config')
const events = require('./events')


var db = null

module.exports = {
	init: function () {
		return new Promise((resolve, reject) => {
			MongoClient.connect(config.dbUrl, (err, client) => {
				if (err) {
					reject(err)
					return
				}

				db = client.db(config.dbName)
				resolve(db)
			})
		})


	},

	collection: function (collectionName) {
		return db.collection(collectionName)
	},

	getUserList: function (matchedUser) {

		//console.log('getUserList', matchedUser)

		let filter = {}
		if (matchedUser != undefined) {
			filter = {
				username: { $regex: `\w*${matchedUser}\w*` }
			}
		}

		console.log('getUserList')
		return db.collection('users').find(filter, {
			projection: { pwd: 0, _id: 0 }
		}).toArray()
	},

	getUserInfo: function (username) {

		//console.log('getUserInfo', username)
		return db.collection('users').findOne({ username })
	},


	changePassword: async function (username, newPwd) {

		console.log(`[DB] changePassword`, username, newPwd)
		var update = { '$set': { pwd: newPwd } }

		await db.collection('users').updateOne({ username }, update)

	},

	updateLastLoginDate: async function (username) {

		//console.log(`[DB] updateLastLoginDate`, username)
		var update = { '$set': { lastLoginDate: Date.now() } }

		await db.collection('users').updateOne({ username }, update)

	},


	createUser: async function (data) {

		console.log(`[DB] createUser`, data)
		data.pwd = 'welcome'
		data.apps = []
		data.createDate = Date.now()
		data.lastLoginDate = 0

		await db.collection('users').insertOne(data)
		events.emit('userAdded', data.username)

	},


	deleteUser: async function (username) {

		console.log(`[DB] deleteUser`, username)

		await db.collection('users').deleteOne({ username })
		await db.collection('appData').deleteMany({ userName: username })
		await db.collection('contacts').deleteMany({ userName: username })
		await db.collection('friends').deleteMany({ $or: [{ username }, { friend: username }] })
		await db.collection('notifs').deleteMany({ $or: [{ from: username }, { to: username }] })

		events.emit('userdeleted', username)
	},

	activateApp: async function (username, appName, activated) {
		console.log(`[DB] activateApp`, username, appName, activated)
		const data = { apps: appName }
		let update = (activated) ? { $push: data } : { $pull: data }

		await db.collection('users').updateOne({ username }, update)
	},

	addNotif: function (to, from, notif) {
		console.log(`[DB] addNotif`, to, from, notif)
		db.collection('notifs').insertOne({ to, from, notif, date: Date.now() })
	},

	getNotifs: function (to) {
		//console.log('getNotifs')
		return db.collection('notifs').find({ to }).toArray()
	},

	getNotifCount: function (to) {
		//console.log('getNotifCount')
		return db.collection('notifs').countDocuments({ to })
	},

	removeNotif: async function (notifId) {
		console.log(`[DB] removeNotif`, notifId)
		await db.collection('notifs').deleteOne({ _id: new ObjectID(notifId) })
	},

	getFriends: async function (username) {
		//console.log(`[DB] getFriends`, userName)
		const friends = await db.collection('friends')
			.find({ username })
			.toArray()

		return friends.map((f) => f.friend)
	},

	getFriendGroups: async function (username, friend) {
		//console.log(`[DB] getFriends`, userName)
		const info = await db.collection('friends')
			.findOne({ username, friend })

		return info.groups
	},

	setFriendGroups: async function (username, friend, groups) {
		//console.log(`[DB] getFriends`, userName)
		await db.collection('friends')
			.updateOne({ username, friend }, { $set: { groups } })

	},

	addSharingGroup: async function (username, sharingGroupName) {
		await db.collection('users').update({ username }, { $addToSet: { sharingGroups: sharingGroupName } })
	},

	addFriend: async function (username, friend) {
		console.log(`[DB] addFriend`, username, friend)
		await db.collection('friends').insertOne({ username, friend, groups: [] })
		await db.collection('friends').insertOne({ username: friend, friend: username, groups: [] })
	},

	addContact: async function (userName, contactName, contactEmail) {
		console.log(`[DB] addContact`, userName, contactName, contactEmail)
		const info = await db.collection('contacts').findOne({ userName, contactEmail })
		if (info != null) {
			throw ('Contact already exists')
		}

		return db.collection('contacts').insertOne({
			userName,
			contactName,
			contactEmail
		})
	},

	getContacts: function (userName) {
		//console.log(`[DB] getContacts`, userName)
		return db.collection('contacts')
			.find({ userName }, { projection: { userName: 0 } })
			.sort({ contactName: 1 }).toArray()
	},

	removeContact: async function (contactId) {
		console.log(`[DB] removeContact`, contactId)
		await db.collection('contacts').deleteOne({ _id: new ObjectID(contactId) })
	},

	getAppData: function (userName, appName) {
		//console.log(`[DB] getAppData`, {userName, appName})

		return db.collection('appData').findOne({ userName, appName })
	},

	saveAppData: async function (userName, appName, data) {
		console.log(`[DB] saveAppData`, { userName, appName, data })

		const update = { '$set': { data } }

		await db.collection('appData').updateOne({ userName, appName }, update, { upsert: true })
	},


	getCountries: function () {
		//console.log(`[DB] getCountries`)

		return db.collection('cities').distinct('country')
	},

	getCities: function (country, search) {
		//console.log(`[DB] getCities`, country, search)

		return db.collection('cities')
			.find({ country, name: { $regex: `^(?i)${search}(?-i)\w*` } })
			.sort({ name: 1 })
			.toArray()
	}
}


