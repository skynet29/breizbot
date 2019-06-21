const path = require('path')
const fs = require('fs-extra')
const ffmpeg = require('ffmpeg-static')
const genThumbnail = require('simple-thumbnail')
const config = require('../lib/config')

const cloudPath = config.CLOUD_HOME

const router = require('express').Router()

router.post('/list', function(req, res) {
	console.log('list req', req.session.user)
	console.log('params', req.body)
	const user = req.body.user
	const destPath = req.body.path
	const rootPath = path.join(cloudPath, user, 'share', destPath)

	fs.readdir(rootPath)
	.then(function(files) {
		//console.log('files', files)
		const promises = files.map((file) => {
			return fs.lstat(path.join(rootPath, file)).then((statInfo) => {	
				return {
					name: file, 
					folder: statInfo.isDirectory(),
					size: statInfo.size
				}
			})
		})
		
		return Promise.all(promises)
	
	})
	.then(function(values) {
		res.json(values)
	})		
	.catch(function(err) {
		console.log('err', err)
		res.json([])
	}) 

})



router.get('/load', function(req, res) {
	console.log('load req', req.query)
	const {fileName, size, user} = req.query

	res.sendFile(path.join(cloudPath, user, 'share', fileName))
})

router.get('/loadThumbnail', function(req, res) {
	console.log('load req', req.query)
	const {fileName, size, user} = req.query
	genThumbnail(path.join(cloudPath, user, 'share', fileName), res, size, {
		path: ffmpeg.path
	})
})

module.exports = router