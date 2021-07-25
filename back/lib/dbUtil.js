//@ts-check

const { MongoClient, ObjectID } = require('mongodb')
const redirectHttps = require('redirect-https')

const config = require('./config')
const util = require('./util.js')


let db = null




class DbWrapper {
	constructor(appName) {
		this.appName = appName
		this.collection = db.collection('app.' + appName)
	}

	setUserName(userName) {
		console.log('setUserName', this.appName, userName)
		this.userName = userName
	}

	distinct(fieldName, filter) {
		filter = filter || {}
		filter.userName = this.userName
		return this.collection.distinct(fieldName, filter)
	}

	find(filter) {
		filter = filter || {}
		filter.userName = this.userName
		console.log('[DBWRAPPER] find', filter)
		return this.collection.find(filter)
	}

	findOne(filter) {
		filter = filter || {}
		filter.userName = this.userName
		return this.collection.findOne(filter)
	}

	findOneAndUpdate(filter, data) {
		filter = filter || {}
		filter.userName = this.userName
		return this.collection.findOneAndUpdate(filter, data)
	}


	insertOne(data) {
		data = data || {}
		data.userName = this.userName
		return this.collection.insertOne(data)
	}

	deleteOne(filter) {
		filter = filter || {}
		filter.userName = this.userName
		return this.collection.deleteOne(filter)
	}

	deleteMany(filter) {
		filter = filter || {}
		filter.userName = this.userName
		return this.collection.deleteMany(filter)
	}

	updateOne(filter, data) {
		filter = filter || {}
		filter.userName = this.userName
		return this.collection.updateOne(filter, data)
	}

	updateMany(filter, data) {
		filter = filter || {}
		filter.userName = this.userName
		return this.collection.updateMany(filter, data)
	}

	countDocuments(filter) {
		filter = filter || {}
		filter.userName = this.userName
		return this.collection.countDocuments(filter)
	}

	getFilePath(filePath, friendUser) {
		return util.getFilePath(this.userName, filePath, friendUser)
	}

	static  buildDbId(ids) {
		if (Array.isArray(ids)) {
			return { _id: { $in: ids.map((id) => new ObjectID(id)) } }
	
		}
	
		return { _id: new ObjectID(ids) }
	}

}

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

	buildDbId: DbWrapper.buildDbId,

	collection: function (collectionName) {
		return db.collection(collectionName)
	},

	DbWrapper

}
