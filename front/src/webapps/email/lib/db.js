module.exports = function(db) {


	return {


		getMailAccounts: function(userName) {
			//console.log(`[DB] getMailAccounts`, userName)
			return db.find({userName}).toArray()
		},

		getMailAccount: function(userName, name) {
			//console.log(`[DB] getMailAccount`, userName, name)
			return db.findOne({userName, name})
		},	

		createMailAccount: function(userName, data) {

			console.log(`[DB] createMaiAccount`, userName, data)
			data.createDate = Date.now()
			data.userName = userName

			return db.insertOne(data)
		},


	}


}