const ytdl = require('ytdl-core');

const path = require('path')
const fs = require('fs-extra')

module.exports = function (ctx, router) {

	console.log('start API youtube')

	const { wss, config, util } = ctx


	router.post('/search', async function (req, res) {
		//console.log('youtube/search', req.body)

		const { query, maxResults } = req.body

		try {
			const data = await util.search('videos', query, { count: 100 })
			if (data.error) {
				res.json(data.error.message)
			}
			else {
				const { items } = data.result

				res.json(items
					.filter((i) => i.source == 'youtube')
					.map((i) => {
						return {
							id: i.media_id,
							title: i.title,
							thumbnail: i.thumbnail,
							date: i.date
						}
					})
					.slice(0, maxResults)
				)
			}
		}
		catch (e) {
			console.log('error', e)
			res.sendStatus(404)
		}

	})

	router.get('/info', async function (req, res) {
		console.log('youtube/info', req.query)
		const { url } = req.query

		const info = await ytdl.getBasicInfo(url)
		console.log('info', JSON.stringify(info.formats, null, 4))
		//console.log('info', Object.keys(info.formats))
		const { title, shortDescription, lengthSeconds, thumbnail } = info.player_response.videoDetails
		res.json({
			title,
			description: shortDescription,
			length_seconds: lengthSeconds,
			thumbnail: thumbnail.thumbnails.pop()
		})
	})

	router.post('/download', function (req, res) {
		console.log('youtube/download', req.body)
		let { url, fileName, srcId } = req.body
		const userName = req.session.user
		fileName = fileName.replace(/\/|\||:|"|-| /g, '_')

		const video = ytdl(url)

		let lastPercent = 0

		video.on('error', (e) => {
			console.log('ytdl Error', e)
			wss.sendToClient(srcId, { topic: 'breizbot.ytdl.progress', data: { error: e } })
		})

		video.on('progress', (chunkLength, totalDownloaded, total) => {
			const info = { chunkLength, totalDownloaded, total }
			//console.log('progress', info)
			//console.log('%', totalDownloaded/total*100)
			const percent = Math.floor(totalDownloaded / total * 100)
			if (percent != lastPercent) {
				lastPercent = percent
				wss.sendToClient(srcId, { topic: 'breizbot.ytdl.progress', data: { percent } })
			}
		})

		res.sendStatus(200)

		// video.on('response', (data) => {
		// })
		const destPath = path.join(config.CLOUD_HOME, userName, 'apps/ytdl')
		fs.lstat(destPath)
			.catch(function (err) {
				console.log('lstat', err)
				return fs.mkdirp(destPath)
			})
			.then(() => {
				video.pipe(fs.createWriteStream(path.join(destPath, fileName)))
			})


	})

}

