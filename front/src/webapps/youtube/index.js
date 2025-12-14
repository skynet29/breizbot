
const path = require('path')
const fs = require('fs-extra')
const request = require('request')
const progress = require('request-progress')
const ffmpeg = require('fluent-ffmpeg')
const fetch = require("node-fetch");


async function getInfo(videoId) {
	console.log('getInfo', { videoId })
	const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

	let response = await fetch(videoUrl);
	const html = await response.text();

	const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
	const apiKey = apiKeyMatch ? apiKeyMatch[1] : null;
	console.log({ apiKey })

	const endpoint = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`;

	const body = {
		context: {
			client: {
				clientName: "ANDROID",
				clientVersion: "20.10.38",
			},
		},
		videoId
	};

	response = await fetch(endpoint, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});

	const ret = await response.json();

	console.log({ ret })

	return ret

}

function download(url, fileName, wss, srcId) {
	//console.log('download', url, fileName)

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

		const videoFormat = formats.filter(f => f.mimeType.startsWith('video/mp4; codecs="avc1'))
			.map(f => ({ label: f.qualityLabel, url: f.url }))
		console.log('videoFormat', videoFormat)

		// const audioFormat = formats
		// 	.filter(f => f.mimeType.startsWith('audio/mp4') && f.audioQuality == 'AUDIO_QUALITY_MEDIUM')
		// 	.map(f => ({ label: 'Audio1', url: f.url }))

		const audioFormat = []

		const audioFormats = formats
			.filter(f => f.mimeType.startsWith('audio/mp4') && f.audioQuality == 'AUDIO_QUALITY_MEDIUM')
		console.log({audioFormats})

		for (const { audioTrack, url, itag } of audioFormats) {
			if (audioFormat.findIndex(f => f.itag == itag) >= 0) 
				continue

			if (audioTrack == undefined) {
				audioFormat.push({ url, itag, label: `Audio ${audioFormat.length + 1}` })
			}
			else if (audioTrack != undefined &&
				audioFormat.findIndex(f => f.label == audioTrack.displayName) < 0) {
				audioFormat.push({ url, itag, label: audioTrack.displayName })
			}
		}

		console.log('audioFormat', audioFormat)


		const { title, shortDescription, lengthSeconds, thumbnail } = info.videoDetails
		res.json({
			title,
			description: shortDescription,
			length_seconds: lengthSeconds,
			thumbnail: thumbnail.thumbnails.pop(),
			videoFormat,
			audioFormat
		})
	})

	router.post('/download', async function (req, res) {
		let { fileName, srcId, videoUrl, audioUrl } = req.body
		const userName = req.session.user
		fileName = fileName.replace(/\/|\||:|"|-| /g, '_')
		const destPath = path.join(config.CLOUD_HOME, userName, 'apps/ytdl')


		//const info = await getInfo(videoId)

		// if (info.captions) {

		// 	const captions = info.captions.playerCaptionsTracklistRenderer.captionTracks.filter(f => f.languageCode == 'fr')
		// 	console.log({ captions })
		// 	const subtitles = info.captions.playerCaptionsTracklistRenderer.captionTracks.map(f => f.name.runs[0].text)
		// 	console.log({ subtitles })
		// 	if (captions.length > 0) {
		// 		await download(captions[0].baseUrl + '&format=vtt', path.join(destPath, fileName.replace('.mp4', '.vtt')), wss, srcId)
		// 		console.log('french captions dowloaded!')
		// 	}
		// }

		// const formats = info.streamingData.adaptiveFormats;

		// const audioFormat = formats.filter(f => f.mimeType.match(/^audio\/\w+/) && f.audioQuality == 'AUDIO_QUALITY_MEDIUM')
		// console.log('audioFormat', audioFormat)

		res.sendStatus(200)



		fs.lstat(destPath)
			.catch(function (err) {
				console.log('lstat', err)
				return fs.mkdirp(destPath)
			})
			.then(async () => {

				const videoPath = path.join(destPath, 'video_' + fileName)
				const audioPath = path.join(destPath, 'audio_' + fileName)

				await download(audioUrl, audioPath, wss, srcId)
				console.log('audio downloaded !')
				await download(videoUrl, videoPath, wss, srcId)
				console.log('video downloaded !')


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

			})


	})

}

