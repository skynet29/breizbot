//@ts-check

const router = require('express').Router()

const dbSongs = require('../db/songs.js')

router.post('/generateDb', async function (req, res) {
    const userName = req.session.user
    
    await dbSongs.generateDb(userName)

    res.sendStatus(200)
})

module.exports = router