const fetch = require('node-fetch')
const querystring = require('querystring')
const NodeID3 = require('node-id3')
const path = require('path')


module.exports = function (ctx, router) {

	const { db, util, events } = ctx

	events.on('userdeleted', async (userName) => {
		await db.deleteMany({ userName })
	})

	async function removeSong(songId) {
		console.log(`removeSong`, songId)
		return db.deleteOne({ _id: util.dbObjectID(songId) })
	}

	async function getPlaylist(userName) {

		return db.distinct('name', { userName })
	}

	async function removePlaylist(userName, name) {
		return db.deleteMany({ userName, name })
	}

	async function getPlaylistSongs(userName, name) {
		const records = await db.find({ userName, name }).sort({ idx: 1 }).toArray()
		const promises = records.map(async (f) => {
			const { fileName, rootDir, friendUser } = f.fileInfo
			const filePath = util.getFilePath(userName, rootDir + fileName, friendUser)
			//console.log('filePath', filePath)
			const info = await util.getFileInfo(filePath, { getMP3Info: true })
			return { mp3: info.mp3, fileInfo: f.fileInfo, id: f._id }
		})
		return await Promise.all(promises)
	}

	async function swapSongIndex(songId1, songId2) {
		const id1 = { _id: util.dbObjectID(songId1) }
		const id2 = { _id: util.dbObjectID(songId2) }
		const record1 = await db.findOne(id1)
		const record2 = await db.findOne(id2)
		await db.updateOne(id1, { $set: { idx: record2.idx } })
		await db.updateOne(id2, { $set: { idx: record1.idx } })

	}

	async function addSong(userName, name, fileInfo, checkExists) {
		console.log('addSong', userName, name, fileInfo, checkExists)
		const records = await db.find({ userName, name }).toArray()
		console.log('records', records)
		if (checkExists && records.length != 0) {
			return false
		}
		await db.insertOne({ userName, name, fileInfo, idx: records.length })
		return true

	}

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

		console.log('query', params.q)

		try {
			let rep = await fetch('https://api.deezer.com/search?' + querystring.stringify(params))
			let json = await rep.json()
			console.log('json', json)
			let ret = {}
			const info = json.data[0]
			//console.log('info', info)
			if (info != undefined) {
				const album = info.album.id
				console.log('album', album)
				rep = await fetch('https://api.deezer.com/album/' + album)
				json = await rep.json()
				console.log('json', json)
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

		const user = req.session.user

		const cloudPath = ctx.config.CLOUD_HOME

		let fullPath = ''

		if (friendUser != undefined && friendUser != '') {
			fullPath = path.join(cloudPath, friendUser, 'share', filePath)
		}
		else {
			fullPath = path.join(cloudPath, user, filePath)
		}



		NodeID3.write(tags, fullPath, function (err) {
			if (err) {
				res.status(400).send(err)
			}
			else {
				res.json('MP3 info saved !')
			}
		})
	})

	router.post('createPlaylist', function (req, res) {

	})
}