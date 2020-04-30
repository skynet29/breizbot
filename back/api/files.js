const path = require('path')
const fs = require('fs-extra')
const zipFolder = require('zip-a-folder')
const config = require('../lib/config')
const { genThumbnail, isImage, resizeImage, convertToMP3, getFileInfo } = require('../lib/util')


const cloudPath = config.CLOUD_HOME

const router = require('express').Router()

router.post('/fileInfo', async function (req, res) {
	//console.log('list req', req.session.user)
	//console.log('params', req.body)
	const user = req.session.user
	const { filePath, friendUser, options } = req.body
	let rootPath = path.join(cloudPath, user, filePath)
	if (friendUser != undefined && friendUser != '') {
		rootPath = path.join(cloudPath, friendUser, 'share', filePath)
	}

	try {
		res.json(await getFileInfo(rootPath, options))
	}
	catch(e) {
		console.log('error', e)
		res.status(404).send(e.message)
	}
})

router.post('/list', async function (req, res) {
	//console.log('list req', req.session.user)
	//console.log('params', req.body)
	const options = req.body.options || {}
	const user = req.session.user
	const { destPath, friendUser } = req.body
	let rootPath = path.join(cloudPath, user, destPath)
	if (friendUser != undefined && friendUser != '') {
		rootPath = path.join(cloudPath, friendUser, 'share', destPath)
	}

	try {
		const files = await fs.readdir(rootPath)
		//console.log('files', files)
		const promises = files.map(async (file) => {
			const filePath = path.join(rootPath, file)
			return await getFileInfo(filePath, options)
		})

		const values = await Promise.all(promises)
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

		res.json(ret)
	}
	catch (e) {
		console.log('error', e)
		res.json([])
	}

})




router.post('/mkdir', async function (req, res) {
	console.log('mkdir req', req.body)
	const { fileName } = req.body
	const user = req.session.user
	const folderPath = path.join(cloudPath, user, fileName)
	try {
		await fs.mkdirp(folderPath)
		res.json(await getFileInfo(folderPath))
	}
	catch (e) {
		console.log('error', e)
		res.status(400).send(e.message)
	}
})

router.post('/delete', function (req, res) {
	console.log('delete req', req.body)
	const fileNames = req.body
	const user = req.session.user

	const promises = fileNames.map(function (fileName) {
		return fs.remove(path.join(cloudPath, user, fileName))
	})

	Promise.all(promises)
		.then(function () {
			res.status(200).send('File removed !')
		})
		.catch(function (e) {
			console.log('error', e)
			res.status(400).send(e.message)
		})
})


router.post('/save', function (req, res) {
	console.log('save req')
	if (!req.files) {
		return res.status(400).send('No files were uploaded.');

	}

	const user = req.session.user
	const destPath = path.join(cloudPath, user, req.body.destPath)
	console.log('destPath', destPath)
	const file = req.files.file

	fs.lstat(destPath)
		.catch(function (err) {
			console.log('lstat', err)
			return fs.mkdirp(destPath)
		})
		.then(function () {

			file.mv(path.join(destPath, file.name), function (err) {
				if (err) {
					console.log('err', err)
					return res.status(500).send(err)
				}

				res.send('File uploaded!')
			})
		})
		.catch(function (e) {
			console.log('error', e)
			res.status(400).send(e.message)
		})

})




router.post('/move', function (req, res) {
	console.log('move req', req.body)
	var fileNames = req.body.fileNames
	var destPath = req.body.destPath

	var user = req.session.user

	var promises = fileNames.map(function (fileName) {
		var fullPath = path.join(cloudPath, user, fileName)
		var fullDest = path.join(cloudPath, user, destPath, path.basename(fileName))
		console.log('fullDest', fullDest)
		return fs.move(fullPath, fullDest)
	})

	Promise.all(promises)
		.then(function () {
			res.status(200).send('File moved !')
		})
		.catch(function (e) {
			console.log('error', e)
			res.status(400).send(e.message)
		})
})

router.post('/rename', async function (req, res) {
	console.log('move req', req.body)
	const { filePath, oldFileName, newFileName } = req.body

	var user = req.session.user

	const oldFullPath = path.join(cloudPath, user, filePath, oldFileName)
	const newFullPath = path.join(cloudPath, user, filePath, newFileName)

	try {
		await fs.move(oldFullPath, newFullPath)
		const info = await getFileInfo(newFullPath)
		res.json(info)
	}
	catch (e) {
		console.log('error', e)
		res.status(400).send(e.message)
	}
})

router.post('/resizeImage', async function (req, res) {
	console.log('resizeImage', req.body)
	const { filePath, fileName, resizeFormat } = req.body

	var user = req.session.user

	const fullPath = path.join(cloudPath, user, filePath)

	try {
		const info = await resizeImage(fullPath, fileName, resizeFormat)
		res.json(info)
	}
	catch (e) {
		console.log('error', e)
		res.status(400).send(e.message)
	}
})

router.post('/convertToMP3', async function (req, res) {
	console.log('convertToMP3', req.body)
	const { filePath, fileName } = req.body

	const user = req.session.user

	const fullPath = path.join(cloudPath, user, filePath)

	try {
		const resp = await convertToMP3(fullPath, fileName)
		res.json(resp)
	}
	catch (e) {
		console.log('error', e)
		res.status(400).send(e.message)
	}
})

router.post('/zipFolder', async function (req, res) {
	const { folderPath, folderName } = req.body

	const user = req.session.user

	const fullFolderPath = path.join(cloudPath, user, folderPath, folderName)
	const fileName = folderName + '.zip'
	const fullZipFilePath = path.join(cloudPath, user, folderPath, fileName)

	try {
		await zipFolder.zip(fullFolderPath, fullZipFilePath)
		const statInfo = await fs.lstat(fullZipFilePath)
		//console.log('statInfo', statInfo)

		res.json({
			name: fileName,
			folder: false,
			size: statInfo.size,
			isImage: false,
			mtime: statInfo.mtimeMs,
		})

	}
	catch (e) {
		console.log('error', e)
		res.status(400).send(e.message)
	}

})


router.post('/copy', function (req, res) {
	console.log('copy req', req.body)
	const { fileNames, destPath } = req.body

	const user = req.session.user

	const promises = fileNames.map(function (fileName) {
		const fullPath = path.join(cloudPath, user, fileName)
		const fullDest = path.join(cloudPath, user, destPath, path.basename(fileName))
		console.log('fullDest', fullDest)
		return fs.copy(fullPath, fullDest)
	})

	Promise.all(promises)
		.then(function () {
			res.status(200).send('File copied !')
		})
		.catch(function (e) {
			console.log('error', e)
			res.status(400).send(e.message)
		})
})



router.get('/load', function (req, res) {
	//console.log('load req', req.query)
	const { fileName, friendUser } = req.query
	const user = req.session.user

	if (friendUser != undefined && friendUser != '') {
		res.sendFile(path.join(cloudPath, friendUser, 'share', fileName))
	}
	else {
		res.sendFile(path.join(cloudPath, user, fileName))
	}
})

router.get('/loadThumbnail', function (req, res) {
	//console.log('load req', req.query)
	const { fileName, size, friendUser } = req.query
	const user = req.session.user

	if (friendUser != undefined && friendUser != '') {
		genThumbnail(path.join(cloudPath, friendUser, 'share', fileName), res, size)
	}
	else {
		genThumbnail(path.join(cloudPath, user, fileName), res, size)
	}

})

module.exports = router