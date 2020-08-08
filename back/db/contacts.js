
const { collection, buildDbId } = require('../lib/dbUtil.js')


module.exports = {

	addContact: async function (userName, contactName, contactEmail) {
		console.log(`[DB] addContact`, userName, contactName, contactEmail)
		const info = await collection('contacts').findOne({ userName, contactEmail })
		if (info != null) {
			throw ('Contact already exists')
		}

		return collection('contacts').insertOne({
			userName,
			contactName,
			contactEmail
		})
	},

	getContacts: function (userName) {
		//console.log(`[DB] getContacts`, userName)
		return collection('contacts')
			.find({ userName }, { projection: { userName: 0 } })
			.sort({ contactName: 1 }).toArray()
	},

	removeContact: async function (contactId) {
		console.log(`[DB] removeContact`, contactId)
		await collection('contacts').deleteOne(buildDbId(contactId))
	}


}


