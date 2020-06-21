const path = require('path')
const fs = require('fs-extra')
const zipFolder = require('zip-a-folder')
const unzipper = require('unzipper')
const fg = require('fast-glob')

const config = require('../lib/config')
const util = require('../lib/util')
const { genThumbnail, isImage, resizeImage, convertToMP3, getFileInfo } = util
const db = require('../lib/db')
const events = require('../lib/events')



const cloudPath = config.CLOUD_HOME

const router = require('express').Router()

events.on('userdeleted', async (userName) => {
	await fs.remove(path.join(cloudPath, userName))

})


router.post('/fileInfo', async function (req, res) {
	//console.log('list req', req.session.user)
	//console.log('params', req.body)
	const user = req.session.user
	const { filePath, friendUser, options } = req.body
	const rootPath = util.getFilePath(user, filePath, friendUser)

	try {
		res.json(await getFileInfo(rootPath, options))
	}
	catch (e) {
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
	const rootPath = util.getFilePath(user, destPath, friendUser)

	try {
		const files = await fs.readdir(rootPath)
		//console.log('files', files)
		let promises = files.map(async (file) => {
			const filePath = path.join(rootPath, file)
			return await getFileInfo(filePath, options)
		})

		let ret = await Promise.all(promises)

		if (friendUser != undefined && friendUser != '' && destPath == '/') {
			const friendInfo = await db.getFriendInfo(friendUser, user)
			const { groups } = friendInfo
			ret = ret.filter((info) =>
				info.folder && groups.includes(info.name)
			)
		}

		if (typeof options.filterExtension == 'string') {
			const ext = options.filterExtension.split(',')
			const regex = new RegExp(`\\.(${ext.join('|')})$`, 'i')
			const results = await Promise.all(ret.map(async (info) => {
				if (info.folder) {
					const filter = (ext.length == 1) ? ext[0] : `{${ext.join(',')}}`
					const filterPath = path.join(rootPath, info.name, '**/*.' + filter)
					const entries = await fg(filterPath)	
					return entries.length > 0
				}
				return regex.test(info.name)
			}))

			ret = ret.filter((f, idx) => results[idx])

		}

		if (options.imageOnly === true) {
			ret = ret.filter((info) => {
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
	const folderPath = util.getFilePath(user, fileName)
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

router.post('/unzipFile', async function (req, res) {
	console.log('unzipFile', req.body)
	const { folderPath, fileName } = req.body

	const user = req.session.user

	const fullFolderPath = path.join(cloudPath, user, folderPath)
	const fullZipFileName = path.join(fullFolderPath, fileName)

	try {
		fs.createReadStream(fullZipFileName)
			.pipe(unzipper.Extract({ path: fullFolderPath }))
			.on('close', async () => {
				console.log('unzip finished !')
				res.sendStatus(200)

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



router.get('/load', async function (req, res) {
	//console.log('load req', req.query)
	const { fileName, friendUser } = req.query
	const user = req.session.user
	try {
		const filePath = await util.getFilePathChecked(user, fileName, friendUser)

		res.sendFile(filePath)	
	}
	catch(e) {
		res.status(400).send(e)
	}
})

router.get('/loadThumbnail', async function (req, res) {
	//console.log('load req', req.query)
	const { fileName, size, friendUser } = req.query
	const user = req.session.user

	try {
		const filePath = await util.getFilePathChecked(user, fileName, friendUser)

		genThumbnail(filePath, res, size)	
	}
	catch(e) {
		res.status(400).send(e)
	}	
})

module.exports = router