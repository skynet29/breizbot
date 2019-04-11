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
	const options = req.body.options || {}
	const user = req.session.user
	const destPath = req.body.path
	const rootPath = path.join(cloudPath, user, destPath)

	fs.readdir(rootPath)
	.then(function(files) {
		//console.log('files', files)
		const promises = files.map((file) => {
			return fs.lstat(path.join(rootPath, file)).then((statInfo) => {	
				return {
					name: file, 
					folder: statInfo.isDirectory(),
					size: statInfo.size,
					isImage: isImage(file)

				}
			})
		})
		
		return Promise.all(promises)
	
	})
	.then(function(values) {
		//console.log('values', values)
		let ret = values

		if (typeof options.filterExtension == 'string') {
			ret = values.filter((info) => {
				return info.folder === true || info.name.endsWith(options.filterExtension)
			})
		}

		if (options.imageOnly === true) {
			ret = values.filter((info) => {
				return info.folder === true || isImage(info.name)
			})			
		}
		console.log('ret', ret)

		res.json(ret)
	})		
	.catch(function(err) {
		console.log('err', err)
		res.json([])
	}) 

})

router.post('/mkdir', function(req, res) {
	console.log('mkdir req', req.body)
	const {fileName} = req.body
	const user = req.session.user

	fs.mkdirp(path.join(cloudPath, user, fileName))
	.then(function() {
		res.status(200).send('Folder created !')
	})
	.catch(function(e) {
		console.log('error', e)
		res.status(400).send(e.message)			
	})	
})	

router.post('/delete', function(req, res) {
	console.log('delete req', req.body)
	const fileNames = req.body
	const user = req.session.user

	const promises = fileNames.map(function(fileName) {
		return fs.remove(path.join(cloudPath, user, fileName))
	})

	Promise.all(promises)
	.then(function() {
		res.status(200).send('File removed !')
	})
	.catch(function(e) {
		console.log('error', e)
		res.status(400).send(e.message)
	})			
})


router.post('/save', function(req, res) {
	console.log('save req')
	if (!req.files) {
		return res.status(400).send('No files were uploaded.');

	}

	const user = req.session.user
	const destPath = path.join(cloudPath, user,  req.body.destPath)
	console.log('destPath', destPath)
	const file = req.files.file

	fs.lstat(destPath)
	.catch(function(err) {
		console.log('lstat', err)
		return fs.mkdirp(destPath)
	})
	.then(function() {
		
		file.mv(path.join(destPath, file.name), function(err) {
		    if (err) {
		    	console.log('err', err)
		     	return res.status(500).send(err)
		    }
		 
		    res.send('File uploaded!')
		})
	})		
	.catch(function(e) {
		console.log('error', e)
		res.status(400).send(e.message)			
	})

})




router.post('/move', function(req, res) {
	console.log('move req', req.body)
	var fileNames = req.body.fileNames
	var destPath = req.body.destPath

	var user = req.session.user

	var promises = fileNames.map(function(fileName) {
		var fullPath = path.join(cloudPath, user, fileName)
		var fullDest = path.join(cloudPath, user, destPath, path.basename(fileName))
		console.log('fullDest', fullDest)
		return fs.move(fullPath, fullDest)
	})

	Promise.all(promises)
	.then(function() {
		res.status(200).send('File moved !')
	})
	.catch(function(e) {
		console.log('error', e)
		res.status(400).send(e.message)
	})			
})

router.post('/copy', function(req, res) {
	console.log('copy req', req.body)
	var fileNames = req.body.fileNames
	var destPath = req.body.destPath

	var user = req.session.user

	var promises = fileNames.map(function(fileName) {
		var fullPath = path.join(cloudPath, user, fileName)
		var fullDest = path.join(cloudPath, user, destPath, path.basename(fileName))
		console.log('fullDest', fullDest)
		return fs.copy(fullPath, fullDest)
	})

	Promise.all(promises)
	.then(function() {
		res.status(200).send('File copied !')
	})
	.catch(function(e) {
		console.log('error', e)
		res.status(400).send(e.message)
	})			
})



function isImage(fileName) {
	return (/\.(gif|jpg|jpeg|png)$/i).test(fileName)
}	




router.get('/load', function(req, res) {
	console.log('load req', req.query)
	var fileName = req.query.fileName
	var user = req.session.user

	res.sendFile(path.join(cloudPath, user, fileName))
})

router.get('/load', function(req, res) {
	console.log('load req', req.query)
	const fileName = req.query.fileName
	const user = req.session.user

	res.sendFile(path.join(cloudPath, user, fileName))
})

router.get('/loadThumbnail', function(req, res) {
	console.log('load req', req.query)
	const {fileName, size} = req.query
	const user = req.session.user
	genThumbnail(path.join(cloudPath, user, fileName), res, size, {
		path: ffmpeg.path
	})
})

module.exports = router