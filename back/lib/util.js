const simpleThumbnail = require('simple-thumbnail')
const {promisify} = require('util')
const imageSize = promisify(require('image-size'))
const ffmpeg = require('ffmpeg-static')
const path = require('path')


module.exports = {

	isImage: function(fileName) {
		return (/\.(gif|jpg|jpeg|png)$/i).test(fileName)
	},

	genThumbnail: function(filePath, res, size) {
		return simpleThumbnail(filePath, res, size, {
			path: ffmpeg.path})
	},

	resizeImage: function(filePath, fileName, resizeFormat) {
		const fullName = path.join(filePath, fileName)
		const resizedFullName = path.join(filePath, 'Resized_' + fileName)
		return simpleThumbnail(fullName, resizedFullName, resizeFormat, {
			path: ffmpeg.path
		})
	},

	imageSize
}