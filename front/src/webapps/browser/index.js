const { default: fetch } = require("node-fetch")

module.exports = function (ctx, router) {

	const { events, util } = ctx

	router.post('/addFavorite', async function (req, res) {
		const { name, link } = req.body
		const userName = req.session.user

		events.emit('addFavorite', { userName, name, link })
		res.sendStatus(200)

	})

	router.get('/getImage', async function(req, res) {
		const {url}	 = req.query

		const resp = await fetch(url)
		resp.body.pipe(res)
		resp.body.on('end', () => {
			console.log('Ended!')
			res.end()
		})

	})

	router.post('/search', async function (req, res) {
		const { query, theme, count, offset } = req.body


		//let ret = []
		const options = {
			offset,
			count
		}

		try {
			const data = await util.search(theme, query, options)
			console.log('results', data)
			if (data.error_code) {
				throw ('error code ' + data.error_code)
			}
			const { items, total } = data.result
			// options.offset += items.length
			// ret = ret.concat(items)
			// if (ret.length >= Math.min(total, 50)) break

			res.json({items, total})
		}
		catch (e) {
			console.log('error', e)
			res.sendStatus(400)
		}
	})


}

