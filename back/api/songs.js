//@ts-check

const router = require('express').Router()

const dbSongs = require('../db/songs.js')

router.post('/generateDb', async function (req, res) {
    const userName = req.session.user
    
    await dbSongs.generateDb(userName)

    res.sendStatus(200)
})

router.post('/querySongs', async function (req, res) {
    const userName = req.session.user
    const {query} = req.body
    
    try {
        const ret = await dbSongs.querySongs(userName, query)

        res.json(ret)
    }
    catch(e) {
        res.status(404).send(e.message)
    }

})

module.exports = router