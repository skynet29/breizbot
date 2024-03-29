//@ts-check

const { collection, buildDbId } = require('../lib/dbUtil.js')

const db = collection('notifs')

const events = require('../lib/events')

events.on('userDeleted', async (userName) => {
    await db.deleteMany({ $or: [{ from: userName }, { to: userName }] })
})

module.exports = {

	addNotif: function (to, from, notif) {
		db.insertOne({ to, from, notif, date: Date.now() })
	},

	getNotifs: function (to) {
		//console.log('getNotifs')
		return db.find({ to }).toArray()
	},

	getNotifCount: function (to) {
		//console.log('getNotifCount')
		return db.countDocuments({ to })
	},

	removeNotif: async function (notifId) {
		await db.deleteOne(buildDbId(notifId))
	}


}


