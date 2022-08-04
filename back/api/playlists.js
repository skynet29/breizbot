//@ts-check

const router = require('express').Router()
const db = require('../db/playlists.js')

router.post('/getPlaylist', async function (req, res) {
    const userName = req.session.user

    const list = await db.getPlaylist(userName)
    res.json(list)
})

router.post('/getPlaylistSongs', async function (req, res) {
    const userName = req.session.user
    
    const { name } = req.body
    const list = await db.getPlaylistSongs(userName, name)
    res.json(list)
})

module.exports = router