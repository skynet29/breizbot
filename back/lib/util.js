const simpleThumbnail = require('simple-thumbnail')
const {promisify} = require('util')
const imageSize = promisify(require('image-size'))
const ffmpeg = require('ffmpeg-static')


module.exports = {

	isImage: function(fileName) {
		return (/\.(gif|jpg|jpeg|png)$/i).test(fileName)
	},

	genThumbnail: function(filePath, res, size) {
		return simpleThumbnail(filePath, res, size, {
			path: ffmpeg.path})
	},

	imageSize
}