const simpleThumbnail = require('simple-thumbnail')
const {promisify} = require('util')
const imageSize = promisify(require('image-size'))
const path = require('path')
const ffmpeg = require('ffmpeg')

function isImage(fileName) {
	return (/\.(gif|jpg|jpeg|png)$/i).test(fileName)
}

function genThumbnail(filePath, res, size) {
	return simpleThumbnail(filePath, res, size)
}

function resizeImage(filePath, fileName, resizeFormat) {
	const extname = path.extname(fileName)
	const basename = path.basename(fileName, extname)

	const fullName = path.join(filePath, fileName)
	const resizedFullName = path.join(filePath, basename + '_resized' + extname)
	return simpleThumbnail(fullName, resizedFullName, resizeFormat)
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
				video.fnExtractSoundToMP3(outFileName, function (error, file) {
					if (!error) {
						console.log('Audio file: ' + file);
						resolve()					
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
	imageSize
}