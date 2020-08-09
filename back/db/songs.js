const { collection, buildDbId } = require('../lib/dbUtil.js')

const db = collection('music-songs')

module.exports = {

	getMusicByArtist(owner, artist) {
		return db.find({ owner, artist: { $regex: artist, $options: 'i' } }).toArray()
	},

	getMusicByTitleAndArtist(owner, title, artist) {
		return db.findOne({ 
            owner, 
            artist: { $regex: artist, $options: 'i' },
            title: { $regex: title, $options: 'i' }
         })
	},

	getMusicByTitle(owner, title) {
		return db.findOne({ 
            owner, 
            title: { $regex: title, $options: 'i' }
         })
	},

	getSongById(id) {
		return db.findOne(buildDbId(id))
	}

}


