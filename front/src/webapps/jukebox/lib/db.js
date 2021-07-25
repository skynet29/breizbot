module.exports = function (ctx) {

    const { db, util } = ctx
    const { buildDbId } = db.constructor

    return {

        removeSong: async function (songId) {
            console.log(`removeSong`, songId)
            return db.deleteOne(buildDbId(songId))
        },

        getPlaylist: async function () {

            return db.distinct('name')
        },

        removePlaylist: async function (name) {
            return db.deleteMany({ name })
        },

        getPlaylistSongs: async function (name) {

            const records = await db
                .find({ name: { $regex: name, $options: 'i' } })
                .sort({ idx: 1 }).toArray()
            const promises = records.map(async (f) => {
                const { fileName, rootDir, friendUser } = f.fileInfo
                const filePath = db.getFilePath(rootDir + fileName, friendUser)
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

        addSong: async function (name, fileInfo, checkExists) {
            console.log('addSong', name, fileInfo, checkExists)
            const count = await db.countDocuments({ name })
            if (checkExists && count != 0) {
                return false
            }
            await db.insertOne({ name, fileInfo, idx: count })
            return true

        }

    }

}