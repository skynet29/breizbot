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
	console.log('fileInfo', req.body)
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
	console.log('save req')
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