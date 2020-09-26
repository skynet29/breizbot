//@ts-check

const { collection, buildDbId } = require('../lib/dbUtil.js')

const db = collection('music-songs')

const path = require('path')
const fg = require('fast-glob')
const config = require('../lib/config')
const util = require('../lib/util')
const { getFileInfo } = util

const cloudPath = config.CLOUD_HOME

async function findFiles(owner) {
    const filterPath = path.join(cloudPath, owner, '**/*.mp3')
    const entries = await fg(filterPath)
    const ret = []	
    for await (const entry of entries) {
        const filePath = entry.replace(cloudPath, '')
        const fileName = filePath.replace('/' + owner, '')
        const info = await getFileInfo(entry, {getMP3Info: true})
        if (info.mp3) {
            const {title, artist} = info.mp3
            if (title != undefined && artist != undefined) {
                ret.push({
                    owner,
                    fileName,       
                    title,
                    artist
                })
            }
        }
    }
    //console.log('ret', ret)
    return ret

}

module.exports = {

    generateDb: async function(owner) {
        const entries = await findFiles(owner)
        await db.deleteMany({owner})
        await db.insertMany(entries)
    },

    getAllSongs(owner) {
        return db.find({ owner }).toArray()
    },

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


