const ytdl = require('ytdl-core');

const path = require('path')
const fs = require('fs-extra')

module.exports = function (ctx, router) {

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
					.filter((i) => i.source.toUpperCase() == 'YOUTUBE')
					.map((i) => {
						return {
							id: i.media_id,
							title: i.title,
							thumbnail: i.thumbnail,
							date: i.date
						}
					})
					// .slice(0, maxResults)
				)
			}
		}
		catch (e) {
			console.log('error', e)
			res.sendStatus(404)
		}

	})

	router.get('/info', async function (req, res) {
		const { url } = req.query

		const info = await ytdl.getBasicInfo(url)
		//console.log('info', JSON.stringify(info.formats, null, 4))
		console.log('info', info.formats)
		let formats = info.formats.filter((f) => f.audioChannels != undefined && f.qualityLabel != undefined).map((f) => {
			const {itag, qualityLabel} = f
			return {itag, qualityLabel}
		})

		const audio = info.formats.filter((a) => a.audioQuality == "AUDIO_QUALITY_MEDIUM").map((f) => {
			const {itag, mimeType, audioTrack} = f
			const codec = mimeType.match(/codecs="(.*)"/)
			ret = {itag, qualityLabel: 'Audio ' + codec[1]}
			if (audioTrack && audioTrack.displayName)
				ret.displayName = audioTrack.displayName
			return ret

		})

		formats = formats.concat(audio)
		const { title, shortDescription, lengthSeconds, thumbnail } = info.player_response.videoDetails
		res.json({
			title,
			description: shortDescription,
			length_seconds: lengthSeconds,
			thumbnail: thumbnail.thumbnails.pop(),
			formats
		})
	})

	router.post('/download', function (req, res) {
		let { url, fileName, srcId, itag } = req.body
		const userName = req.session.user
		fileName = fileName.replace(/\/|\||:|"|-| /g, '_')

		const video = ytdl(url, {quality: itag})

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

