const {MongoClient,  ObjectID} = require('mongodb')

const config = require('./config')


var db = null

module.exports =  {
	init: function() {
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

	collection: function(collectionName) {
		return db.collection(collectionName)
	},

	getUserList: function(matchedUser) {

		console.log('getUserList', matchedUser)

		let filter = {}
		if (matchedUser != undefined) {
			filter = {
				username: {$regex: `\w*${matchedUser}\w*`}
			}
		}

		console.log('getUserList')
		return db.collection('users').find(filter, {
			projection: {pwd:0,_id:0}
		}).toArray()
	},

	getUserInfo: function(username) {

		console.log('getUserInfo', username)
		return db.collection('users').findOne({username})
	},


	changePassword: function(username, newPwd) {

		console.log(`[DB] changePassword`, username, newPwd)
		var update = {'$set': {pwd: newPwd}}

		return db.collection('users').updateOne({username}, update)

	},

	updateLastLoginDate: function(username) {

		console.log(`[DB] updateLastLoginDate`, username)
		var update = {'$set': {lastLoginDate: Date.now()}}

		return db.collection('users').updateOne({username}, update)

	},


	createUser: function(data) {

		console.log(`[DB] createUser`, data)
		data.pwd = 'welcome'
		data.apps = {}
		data.createDate = Date.now()
		data.lastLoginDate = 0

		return db.collection('users').insertOne(data)
	},


	deleteUser: function(username) {

		console.log(`[DB] deleteUser`, username)

		return db.collection('users').deleteOne({username})
	},

	activateApp: function(username, appName, activated) {
		console.log(`[DB] activateApp`, username, appName, activated)
		return db.collection('users').findOne({username}).then((info) => {
			const {apps} = info
			if (activated) {
				apps[appName] = {}
			}
			else {
				delete apps[appName]
			}
			console.log('apps', apps)
			const update = {'$set': {apps}}

			return db.collection('users').updateOne({username}, update) 
		})
	},

	addNotif: function(to, from, notif) {
		console.log(`[DB] addNotif`, to, from, notif)
		return db.collection('notifs').insertOne({to, from, notif, date: Date.now()})
	},

	getNotifs: function(to) {
		console.log('getNotifs')
		return db.collection('notifs').find({to}).toArray()
	},

	getNotifCount: function(to) {
		console.log('getNotifCount')
		return db.collection('notifs').countDocuments({to})
	},

	removeNotif: function(notifId) {
		console.log(`[DB] removeNotif`, notifId)
		return db.collection('notifs').deleteOne({_id: new ObjectID(notifId)})
	},	

	getFriends: function(userName) {
		console.log(`[DB] getFriends`, userName)
		return db.collection('friends').find({
			$or: [{user1: userName}, {user2: userName}]
		}).toArray().then((friends) => {
			return friends.map((friend) => {
				return (friend.user1 == userName) ? friend.user2 : friend.user1
			})
		})

	
	},

	addFriend: function(userName, friendUserName) {
		console.log(`[DB] addFriend`, userName, friendUserName)
		return db.collection('friends').insertOne({user1: userName, user2: friendUserName})
	},

	addContact: function(userName, contactName, contactEmail) {
		console.log(`[DB] addContact`, userName, contactName, contactEmail)
		return db.collection('contacts')
			.findOne({userName, contactEmail})
			.then((info) => {
				if (info != null) {
					return Promise.reject('Contact already exists')
				}
				return db.collection('contacts').insertOne({
					userName,
					contactName,
					contactEmail
				})				
		})


	},

	getContacts: function(userName) {
		console.log(`[DB] getContacts`, userName)
		return db.collection('contacts').find({
			userName
		}, 
		{
			projection: {userName: 0}
		}).sort({contactName: 1}).toArray()
	},

	removeContact: function(contactId) {
		console.log(`[DB] removeContact`, contactId)
		return db.collection('contacts').deleteOne({_id: new ObjectID(contactId)})
	},

	getAppData: function(userName, appName) {
		console.log(`[DB] getAppData`, {userName, appName})

		return db.collection('appData').findOne({userName, appName})
	},

	saveAppData: function(userName, appName, data) {
		console.log(`[DB] saveAppData`, {userName, appName, data})

		const update = {'$set': {data}}

		return db.collection('appData').updateOne({userName, appName}, update, {upsert: true})
	},


	getCountries: function() {
		console.log(`[DB] getCountries`)

		return db.collection('cities').distinct('country')
	},	

	getCities: function(country, search) {
		console.log(`[DB] getCities`, country, search)

		return db
			.collection('cities')
			.find({country, name: {$regex: `^(?i)${search}(?-i)\w*`}})
			.sort({name: 1})
			.toArray()
	}	
}


