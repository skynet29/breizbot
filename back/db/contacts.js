
const { collection, buildDbId } = require('../lib/dbUtil.js')

const db = collection('contacts')

const events = require('../lib/events')

events.on('userDeleted', async (userName) => {
    await db.deleteMany({ userName: username })
})

module.exports = {

	addContact: async function (userName, info) {
		console.log(`[DB] addContact`, userName, info)
		info.userName = userName

		return db.insertOne(info)
	},

	getContacts: function (userName) {
		//console.log(`[DB] getContacts`, userName)
		return db
			.find({ userName }, { projection: { userName: 0 } })
			.sort({ name: 1 }).toArray()
	},

	removeContact: async function (contactId) {
		console.log(`[DB] removeContact`, contactId)
		await db.deleteOne(buildDbId(contactId))
	},

	updateContactInfo: async function (contactId, info) {
		console.log(`[DB] updateContactInfo`, contactId, info)
		const ret = await db.updateOne(buildDbId(contactId), {$set: info})
		console.log('ret', ret)
	}


}


