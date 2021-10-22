const fs = require('fs-extra')

module.exports = function (ctx, router) {

    const { db, util } = ctx
    const { buildDbId } = db.constructor

    function buildFilter(filters) {
        if (filters.actor != undefined) {
            filters.$or = [{actor1: filters.actor},{actor2: filters.actor}]
            delete filters.actor
        }
        //console.log('filters', filters)
    }

    router.post('/getMovies', async function (req, resp) {

        const { offset, filters } = req.body

        buildFilter(filters)

        try {
            const movies = await db.find(filters).sort({ year: -1, title: 1 }).skip(offset).limit(20).toArray()
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

        buildFilter(filters)

        try {
            const moviesQty = await db.countDocuments(filters)
            resp.json({ moviesQty })
        }
        catch (e) {
            resp.status(404).send(e.message)
        }

    })    

    router.post('/addMovie', async function (req, resp) {

        const data = req.body

        try {
            const ret = await db.insertOne(data)
            //console.log('addMovie', ret.insertedId)
            const info = await db.findOne({_id: ret.insertedId})
            resp.json(info)
        }
        catch (e) {
            resp.status(404).send(e.message)
        }
    })

    router.post('/updateMovie/:movieId', async function (req, resp) {

        const data = req.body

        try {
            const id = buildDbId(req.params.movieId)
            await db.updateOne(id, { $set: data })
            const ret = await db.findOne(id)
            resp.json(ret)
        }
        catch (e) {
            resp.status(404).send(e.message)
        }
    })

    router.get('/getInfos', async function (req, resp) {
        try {
            let styles = await db.distinct('style')
            styles = styles.filter(i => i != '')

            let franchises = await db.distinct('franchise')
            franchises = franchises.filter(i => i != '')

            const actor1 = await db.distinct('actor1')
            const actor2 = await db.distinct('actor2')
            let actors = util.mergeArray(actor1, actor2)
            actors = actors.filter(i => i != '').sort()

            let directors = await db.distinct('director')
            directors = directors.filter(i => i != '')

            resp.json({styles, actors, directors, franchises})
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