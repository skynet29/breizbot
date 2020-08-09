
const { collection, buildDbId } = require('../lib/dbUtil.js')

const db = collection('contacts')

const events = require('../lib/events')

events.on('userDeleted', async (userName) => {
    await db.deleteMany({ userName: username })
})

module.exports = {

	addContact: async function (userName, contactName, contactEmail) {
		console.log(`[DB] addContact`, userName, contactName, contactEmail)
		const info = await db.findOne({ userName, contactEmail })
		if (info != null) {
			throw ('Contact already exists')
		}

		return db.insertOne({
			userName,
			contactName,
			contactEmail
		})
	},

	getContacts: function (userName) {
		//console.log(`[DB] getContacts`, userName)
		return db
			.find({ userName }, { projection: { userName: 0 } })
			.sort({ contactName: 1 }).toArray()
	},

	removeContact: async function (contactId) {
		console.log(`[DB] removeContact`, contactId)
		await db.deleteOne(buildDbId(contactId))
	}


}


