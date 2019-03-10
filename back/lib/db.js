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

	getUserList: function() {

		console.log('getUserList')
		return db.collection('users').find({}, {
			projection: {pwd:0,_id:0}
		}).toArray()
	},

	getUserInfo: function(username) {

		console.log('getUserInfo', username)
		return db.collection('users').findOne({username})
	},


	updateUserInfo: function(username, data) {

		console.log(`updateUserInfo`, userName, data)
		var update = {'$set': {allowedApps: data.allowedApps, pwd: data.pwd}}

		return db.collection('users').updateOne({username}, update)

	},

	createUser: function(data) {

		console.log(`createUser`, data)
		data.pwd = 'welcome'
		data.apps = {}

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

	addNotif: function(to, notif) {
		console.log(`addNotif`, to, notif)
		return db.collection('notifs').insertOne({to, notif})
	},

	getNotifs: function(to) {
		console.log('getNotifs')
		return db.collection('notifs').find({to}).toArray()
	},

	removeNotif: function(notifId) {
		console.log(`removeNotif`, notifId)
		return db.collection('notifs').deleteOne({_id: new ObjectID(notifId)})
	},	

}


