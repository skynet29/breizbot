const path = require('path')
const fs = require('fs-extra')
const router = require('express').Router()

module.exports = function(ctx) {

	const {config} = ctx

	const {imageSize, genThumbnail, isImage} = ctx.util



	const cloudPath = config.CLOUD_HOME


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
			const filePath = path.join(rootPath, file)
			return fs.lstat(filePath).then((statInfo) => {	
				const ret = {
					name: file, 
					folder: statInfo.isDirectory(),
					size: statInfo.size,
					isImage: isImage(file)
				}

				if (ret.isImage) {
					return imageSize(filePath).then((dimension) => {
						console.log('dimension', dimension)
						ret.dimension = dimension
						return ret
					})
				}
				else {
					return ret
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
		genThumbnail(path.join(cloudPath, user, 'share', fileName), res, size)
	})

	return router
}