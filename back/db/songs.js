const { collection, buildDbId } = require('../lib/dbUtil.js')


module.exports = {

	getMusicByArtist(owner, artist) {
		return collection('music-songs').find({ owner, artist: { $regex: artist, $options: 'i' } }).toArray()
	},

	getSongById(id) {
		return collection('music-songs').findOne(buildDbId(id))
	}

}


