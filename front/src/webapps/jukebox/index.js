const fetch = require('node-fetch')
const querystring = require('querystring')
const NodeID3 = require('node-id3')
const path = require('path')


module.exports = function(ctx, router) {

    router.post('/search', function(req, res) {
		const {query} = req.body

		const params = {
            q: query,	
            limit: 1			
		}

		fetch('https://api.deezer.com/search?' + querystring.stringify(params))
		.then((rep) => {
			return rep.json()
		})
		.then((json) => {
			let ret = {}
			const info = json.data[0]
			if (info != undefined) {
				ret = {
					artist: info.artist.name,
					title: info.title_short
				}
	
			}
			res.json(ret)
		})
		.catch((e) => {
			console.log('error', e)
			res.sendStatus(404)
		})


	})
	
	router.post('/saveInfo', function(req, res) {
		const {filePath, friendUser, tags} = req.body

		const user = req.session.user

		const cloudPath = ctx.config.CLOUD_HOME

		let fullPath = ''

		if (friendUser != undefined && friendUser != '') {
			fullPath = path.join(cloudPath, friendUser, 'share', filePath)	
		}
		else {
			fullPath = path.join(cloudPath, user, filePath)
		}
	


		NodeID3.write(tags, fullPath, function(err) {
			if (err) {
				res.status(400).send(err)
			}
			else {
				res.json('MP3 info saved !')
			}
		})
	})
}