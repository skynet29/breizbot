module.exports = function (ctx) {

    const { db, util } = ctx
    const { buildDbId } = db.constructor

    return {

        removeSong: async function (songId) {
            console.log(`removeSong`, songId)
            return db.deleteOne(buildDbId(songId))
        },


        removePlaylist: async function (name) {
            return db.deleteMany({ name })
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