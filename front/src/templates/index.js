module.exports = function (ctx, router) {

    const { db, util } = ctx
    const { buildDbId } = db.constructor


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
}