module.exports = function (ctx) {

    const { db, buildDbId, util } = ctx

    return {

        cleanDb: function (userName) {
            return db.deleteMany({ userName })
        },

        removeSong: async function (songId) {
            console.log(`removeSong`, songId)
            return db.deleteOne(buildDbId(songId))
        },

        getPlaylist: async function (userName) {

            return db.distinct('name', { userName })
        },

        removePlaylist: async function (userName, name) {
            return db.deleteMany({ userName, name })
        },

        getPlaylistSongs: async function (userName, name) {
            
            const records = await db
                .find({ userName, name: { $regex: name, $options: 'i' } })
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
        },

        getPlaylistSong: async function (id) {            
            return await db.findOne(buildDbId(id))
        },

        swapSongIndex: async function (songId1, songId2) {
            const id1 = buildDbId(songId1)
            const id2 = buildDbId(songId2)
            const record1 = await db.findOne(id1)
            const record2 = await db.findOne(id2)
            await db.updateOne(id1, { $set: { idx: record2.idx } })
            await db.updateOne(id2, { $set: { idx: record1.idx } })

        },

        addSong: async function (userName, name, fileInfo, checkExists) {
            console.log('addSong', userName, name, fileInfo, checkExists)
            const count = await db.countDocuments({ userName, name })
            if (checkExists && count != 0) {
                return false
            }
            await db.insertOne({ userName, name, fileInfo, idx: count })
            return true

        }

    }

}