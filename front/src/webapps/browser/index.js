
module.exports = function (ctx, router) {

	const { events, util } = ctx

	router.post('/addFavorite', async function (req, res) {
		const { name, link } = req.body
		const userName = req.session.user

		events.emit('addFavorite', { userName, name, link })
		res.sendStatus(200)

	})

	router.post('/search', async function (req, res) {
		const { query, theme, count, offset } = req.body


		//let ret = []
		const options = {
			offset,
			count
		}

		try {
			const rep = await util.search(theme, query, options)
			console.log('repStatus', rep.ok)
			const json = await rep.json()
			console.log('results', json.data)
			if (json.data.error_code) {
				throw ('error code ' + json.data.error_code)
			}
			const { items, total } = json.data.result
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

