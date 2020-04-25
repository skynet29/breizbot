const ytdl = require('ytdl-core');

const path = require('path')
const fs = require('fs-extra')
const fetch = require('node-fetch')
const querystring = require('querystring')

module.exports = function(ctx, router) {

	console.log('start API youtube')

	const {wss, config} = ctx

	const ytAPIUrl = 'https://www.googleapis.com/youtube/v3/search?'
	const apiKey = 'AIzaSyDH0qRqgnKqGdfVZlN1F4Ff3zPiiiJFQGE'

	router.post('/search', async function(req, res) {
		console.log('youtube/search', req.body)

		const {query, maxResults} = req.body

		const params = {
			part: 'snippet',
			maxResults: maxResults || 3,
			key: apiKey,
			q: query,				
		}

		try {
			const rep = await fetch(ytAPIUrl + querystring.stringify(params))
			const json = await rep.json()
			if (json.error) {
				res.json(json.error.message)
			}
			else {
				res.json(json.items
					.filter((i) => i.id.kind == 'youtube#video')
					.map((i) => {
						const {title, thumbnails} = i.snippet
						return {
							id: i.id.videoId,
							title,
							thumbnail: thumbnails.default.url
						}
					}))
			}
		}
		catch(e) {
			console.log('error', e)
			res.sendStatus(404)
		}

	})

	router.get('/info', function(req, res) {
		console.log('youtube/info', req.query)
		const {url} = req.query

		ytdl.getBasicInfo(url).then((info) => {
			//console.log('info', Object.keys(info.player_response.videoDetails))
			const {title, shortDescription, lengthSeconds, thumbnail} = info.player_response.videoDetails
			res.json({
				title, 
				description: shortDescription,
				length_seconds: lengthSeconds, 
				thumbnail_url: thumbnail.thumbnails[2].url
			})		
		})	
	})

	router.post('/download', function(req, res) {
		console.log('youtube/download', req.body)
		let {url, fileName, srcId} = req.body
		const userName = req.session.user
		fileName = fileName.replace(/\/|\||:|-| /g, '_')

		const video = ytdl(url)

		let lastPercent = 0

		video.on('progress', (chunkLength, totalDownloaded, total) => {
			const info = {chunkLength, totalDownloaded, total}
			//console.log('progress', info)
			//console.log('%', totalDownloaded/total*100)
			const percent = Math.floor(totalDownloaded/total*100)
			if (percent != lastPercent) {
				lastPercent = percent
				wss.sendToClient(srcId, {topic: 'breizbot.ytdl.progress', data: {percent}})
			}
		})

		video.on('response', (data) => {
			res.sendStatus(200)
		})
		const destPath = path.join(config.CLOUD_HOME, userName, 'apps/ytdl')
		fs.lstat(destPath)
		.catch(function(err) {
			console.log('lstat', err)
			return fs.mkdirp(destPath)
		})
		.then(() => {
			video.pipe(fs.createWriteStream(path.join(destPath, fileName)))
		})
		

	})

}

