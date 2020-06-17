const fetch = require('node-fetch')
const querystring = require('querystring')


module.exports = function (ctx, router) {

	const { events } = ctx

	router.post('/addFavorite', async function (req, res) {
		const { name, link } = req.body
		const userName = req.session.user

		events.emit('addFavorite', { userName, name, link })
		res.sendStatus(200)

	})

	router.post('/search', async function (req, res) {
		const { query, theme } = req.body

		const params = {
			q: query,
			t: theme,
			uiv: 4,
			offset: 0
		}

		let ret = []

		try {
			while (ret.length  < 50) {
				const rep = await fetch(`https://api.qwant.com/api/search/${theme}?` + querystring.stringify(params))
				const json = await rep.json()
				console.log('results', json.data)
				if (json.data.error_code) {
					throw('error code ' + json.data.error_code)
				}
				const {items} = json.data.result
				params.offset += items.length
				ret = ret.concat(items)	
			}
			res.json(ret)
		}
		catch (e) {
			console.log('error', e)
			res.sendStatus(404)
		}
	})


}

