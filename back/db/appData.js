//@ts-check

const { collection } = require('../lib/dbUtil.js')

const db = collection('appData')

const events = require('../lib/events')

events.on('userDeleted', async (userName) => {
    await db.deleteMany({ userName })
})

module.exports = {

	getAppData: function (userName, appName) {
		//console.log(`[DB] getAppData`, {userName, appName})

		return db.findOne({ userName, appName })
	},

	saveAppData: async function (userName, appName, data) {

		const update = { '$set': { data } }

		await db.updateOne({ userName, appName }, update, { upsert: true })
	}

}


