const { collection, buildDbId } = require('../lib/dbUtil.js')


module.exports = {

	getMusicByArtist(owner, artist) {
		return collection('music-songs').find({ owner, artist: { $regex: artist, $options: 'i' } }).toArray()
	},

	getMusicByTitleAndArtist(owner, title, artist) {
		return collection('music-songs').findOne({ 
            owner, 
            artist: { $regex: artist, $options: 'i' },
            title: { $regex: title, $options: 'i' }
         })
	},

	getMusicByTitle(owner, title) {
		return collection('music-songs').findOne({ 
            owner, 
            title: { $regex: title, $options: 'i' }
         })
	},

	getSongById(id) {
		return collection('music-songs').findOne(buildDbId(id))
	}

}


