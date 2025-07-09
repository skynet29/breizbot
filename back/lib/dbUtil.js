//@ts-check

const { MongoClient, ObjectID, Db } = require('mongodb')

const config = require('./config')
const util = require('./util.js')

/**@type {Db} */
let db = null




class DbWrapper {
	constructor(appName) {
		this.appName = appName
		this.collection = db.collection('app.' + appName)
	}

	setUserName(userName) {
		//console.log('setUserName', this.appName, userName)
		this.userName = userName
	}

	distinct(fieldName, filter) {
		filter = filter || {}
		filter.userName = this.userName
		return this.collection.distinct(fieldName, filter)
	}

	find(filter, proj) {
		filter = filter || {}
		filter.userName = this.userName
		console.log('[DBWRAPPER] find', filter, proj)

		return this.collection.find(filter, proj)
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

	/**
	 * 
	 * @param {Array<object>} docs 
	 */
	insertMany(docs) {
		docs.forEach(doc => { doc.userName = this.userName })
		return this.collection.insertMany(docs)
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

	async sum(filter, fieldName) {
		filter.userName = this.userName
		const $group = { _id: '' }
		$group[fieldName] = { $sum: '$' + fieldName }
		//console.log('sum', {filter, fieldName, $group})
		const ret = await this.collection.aggregate([{ $match: filter }, { $group }]).toArray()
		//console.log('sum', ret)
		return ret[0][fieldName]
	}

	getFilePath(filePath, friendUser) {
		return util.getFilePath(this.userName, filePath, friendUser)
	}

	/**
	 * 
	 * @param {string | string[]} ids 
	 * @returns 
	 */
	static buildDbId(ids) {
		if (Array.isArray(ids)) {
			return { _id: { $in: ids.map((id) => new ObjectID(id)) } }

		}

		return { _id: new ObjectID(ids) }
	}

}

module.exports = {
	init: function () {
		return new Promise((resolve, reject) => {
			MongoClient.connect(config.dbUrl, { useUnifiedTopology: true }, (err, client) => {
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
