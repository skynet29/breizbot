//@ts-check

const path = require('path')
const fs = require('fs-extra')
const fg = require('fast-glob')

const config = require('../lib/config')
const util = require('../lib/util')
const login = require('../lib/login')
const { genThumbnail, isImage, getFileInfo } = util
const dbFriends = require('../db/friends')
const events = require('../lib/events')

const cloudPath = config.CLOUD_HOME

const router = require('express').Router()

events.on('userDeleted', async (userName) => {
	await fs.remove(path.join(cloudPath, userName))

})


router.post('/fileInfo', async function (req, res) {
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

router.post('/exists', async function(req,res) {
	const user = req.session.user
	const { filePath } = req.body
	const rootPath = util.getFilePath(user, filePath)
	fs.access(rootPath, fs.constants.F_OK, (err) => {
		console.log('\n> Checking if the file exists')
		if (err) {
			console.error('File does not exist')
			res.json({exists: false})
		}
		else {
		  console.log('File does exist')
		  res.json({exists: true})

		}	
	})

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
		let ret = []
		for (const file of files) {
			const filePath = path.join(rootPath, file)
			const info = await getFileInfo(filePath, options)
			ret.push(info)
		}

		if (friendUser != undefined && friendUser != '' && destPath == '/') {
			const friendInfo = await dbFriends.getFriendInfo(friendUser, user)
			const { groups } = friendInfo
			ret = ret.filter((info) =>
				info.folder && groups.includes(info.name)
			)
		}

		if (typeof options.filterExtension == 'string') {
			let ext = options.filterExtension.split(',')
			ext = ext.concat(ext.map((e) => e.toUpperCase()))
			//console.log('ext', ext)

			const regex = new RegExp(`\\.(${ext.join('|')})$`, 'i')
			const results = []
			for (const info of ret) {
				if (info.folder) {
					const filter = (ext.length == 1) ? ext[0] : `{${ext.join(',')}}`
					const filterPath = path.join(rootPath, info.name, '**/*.' + filter)
					const entries = await fg(filterPath)
					results.push(entries.length > 0)
				}
				else {
					results.push(regex.test(info.name))
				}
			}

			ret = ret.filter((f, idx) => results[idx])

		}

		if (options.imageOnly === true) {
			ret = ret.filter((info) => {
				return info.folder === true || isImage(info.name)
			})
		}

		if (options.filesOnly === true) {
			ret = ret.filter((info) => info.folder === false)
		}

		if (options.folderOnly === true) {
			ret = ret.filter((info) => info.folder === true)
		}

		res.json(ret)
	}
	catch (e) {
		console.log('error', e)
		res.json([])
	}

})




router.post('/save', function (req, res) {
	if (!req.files) {
		return res.status(400).send('No files were uploaded.');

	}

	const user = req.session.user
	const destPath = util.getFilePath(user, req.body.destPath)
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




router.post('/move', async function (req, res) {
	const fileName = req.body.fileName
	const destPath = req.body.destPath

	const user = req.session.user
	const fullPath = util.getFilePath(user, fileName)
	const fullDest = path.join(util.getFilePath(user, destPath), path.basename(fileName))
	console.log('fullDest', fullDest)

	try {
		await fs.move(fullPath, fullDest)
		res.status(200).send('File moved !')
	}
	catch (e) {
		console.log('error', e)
		res.status(400).send(e.message)
	}

})



router.get('/load', async function (req, res) {
	//console.log('load req', req.query, req.session.userInfo)
	const { fileName, friendUser } = req.query
	const { user, userInfo } = req.session
	try {
		const filePath = await login.getFilePathChecked(user, fileName, friendUser)
		const { autoImageResizing } = userInfo.settings || {}
		//console.log('autoImageResizing', autoImageResizing)

		if (util.isImage(filePath) && autoImageResizing === true) {
			//console.log('resize image')
			genThumbnail(filePath, res, '90%')
		}
		else if (filePath.endsWith('.mp4')) {
			// Ensure there is a range given for the video
			const range = req.headers.range;
			console.log('range', range)
			if (!range) {
				console.log(req.headers)
				res.sendFile(filePath)
				return
			}

			const videoSize = (await getFileInfo(filePath)).size

			const CHUNK_SIZE = 10 ** 6; // 1MB
			const start = Number(range.replace(/\D/g, ""));
			const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

			// Create headers
			const contentLength = end - start + 1;
			const headers = {
				"Content-Range": `bytes ${start}-${end}/${videoSize}`,
				"Accept-Ranges": "bytes",
				"Content-Length": contentLength,
				"Content-Type": "video/mp4",
			};
			//console.log('headers', headers)

			// HTTP Status 206 for Partial Content
			res.writeHead(206, headers);

			// create video read stream for this particular chunk
			const videoStream = fs.createReadStream(filePath, { start, end });

			// Stream the video chunk to the client
			videoStream.pipe(res);
		}
		else {
			res.sendFile(filePath)
		}

	}
	catch (e) {
		res.status(400).send(e)
	}
})

router.get('/loadThumbnail', async function (req, res) {
	//console.log('load req', req.query)
	const { fileName, size, friendUser } = req.query
	const user = req.session.user

	try {
		const filePath = await login.getFilePathChecked(user, fileName, friendUser)

		genThumbnail(filePath, res, size)
	}
	catch (e) {
		res.status(400).send(e)
	}
})

module.exports = router
