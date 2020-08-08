
const { collection } = require('../lib/dbUtil.js')


module.exports = {

	getAppData: function (userName, appName) {
		//console.log(`[DB] getAppData`, {userName, appName})

		return collection('appData').findOne({ userName, appName })
	},

	saveAppData: async function (userName, appName, data) {
		console.log(`[DB] saveAppData`, { userName, appName, data })

		const update = { '$set': { data } }

		await collection('appData').updateOne({ userName, appName }, update, { upsert: true })
	}

}


