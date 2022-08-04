//@ts-check

const { collection } = require('../lib/dbUtil.js')
const util = require('../lib/util.js')

const db = collection('app.jukebox')



module.exports = {
    getPlaylist: async function (userName) {

        return db.distinct('name', {userName})
    },
    
    
    getPlaylistSongs: async function (userName, name) {
    
        const records = await db
            .find({ name: { $regex: name, $options: 'i' }, userName })
            .sort({ idx: 1 }).toArray()
        const promises = records.map(async (f) => {
            const { fileName, rootDir, friendUser } = f.fileInfo
            const filePath = util.getFilePath(userName, rootDir + fileName, friendUser)
            //console.log('filePath', filePath)
            try {
                const info = await util.getFileInfo(filePath, { getMP3Info: true })
                return { mp3: info.mp3, fileInfo: f.fileInfo, id: f._id, status: 'ok' }
            }
            catch (e) {
                return { fileInfo: f.fileInfo, id: f._id, status: 'ko' }
            }
        })
        return await Promise.all(promises)
    }    
}