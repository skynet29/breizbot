module.exports = function (ctx, router) {

    const { db, util } = ctx
    const { buildDbId } = db.constructor

    router.post('/', async function (req, resp) {

        const { offset, filters } = req.body

        try {
            const books = await db.find(filters).sort({ year: -1 }).skip(offset).limit(20).toArray()
            resp.json(books)
        }
        catch (e) {
            resp.status(404).send(e.message)
        }

    })

    router.post('/booksQty', async function (req, resp) {

        const { filters } = req.body


        try {
            const booksQty = await db.countDocuments(filters)
            resp.json({ booksQty })
        }
        catch (e) {
            resp.status(404).send(e.message)
        }

    })

    router.post('/addBook', async function (req, resp) {

        const data = req.body

        try {
            await db.insertOne(data)
            resp.sendStatus(200)
        }
        catch (e) {
            resp.status(404).send(e.message)
        }
    })

    router.post('/updateBook/:bookId', async function (req, resp) {

        const data = req.body

        try {
            const id = buildDbId(req.params.bookId)
            await db.updateOne(id, { $set: data })
            const ret = await db.findOne(id)
            resp.json(ret)
        }
        catch (e) {
            resp.status(404).send(e.message)
        }
    })

    router.post('/deleteBook/:bookId', async function (req, resp) {

        try {
            await db.deleteOne(buildDbId(req.params.bookId))
            resp.sendStatus(200)
        }
        catch (e) {
            resp.status(404).send(e.message)
        }
    })

    router.get('/authors', async function (req, resp) {

        try {
            const authors = await db.distinct('author')
            resp.json(authors)
        }
        catch (e) {
            resp.status(404).send(e.message)
        }

    })

    router.post('/series', async function (req, resp) {

        const { author } = req.body

        try {
            const series = await db.distinct('series', { author })
            resp.json(series)
        }
        catch (e) {
            resp.status(404).send(e.message)
        }

    })

}