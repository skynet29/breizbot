
const { collection, buildDbId } = require('../lib/dbUtil.js')


module.exports = {

	addNotif: function (to, from, notif) {
		console.log(`[DB] addNotif`, to, from, notif)
		collection('notifs').insertOne({ to, from, notif, date: Date.now() })
	},

	getNotifs: function (to) {
		//console.log('getNotifs')
		return collection('notifs').find({ to }).toArray()
	},

	getNotifCount: function (to) {
		//console.log('getNotifCount')
		return collection('notifs').countDocuments({ to })
	},

	removeNotif: async function (notifId) {
		console.log(`[DB] removeNotif`, notifId)
		await collection('notifs').deleteOne(buildDbId(notifId))
	}


}


