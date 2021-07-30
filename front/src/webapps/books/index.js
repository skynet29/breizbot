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
        console.log('[Book] addBook', data)

        try {
            await db.insertOne(data)
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