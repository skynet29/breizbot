
const { collection } = require('../lib/dbUtil.js')


module.exports = {

	getCountries: function () {
		//console.log(`[DB] getCountries`)

		return collection('cities').distinct('country')
	},

	getCities: function (country, search) {
		//console.log(`[DB] getCities`, country, search)

		return collection('cities')
			.find({ country, name: { $regex: `^(?i)${search}(?-i)\w*` } })
			.sort({ name: 1 })
			.toArray()
	}

}


