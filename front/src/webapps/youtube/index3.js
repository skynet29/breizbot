
const path = require('path')
const fs = require('fs-extra')
const request = require('request')
const progress = require('request-progress')
const ffmpeg = require('fluent-ffmpeg')

function requestAsync(options) {
	return new Promise((resolve, reject) => {
		request(options, (err, resp, body) => {
			if (err) {
				reject(err)
			}
			else {
				resolve(body)
			}
		})
	})
}

async function getInfo(videoId) {
	const apiKey = 'AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc'
	const headers = {
		'X-YouTube-Client-Name': '5',
		'X-YouTube-Client-Version': '19.09.3',
		Origin: 'https://www.youtube.com',
		'User-Agent': 'com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)',
		'content-type': 'application/json'
	}

	const b = {
		context: {
			client: {
				clientName: 'IOS',
				clientVersion: '19.09.3',
				deviceModel: 'iPhone14,3',
				userAgent: 'com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)',
				hl: 'en',
				timeZone: 'UTC',
				utcOffsetMinutes: 0
			}
		},
		videoId,
		playbackContext: { contentPlaybackContext: { html5Preference: 'HTML5_PREF_WANTS' } },
		contentCheckOk: true,
		racyCheckOk: true
	}

	const json = await requestAsync({
		url: `https://www.youtube.com/youtubei/v1/player?key${apiKey}&prettyPrint=false`,
		method: 'POST',
		body: b,
		headers,
		json: true
	});

	return json;
}

function download(url, fileName, wss, srcId) {
	console.log('download', url, fileName)

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
		const { videoId } = req.query

		const info = await getInfo(videoId)
		//console.log('info', JSON.stringify(info, null, 4))


		const formats = info.streamingData.adaptiveFormats;

		const videoFormat = formats.filter(f => f.mimeType.match(/^video\/\w+/))
			.map(f => ({ qualityLabel: f.qualityLabel, itag: f.url }))
		console.log('videoFormat', videoFormat)

		const { title, shortDescription, lengthSeconds, thumbnail } = info.videoDetails
		res.json({
			title,
			description: shortDescription,
			length_seconds: lengthSeconds,
			thumbnail: thumbnail.thumbnails.pop(),
			formats: videoFormat
		})
	})

	router.post('/download', async function (req, res) {
		let { url, fileName, srcId, videoId } = req.body
		const userName = req.session.user
		fileName = fileName.replace(/\/|\||:|"|-| /g, '_')
		const destPath = path.join(config.CLOUD_HOME, userName, 'apps/ytdl')


		const info = await getInfo(videoId)

		if (info.captions) {

			const captions = info.captions.playerCaptionsTracklistRenderer.captionTracks.filter(f => f.languageCode == 'fr')
			console.log({ captions })
			const subtitles = info.captions.playerCaptionsTracklistRenderer.captionTracks.map(f => f.name.runs[0].text)
			console.log({ subtitles })
			if (captions.length > 0) {
				await download(captions[0].baseUrl + '&format=vtt', path.join(destPath, fileName.replace('.mp4', '.vtt')), wss, srcId)
				console.log('french captions dowloaded!')
			}
		}

		const formats = info.streamingData.adaptiveFormats;

		const audioFormat = formats.filter(f => f.mimeType.match(/^audio\/\w+/) && f.audioQuality == 'AUDIO_QUALITY_MEDIUM')
		console.log('audioFormat', audioFormat)

		res.sendStatus(200)



		fs.lstat(destPath)
			.catch(function (err) {
				console.log('lstat', err)
				return fs.mkdirp(destPath)
			})
			.then(async () => {

				const videoPath = path.join(destPath, 'video_' + fileName)
				const audioPath = path.join(destPath, 'audio_' + fileName)

				await download(url, videoPath, wss, srcId)
				console.log('video downloaded !')
				if (audioFormat.length > 0) {
					await download(audioFormat[0].url, audioPath, wss, srcId)
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
						.on('progress', (event) => {
							const { percent } = event
							console.log('progress', event)
							if (percent != undefined)
								wss.sendToClient(srcId, { topic: 'breizbot.ytdl.progress', data: { percent } })
						})
				}
				else { // no audio
					wss.sendToClient(srcId, { topic: 'breizbot.ytdl.progress', data: { finish: true } })

				}
			})


	})

}

