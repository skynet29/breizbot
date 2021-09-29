const fs = require('fs-extra')

module.exports = function (ctx, router) {

    const { db, util } = ctx
    const { buildDbId } = db.constructor

    router.post('/', async function (req, resp) {

        const { offset, filters } = req.body

        try {
            const movies = await db.find(filters).sort({ year: -1 }).skip(offset).limit(20).toArray()
            resp.json(movies)
        }
        catch (e) {
            resp.status(404).send(e.message)
        }

    })

    router.post('/importFile', async function (req, resp) {

        const { filePath } = req.body

        const fullPath = db.getFilePath(filePath)

        try {
            const text = await fs.readFile(fullPath)
            const movies = JSON.parse(text)
            await db.insertMany(movies)
            resp.sendStatus(200)
        }
        catch (e) {
            resp.status(404).send(e.message)
        }

    })


    router.post('/moviesQty', async function (req, resp) {

        const { filters } = req.body


        try {
            const moviesQty = await db.countDocuments(filters)
            resp.json({ moviesQty })
        }
        catch (e) {
            resp.status(404).send(e.message)
        }

    })    

    router.post('/', async function (req, resp) {

        const data = req.body

        try {
            await db.insertOne(data)
            resp.sendStatus(200)
        }
        catch (e) {
            resp.status(404).send(e.message)
        }
    })

    router.post('/updateMovie/:movieId', async function (req, resp) {

        const data = req.body

        try {
            await db.updateOne(buildDbId(req.params.movieId), { $set: data })
            resp.sendStatus(200)
        }
        catch (e) {
            resp.status(404).send(e.message)
        }
    })

    router.get('/getStyles', async function (req, resp) {


        try {
            const styles = await db.distinct('style')
            resp.json(styles)
        }
        catch (e) {
            resp.status(404).send(e.message)
        }
    })    

    router.get('/getFranchises', async function (req, resp) {


        try {
            const franchises = await db.distinct('franchise')
            resp.json(franchises)
        }
        catch (e) {
            resp.status(404).send(e.message)
        }
    })  
    
    router.get('/getActors', async function (req, resp) {


        try {
            const mainActors = await db.distinct('mainActor')
            resp.json(mainActors)
        }
        catch (e) {
            resp.status(404).send(e.message)
        }
    })      

    router.post('/deleteMovie/:movieId', async function (req, resp) {

        try {
            await db.deleteOne(buildDbId(req.params.movieId))
            resp.sendStatus(200)
        }
        catch (e) {
            resp.status(404).send(e.message)
        }
    })
    

}