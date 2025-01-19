const ytdl = require('@distube/ytdl-core');

const path = require('path')
const fs = require('fs-extra')
const ffmpeg = require('fluent-ffmpeg')
const request = require('request')
const progress = require('request-progress')

function downloadFile(url, fileName, wss, srcId) {
	console.log('downloadFile', url, fileName)

	return new Promise((resolve, reject) => {
		let lastPercent = 0

		wss.sendToClient(srcId, { topic: 'breizbot.ytdl.progress', data: { percent: 0 } })

		progress(request(url), {})
			.on('progress', (state) => {
				const percent = Math.floor(state.percent * 100)
				if (percent != lastPercent) {
					lastPercent = percent
					//console.log('progress', percent)

					wss.sendToClient(srcId, { topic: 'breizbot.ytdl.progress', data: { percent } })
				}
			})
			.on('error', (e) => {
				console.error(e)
				wss.sendToClient(srcId, { topic: 'breizbot.ytdl.progress', data: { error: e.message } })
				reject(e)

			})
			.on('end', () => {
				console.log('end')
				resolve()
			})
			.pipe(fs.createWriteStream(fileName))
	})
}

function download(url, itag, fileName, wss, srcId) {
	console.log('download', itag, fileName)

	return new Promise((resolve, reject) => {

		wss.sendToClient(srcId, { topic: 'breizbot.ytdl.progress', data: { percent: 0 } })

		const video = ytdl(url, { quality: itag })

		let lastPercent = 0

		video.on('error', (e) => {
			console.log('ytdl Error', e)
			wss.sendToClient(srcId, { topic: 'breizbot.ytdl.progress', data: { error: e } })
			reject(e)
		})

		video.on('end', () => {
			console.log('end')
			resolve()
		})

		video.on('progress', (chunkLength, totalDownloaded, total) => {
			const info = { chunkLength, totalDownloaded, total }
			//console.log('progress', info)
			//console.log('%', totalDownloaded/total*100)
			const percent = Math.floor(totalDownloaded / total * 100)
			if (percent != lastPercent) {
				//console.log({percent})
				lastPercent = percent
				wss.sendToClient(srcId, { topic: 'breizbot.ytdl.progress', data: { percent } })
			}
		})

		video.pipe(fs.createWriteStream(fileName))


	})
}


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
		console.log('info', info.player_response)
		const formats = info.player_response.streamingData.adaptiveFormats;

		const videoFormat = formats.filter(f => f.mimeType.startsWith('video/mp4; codecs="avc1'))
			.map(f => ({ qualityLabel: f.qualityLabel, itag: f.itag, mimeType: f.mimeType }))
		console.log('videoFormat', videoFormat)

		const { title, shortDescription, lengthSeconds, thumbnail } = info.player_response.videoDetails
		res.json({
			title,
			description: shortDescription,
			length_seconds: lengthSeconds,
			thumbnail: thumbnail.thumbnails.pop(),
			formats: videoFormat
		})


	})

	router.post('/download', async function (req, res) {
		let { url, fileName, srcId, itag } = req.body
		const userName = req.session.user
		fileName = fileName.replace(/\/|\||:|"|-| /g, '_')

		const { player_response: info } = await ytdl.getBasicInfo(url)
		//console.log('info', JSON.stringify(info.formats, null, 4))
		console.log('info', info)
		res.sendStatus(200)


		const destPath = path.join(config.CLOUD_HOME, userName, 'apps/ytdl')

		if (info.captions) {

			const captions = info.captions.playerCaptionsTracklistRenderer.captionTracks.filter(f => f.languageCode == 'fr')
			console.log({ captions })
			const subtitles = info.captions.playerCaptionsTracklistRenderer.captionTracks.map(f => f.name.simpleText)
			console.log({ subtitles })
			if (captions.length > 0) {
				console.log(captions[0])
				await downloadFile(captions[0].baseUrl + '&format=vtt', path.join(destPath, fileName.replace('.mp4', '.vtt')), wss, srcId)
				console.log('french captions dowloaded!')
			}
		}
		const formats = info.streamingData.adaptiveFormats;

		const audioFormat = formats.filter(f => f.mimeType.match(/^audio\/\w+/) && f.audioQuality == 'AUDIO_QUALITY_MEDIUM')
		console.log('audioFormat', audioFormat)

		fs.lstat(destPath)
			.catch(function (err) {
				console.log('lstat', err)
				return fs.mkdirp(destPath)
			})
			.then(async () => {
				const videoPath = path.join(destPath, 'video_' + fileName)
				const audioPath = path.join(destPath, 'audio_' + fileName)

				try {

					await download(url, itag, videoPath, wss, srcId)

					console.log('video downloaded !')
					if (audioFormat.length > 0) {
						await download(url, audioFormat[0].itag, audioPath, wss, srcId)
						console.log('audio downloaded !')

						ffmpeg()
							.input(videoPath)
							.input(audioPath)
							.addOption(['-c:v', 'copy', '-c:a', 'copy', '-map', '0:v:0', '-map', '1:a:0', '-shortest'])
							.save(path.join(destPath, fileName))
							.on('start', () => console.log('Merge video with audio'))
							.on('end', () => {
								console.log('merge finished!')
								wss.sendToClient(srcId, { topic: 'breizbot.ytdl.progress', data: { finish: true } })

								fs.unlinkSync(videoPath)
								fs.unlinkSync(audioPath)

							})
							.on('error', (e) => {
								wss.sendToClient(srcId, { topic: 'breizbot.ytdl.progress', data: { error: e.message } })
							})
							.on('progress', (event) => {
								const { percent } = event
								//console.log('progress', event)
								if (percent != undefined)
									wss.sendToClient(srcId, { topic: 'breizbot.ytdl.progress', data: { percent } })
							})
					}
					else { // no audio
						wss.sendToClient(srcId, { topic: 'breizbot.ytdl.progress', data: { finish: true } })

					}
				}
				catch (e) {
					console.log('Error', e)
				}
			})



	})

}

