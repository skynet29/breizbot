const fetch = require('node-fetch')
const getFavicons = require('get-website-favicon')

module.exports = function (ctx, router) {

    const { db, util } = ctx

    function getFavorites(userName, parentId) {
        return db
            .find({ userName, parentId })
            .toArray()
    }

    async function addFavorite(userName, parentId, info) {
        const { type, link } = info

        if (type == 'link') {
            try {
                const data = await getFavicons(link)
                if (data.icons.length > 0) {
                    info.icon = data.icons[0].src    
                }
            }
            catch (e) {
                console.error(e)
            }
        }

        const ret = await db.insertOne({ userName, parentId, info })
        return {id: ret.insertedId.toString(), info}
    }

    async function getIdsRecursively(parentId, result) {
        result.push(parentId);
        const children = await db.find({ parentId });
        while (await children.hasNext()) {
            const child = await children.next()
            const id = child._id.toString();
            await getIdsRecursively(id, result)
        }
    }

    async function removeFavorite(id) {
        console.log(`removeFavorite`, id)
        const ids = []
        await getIdsRecursively(id, ids)
        console.log('ids', ids)

        const ret = await db.deleteMany({ _id: { $in: ids.map((i) => util.dbObjectID(i)) } })
        console.log('ret', ret)
    }

    router.post('/getFavorites', async function (req, res) {
        const userName = req.session.user
        const { parentId } = req.body

        console.log('getFavorites', userName, parentId)

        try {
            const results = await getFavorites(userName, parentId)
            console.log('results', results)
            res.json(results)
        }
        catch (e) {
            res.sendStatus(400)
        }
    })

    router.post('/addFavorite', async function (req, res) {
        const userName = req.session.user
        const { parentId, info } = req.body

        console.log('addFavorite', userName, parentId, info)

        try {
            const ret = await addFavorite(userName, parentId, info)
            res.json(ret)
        }
        catch (e) {
            res.status(400).send(e.message)
        }
    })


    router.delete('/removeFavorite/:id', async function (req, res) {
        console.log('removeFavorite', req.params)
        const { id } = req.params

        try {
            await removeFavorite(id)
            res.sendStatus(200)
        }
        catch (e) {
            res.sendStatus(400)
        }
    })
}