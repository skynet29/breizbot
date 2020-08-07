const { MongoClient, ObjectID } = require('mongodb')

const config = require('./config')


let db = null


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

    buildDbId: function(ids) {
        if (Array.isArray(ids)) {
            return 	{ _id: { $in: ids.map((id) => new ObjectID(id)) } }
    
        }
    
        return { _id: new ObjectID(ids) }
    }
    
}
