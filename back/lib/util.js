const simpleThumbnail = require('simple-thumbnail')
const {promisify} = require('util')
const imageSize = promisify(require('image-size'))
const path = require('path')
const ffmpeg = require('ffmpeg')
const fs = require('fs-extra')
const NodeID3 = require('node-id3')
const config = require('../lib/config')

const cloudPath = config.CLOUD_HOME

function getFilePath(user, filePath, friendUser) {
	let rootPath = path.join(cloudPath, user, filePath)
	if (friendUser != undefined && friendUser != '') {
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

async function resizeImage(filePath, fileName, resizeFormat) {
	const extname = path.extname(fileName)
	const basename = path.basename(fileName, extname)

	const fullName = path.join(filePath, fileName)
	const resizedFileName = basename + '_resized' + extname
	const resizedFullName = path.join(filePath, resizedFileName)
	await simpleThumbnail(fullName, resizedFullName, resizeFormat)
	return getFileInfo(resizedFullName)

}

function readID3(filePath) {
	return new Promise(function(resolve, reject) {
		NodeID3.read(filePath, function(err, tags) {
			if (err) {
				reject(err)
			}
			resolve( {
				artist: tags.artist,
				title: tags.title,
				year: tags.year,
				genre: tags.genre
			})
		})
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

	if (ret.isImage) {
		const dimension = await imageSize(filePath)
		//console.log('dimension', dimension)
		ret.dimension = dimension
	}

	//console.log('ret', ret)

	return ret

}

function convertToMP3(filePath, fileName) {
	return new Promise((resolve, reject) => {			
		try {
			const extname = path.extname(fileName)
			const basename = path.basename(fileName, extname)

			const outFileName = path.join(filePath, basename + '.mp3')
			console.log('outFileName', outFileName)

			var process = new ffmpeg(path.join(filePath, fileName))
			process.then(function (video) {
				// Callback mode
				video.fnExtractSoundToMP3(outFileName, async function (error, file) {
					if (!error) {
						console.log('Audio file: ' + file);
						const info = await getFileInfo(outFileName)
						//console.log('statInfo', statInfo)
					
						resolve(info)
											
					}
					else {
						console.log('error', error)
						reject(error)
					}
				})
			}, function (err) {
				console.log('Error: ' + err)
				reject(err)
			})
		} catch (e) {
			console.log(e.code)
			console.log(e.msg)
			reject(e)
		}			
	})
}

module.exports = {
	isImage, 
	genThumbnail,
	resizeImage,
	convertToMP3,
	getFileInfo,
	getFilePath
}