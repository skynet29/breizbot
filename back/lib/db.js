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

		console.log(`changePassword`, username, newPwd)
		var update = {'$set': {pwd: newPwd}}

		return db.collection('users').updateOne({username}, update)

	},

	updateLastLoginDate: function(username) {

		console.log(`updateLastLoginDate`, username)
		var update = {'$set': {lastLoginDate: Date.now()}}

		return db.collection('users').updateOne({username}, update)

	},


	createUser: function(data) {

		console.log(`createUser`, data)
		data.pwd = 'welcome'
		data.apps = {}
		data.createDate = Date.now()
		data.lastLoginDate = 0

		return db.collection('users').insertOne(data)
	},


	deleteUser: function(username) {

		console.log(`deleteUser`, username)

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
		console.log(`addNotif`, to, from, notif)
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
		console.log(`removeNotif`, notifId)
		return db.collection('notifs').deleteOne({_id: new ObjectID(notifId)})
	},	

	getFriends: function(userName) {
		console.log(`getFriends`, userName)
		return db.collection('friends').find({
			$or: [{user1: userName}, {user2: userName}]
		}).toArray().then((friends) => {
			return friends.map((friend) => {
				return (friend.user1 == userName) ? friend.user2 : friend.user1
			})
		})

	
	},

	addFriend: function(userName, friendUserName) {
		console.log(`addFriend`, userName, friendUserName)
		return db.collection('friends').insertOne({user1: userName, user2: friendUserName})
	},


	getMailAccounts: function(userName) {
		console.log(`getMailAccounts`, userName)
		return db.collection('mailAccounts').find({userName}).toArray()
	},

	getMailAccount: function(userName, name) {
		console.log(`getMailAccount`, userName, name)
		return db.collection('mailAccounts').findOne({userName, name})
	},	

	createMailAccount: function(userName, data) {

		console.log(`createMaiAccount`, userName, data)
		data.createDate = Date.now()
		data.userName = userName

		return db.collection('mailAccounts').insertOne(data)
	}
}


