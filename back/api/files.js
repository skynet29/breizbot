const path = require('path')
const fs = require('fs-extra')
const config = require('../lib/config')
const {imageSize, genThumbnail, isImage, resizeImage} = require('../lib/util')


const cloudPath = config.CLOUD_HOME

const router = require('express').Router()

router.post('/list', function(req, res) {
	console.log('list req', req.session.user)
	console.log('params', req.body)
	const options = req.body.options || {}
	const user = req.session.user
	const {destPath, friendUser} = req.body
	let rootPath = path.join(cloudPath, user, destPath)
	if (friendUser != undefined && friendUser != '') {
		rootPath = path.join(cloudPath, friendUser, 'share', destPath)
	}

	fs.readdir(rootPath)
	.then(function(files) {
		//console.log('files', files)
		const promises = files.map((file) => {
			const filePath = path.join(rootPath, file)
			return fs.lstat(filePath).then((statInfo) => {	
				//console.log('statInfo', statInfo)
				const ret = {
					name: file, 
					folder: statInfo.isDirectory(),
					size: statInfo.size,
					isImage: isImage(file),
					mtime: statInfo.mtimeMs
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

router.post('/rename', function(req, res) {
	console.log('move req', req.body)
	const {filePath, oldFileName, newFileName} = req.body

	var user = req.session.user

	const oldFullPath = path.join(cloudPath, user, filePath, oldFileName)
	const newFullPath = path.join(cloudPath, user, filePath, newFileName)

	fs.move(oldFullPath, newFullPath)
	.then(function() {
		res.status(200).send('File moved !')
	})
	.catch(function(e) {
		console.log('error', e)
		res.status(400).send(e.message)
	})			
})

router.post('/resizeImage', function(req, res) {
	console.log('resizeImage', req.body)
	const {filePath, fileName, resizeFormat} = req.body

	var user = req.session.user

	const fullPath = path.join(cloudPath, user, filePath)

	resizeImage(fullPath, fileName, resizeFormat)
	.then(function() {
		res.status(200).send('File resized!')
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



router.get('/load', function(req, res) {
	//console.log('load req', req.query)
	const {fileName, friendUser} = req.query
	const user = req.session.user

	if (friendUser != undefined && friendUser != '') {
		res.sendFile(path.join(cloudPath, friendUser, 'share', fileName))		
	}
	else {
		res.sendFile(path.join(cloudPath, user, fileName))	
	}
})

router.get('/loadThumbnail', function(req, res) {
	//console.log('load req', req.query)
	const {fileName, size, friendUser} = req.query
	const user = req.session.user

	if (friendUser != undefined && friendUser != '') {
		genThumbnail(path.join(cloudPath, friendUser, 'share', fileName), res, size)		
	}
	else {
		genThumbnail(path.join(cloudPath, user, fileName), res, size)	
	}	
	
})

module.exports = router