const router = require('express').Router()

const ytdl = require('ytdl-core');

const path = require('path')
const fs = require('fs-extra')

const config = require('../lib/config')
const wss = require('../lib/wss')


const cloudPath = config.CLOUD_HOME


router.get('/info', function(req, res) {
	console.log('/info', req.query)
	const {url} = req.query

	ytdl.getBasicInfo(url).then((info) => {
		console.log('info', Object.keys(info.player_response.videoDetails))
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
	console.log('/download', req.body)
	const {url, fileName, srcId} = req.body
	const userName = req.session.user

	const video = ytdl(url)

	let lastPercent = 0

	video.on('progress', (chunkLength, totalDownloaded, total) => {
		const info = {chunkLength, totalDownloaded, total}
		//console.log('progress', info)
		//console.log('%', totalDownloaded/total*100)
		const percent = Math.floor(totalDownloaded/total*100)
		if (percent != lastPercent) {
			lastPercent = percent
			wss.sendTo(undefined, srcId, 'breizbot.ytdl.progress', {percent})
		}
	})

	video.on('response', (data) => {
		res.sendStatus(200)
	})
	const destPath = path.join(cloudPath, userName, 'apps/ytdl')
	fs.lstat(destPath)
	.catch(function(err) {
		console.log('lstat', err)
		return fs.mkdirp(destPath)
	})
	.then(() => {
		video.pipe(fs.createWriteStream(path.join(destPath, fileName)))
	})
	

})




module.exports = router