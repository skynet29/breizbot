module.exports = function (db) {


	return {


		getMailAccounts: function () {
			//console.log(`[DB] getMailAccounts`, userName)
			return db.find().toArray()
		},

		removeMailAccounts: function () {
			return db.deleteMany()
		},

		getMailAccount: function (name) {
			//console.log(`[DB] getMailAccount`, userName, name)
			return db.findOne({ name })
		},

		removeMailAccount: function ( name) {
			return db.deleteOne({ name })
		},

		createMailAccount: function (data) {

			console.log(`[DB] createMaiAccount`,  data)
			data.createDate = Date.now()

			return db.insertOne(data)
		},

		updateMailAccount: function (data) {

			console.log(`[DB] updateMailAccount`, data)
			const { email, imapHost, smtpHost, pwd, makeCopy, name, user, smtpPwd, smtpUser } = data

			const update = { '$set': { email, imapHost, smtpHost, pwd, makeCopy, user, smtpUser, smtpPwd } }

			return db.updateOne({ name }, update)

		}

	}


}