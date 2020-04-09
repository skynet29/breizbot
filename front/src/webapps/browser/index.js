const fetch = require('node-fetch')
const querystring = require('querystring')


module.exports = function(ctx, router) {

    router.post('/search', function(req, res) {
		const {query} = req.body

		const params = {
            q: query,	
			count: 10,
			t: query,
			uiv: 4			
		}

		fetch('https://api.qwant.com/api/search/web?' + querystring.stringify(params))
		.then((rep) => {
			return rep.json()
		})
		.then((json) => {
			res.json(json.data.result.items)
		})
		.catch((e) => {
			console.log('error', e)
			res.sendStatus(404)
		})
	})


}

