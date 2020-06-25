const simpleThumbnail = require('simple-thumbnail')
const { promisify } = require('util')
const imageSize = promisify(require('image-size'))
const path = require('path')
const fs = require('fs-extra')
const NodeID3 = require('node-id3')
const config = require('./config')
const { ObjectID } = require('mongodb')
const db = require('./db')
const ExifImage = require('exif').ExifImage


const cloudPath = config.CLOUD_HOME

function getFilePath(user, filePath, friendUser) {
	let rootPath = path.join(cloudPath, user, filePath)
	if (friendUser != undefined && friendUser != '') {
		rootPath = path.join(cloudPath, friendUser, 'share', filePath)
	}
	return rootPath
}

async function getFilePathChecked(user, filePath, friendUser) {
	let rootPath = path.join(cloudPath, user, filePath)
	if (friendUser != undefined && friendUser != '') {
		const info = await db.getFriendInfo(friendUser, user)
		const group = filePath.split('/')[1]
		if (info == null || !info.groups.includes(group)) {
			throw 'access not authroized'
		}
		rootPath = path.join(cloudPath, friendUser, 'share', filePath)
	}
	return rootPath
}

function isImage(fileName) {
	return (/\.(gif|jpg|jpeg|png)$/i).test(fileName)
}

function genThumbnail(filePath, res, size) {
	return simpleThumbnail(filePath, res, size)
}


function readID3(filePath) {
	return new Promise(function (resolve, reject) {
		NodeID3.read(filePath, function (err, tags) {
			if (err) {
				reject(err)
			}
			resolve({
				artist: tags.artist,
				title: tags.title,
				year: tags.year,
				genre: tags.genre
			})
		})
	})

}

function getExif(fileName) {
	return new Promise((resolve, reject)=> {
		try {
			new ExifImage({ image: fileName }, function (error, exifData) {
				if (error)
					reject(error.message)
				else
					resolve(exifData)
			})			
		}
		catch(e) {
			reject(error.message)
		}
	})
}

async function getFileInfo(filePath, options) {
	options = options || {}
	const statInfo = await fs.lstat(filePath)
	//console.log('statInfo', statInfo)
	let ret = {
		name: path.basename(filePath),
		folder: statInfo.isDirectory(),
		size: statInfo.size,
		isImage: isImage(filePath),
		mtime: statInfo.mtimeMs
	}

	if (!ret.folder && options.getMP3Info === true && filePath.toLowerCase().endsWith('.mp3')) {
		const tags = await readID3(filePath)

		ret.mp3 = tags
	}

	if (!ret.folder && options.getExifInfo === true && filePath.toLowerCase().endsWith('.jpg')) {
		try {
			const exifInfo = await getExif(filePath)
			ret.exif = exifInfo
		}
		catch(e) {
			console.log('ExifError', e)
		}
	}

	if (ret.isImage) {
		const dimension = await imageSize(filePath)
		//console.log('dimension', dimension)
		ret.dimension = dimension
	}

	//console.log('ret', ret)

	return ret

}


module.exports = {
	isImage,
	genThumbnail,
	getFileInfo,
	getFilePath,
	getFilePathChecked,
	dbObjectID: function (id) { return new ObjectID(id) }
}