module.exports = function (ctx, router) {

    const { db, util } = ctx
    const { buildDbId } = db.constructor


    router.get('/', async function (req, resp) {
        try {
            const ret = await db.find({}).toArray()
            resp.json(ret)
        }
        catch (e) {
            resp.status(404).send(e.message)
        }

    })

    router.post('/update', async function (req, resp) {


        const { name, actions, mappings } = req.body

        try {
            await db.updateOne({ name }, { $set: { actions, mappings } })
            resp.sendStatus(200)
        }
        catch (e) {
            resp.status(404).send(e.message)

        }
    })

    router.post('/add', async function (req, resp) {

        const data = req.body

        try {
            await db.insertOne(data)
            resp.sendStatus(200)
        }
        catch (e) {
            resp.status(404).send(e.message)

        }
    })

    router.post('/delete', async function (req, resp) {

        const data = req.body

        try {
            await db.deleteOne({ name: data.name })
            resp.sendStatus(200)
        }
        catch (e) {
            resp.status(404).send(e.message)

        }
    })
}