const fetch = require('node-fetch')
const querystring = require('querystring')
const NodeID3 = require('node-id3')
const path = require('path')


module.exports = function (ctx, router) {

	const { util, events } = ctx

	const db = require('./lib/db.js')(ctx)

	events.on('userDeleted', async (userName) => {
		await db.cleanDb(userName)
	})


	router.post('/swapSongIndex', async function (req, res) {
		try {
			const { id1, id2 } = req.body
			await swapSongIndex(id1, id2)
			res.sendStatus(200)
		}
		catch (e) {
			res.status(400).send(e.message)
		}
	})

	router.delete('/removeSong/:id', async function (req, res) {
		await removeSong(req.params.id)
		res.sendStatus(200)
	})

	router.post('/getPlaylist', async function (req, res) {
		const list = await getPlaylist(req.session.user)
		res.json(list)
	})

	router.post('/removePlaylist', async function (req, res) {
		const { name } = req.body
		try {
			await removePlaylist(req.session.user, name)
			res.sendStatus(200)
		}
		catch (e) {
			console.error(e)
			res.status(400).send(e.message)
		}
	})

	router.post('/getPlaylistSongs', async function (req, res) {
		const { name } = req.body
		const list = await getPlaylistSongs(req.session.user, name)
		res.json(list)
	})

	router.post('/addSong', async function (req, res) {
		const { name, fileInfo, checkExists } = req.body

		const ret = await addSong(req.session.user, name, fileInfo, checkExists)
		res.json(ret)
	})

	router.post('/search', async function (req, res) {
		const { query } = req.body

		const params = {
			q: query.replace(/_|[0-9]*-/g, ' '),
			limit: 1
		}

		//console.log('query', params.q)

		try {
			let rep = await fetch('https://api.deezer.com/search?' + querystring.stringify(params))
			let json = await rep.json()
			console.log('json', json)
			let ret = {}
			const info = json.data[0]
			//console.log('info', info)
			if (info != undefined) {
				const album = info.album.id
				//console.log('album', album)
				rep = await fetch('https://api.deezer.com/album/' + album)
				json = await rep.json()
				//console.log('json', json)
				const genre = (json.genres.data[0]) ? json.genres.data[0].name : 'unknown'

				ret = {
					artist: info.artist.name,
					title: info.title_short,
					genre
				}

			}
			res.json(ret)
		}
		catch (e) {
			console.log('error', e)
			res.sendStatus(404)
		}


	})

	router.post('/saveInfo', function (req, res) {
		const { filePath, friendUser, tags } = req.body

		const fullPath = util.getFilePath(req.session.user, filePath, friendUser)

		NodeID3.write(tags, fullPath, function (err) {
			if (err) {
				res.status(400).send(err)
			}
			else {
				res.json('MP3 info saved !')
			}
		})
	})

}