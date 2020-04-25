const fetch = require('node-fetch')
const querystring = require('querystring')


module.exports = function(ctx, router) {

    router.post('/search', async function(req, res) {
		const {query} = req.body

		const params = {
            q: query,	
			count: 10,
			t: query,
			uiv: 4			
		}

		try {
			const rep = await fetch('https://api.qwant.com/api/search/web?' + querystring.stringify(params))
			const json = await rep.json()
			res.json(json.data.result.items)
		}
		catch(e)  {
			console.log('error', e)
			res.sendStatus(404)
		}
	})


}

