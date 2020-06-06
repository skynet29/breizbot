module.exports = function (db) {


	return {


		getMailAccounts: function (userName) {
			//console.log(`[DB] getMailAccounts`, userName)
			return db.find({ userName }).toArray()
		},

		removeMailAccounts: function (userName) {
			return db.deleteMany({ userName })
		},

		getMailAccount: function (userName, name) {
			//console.log(`[DB] getMailAccount`, userName, name)
			return db.findOne({ userName, name })
		},

		removeMailAccount: function (userName, name) {
			return db.deleteOne({ userName, name })
		},

		createMailAccount: function (userName, data) {

			console.log(`[DB] createMaiAccount`, userName, data)
			data.createDate = Date.now()
			data.userName = userName

			return db.insertOne(data)
		},

		updateMailAccount: function (userName, data) {

			console.log(`[DB] updateMailAccount`, userName, data)
			const { email, imapHost, smtpHost, pwd, makeCopy, name } = data

			const update = { '$set': { email, imapHost, smtpHost, pwd, makeCopy } }

			return db.updateOne({ userName, name }, update)

		}

	}


}