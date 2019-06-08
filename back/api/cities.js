const router = require('express').Router()
const db = require('../lib/db')


router.get('/countries', function(req, res) {
	db.getCountries()
	.then((countries) => {


		res.json(countries.sort().filter((c) => c != ''))
		
	})
	.catch((e) => {
		console.log('Error', e)
		res.status(400).send(e)
	})
})

router.post('/cities', function(req, res) {
	const {country, search} = req.body

	db.getCities(country, search)
	.then((cities) => {


		res.json(cities)
		
	})
	.catch((e) => {
		console.log('Error', e)
		res.status(400).send(e)
	})
})


module.exports = router