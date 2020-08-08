const router = require('express').Router()
const dbCities = require('../db/cities.js')


router.get('/countries', function(req, res) {
	dbCities.getCountries()
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

	dbCities.getCities(country, search)
	.then((cities) => {


		res.json(cities)
		
	})
	.catch((e) => {
		console.log('Error', e)
		res.status(400).send(e)
	})
})


module.exports = router