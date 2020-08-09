
const { collection } = require('../lib/dbUtil.js')

const db = collection('cities')

module.exports = {

	getCountries: function () {
		//console.log(`[DB] getCountries`)

		return db.distinct('country')
	},

	getCities: function (country, search) {
		//console.log(`[DB] getCities`, country, search)

		return db
			.find({ country, name: { $regex: `^(?i)${search}(?-i)\w*` } })
			.sort({ name: 1 })
			.toArray()
	}

}


