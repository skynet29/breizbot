//@ts-check

const { collection } = require('../lib/dbUtil.js')

const db = collection('radar')

module.exports = {


	getRadar: function () {
		//console.log(`[DB] getCities`, country, search)

		return db
			.find({})
			.toArray()
	}

}


