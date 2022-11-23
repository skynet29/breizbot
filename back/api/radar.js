const router = require('express').Router()
const dbRadar = require('../db/radar.js')


router.get('/', async function (req, res) {
    try {
        const radar = await dbRadar.getRadar()

        res.json(radar)
    }
    catch (e) {
        console.log('Error', e)
        res.status(400).send(e)
    }
})



module.exports = router