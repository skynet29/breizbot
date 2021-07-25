const fetch = require('node-fetch')
const getFavicons = require('get-website-favicon')

module.exports = function (ctx, router) {

    const { db } = ctx
    const { buildDbId } = db.constructor

    async function changeParent(id, newParentId) {
        const count = await db.countDocuments({ parentId: newParentId })
        const update = { parentId: newParentId, idx: count }
        return db.updateOne(buildDbId(id), { $set: update })
    }

    async function insertBefore(id, newParentId, beforeIdx) {
        let update = { $inc: { idx: 1 } }
        let filter = { parentId: newParentId, idx: { $gte: beforeIdx } }
        await db.updateMany(filter, update)

        update = { $set: { parentId: newParentId, idx: beforeIdx } }
        return db.updateOne(buildDbId(id), update)
    }

    async function updateLink(id, name, link) {
        const info = {
            type: 'link',
            name,
            link,
        }

        const data = await getFavicons(link)
        if (data.icons.length > 0) {
            info.icon = data.icons[0].src
        }

        const update = { $set: { info } }
        await db.updateOne(buildDbId(id), update)
        return info

    }

    async function addFavorite(parentId, info) {
        const { type, link } = info

        const count = await db.countDocuments({ userName, parentId })
        //console.log('count', count)

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

        const ret = await db.insertOne({ parentId, info, idx: count })
        return { id: ret.insertedId.toString(), info }
    }

    async function getIdsRecursively(parentId, result) {
        result.push(parentId)
        const children = await db.find({ parentId })
        while (await children.hasNext()) {
            const child = await children.next()
            const id = child._id.toString()
            await getIdsRecursively(id, result)
        }
    }

    async function getFavorites(result) {
        const children = await db.find({ parentId: result.key }).sort({ idx: 1 })
        while (await children.hasNext()) {
            const child = await children.next()
            const id = child._id.toString()
            const { link, icon, name, type } = child.info
            const newChild = { title: name, key: id }
            if (type == 'link') {
                newChild.data = { icon, link }
            }
            else {
                newChild.folder = true
                newChild.children = []
            }
            result.children.push(newChild)
            await getFavorites(newChild)
        }
    }


    async function removeFavorite(id) {
        console.log(`removeFavorite`, id)
        const ids = []
        await getIdsRecursively(id, ids)
        //console.log('ids', ids)

        await db.deleteMany(buildDbId(ids))
    }


    router.post('/getFavorites', async function (req, res) {

        //console.log('getFavorites', userName, parentId)

        try {
            const result = { title: 'Home', key: '0', folder: true, children: [] }
            await getFavorites(result)
            res.json(result)
        }
        catch (e) {
            res.sendStatus(400)
        }

    })

    router.post('/addFavorite', async function (req, res) {
        const { parentId, info } = req.body

        //console.log('addFavorite', userName, parentId, info)

        try {
            const ret = await addFavorite(parentId, info)
            res.json(ret)
        }
        catch (e) {
            res.status(400).send(e.message)
        }
    })

    router.post('/updateLink', async function (req, res) {
        const { id, name, link } = req.body

        //console.log('addFavorite', userName, parentId, info)

        try {
            const ret = await updateLink(id, name, link)
            res.json(ret)
        }
        catch (e) {
            res.status(400).send(e.message)
        }
    })

    router.post('/setPwd', async function (req, res) {
        const { id, pwd } = req.body

        //console.log('addFavorite', userName, parentId, info)

        try {
            await db.updateOne(buildDbId(id), { $set: { pwd } })
            res.sendStatus(200)
        }
        catch (e) {
            res.status(400).send(e.message)
        }
    })

    router.post('/getPwd', async function (req, res) {
        const { id } = req.body

        //console.log('addFavorite', userName, parentId, info)

        try {
            const { pwd } = await db.findOne(buildDbId(id), { projection: { _id: 0, pwd: 1 } })
            res.json({ pwd })
        }
        catch (e) {
            res.status(400).send(e.message)
        }
    })


    router.post('/insertBefore', async function (req, res) {
        const { id, newParentId, beforeIdx } = req.body

        //console.log('changeParent', userName, id, newParentId)

        try {
            await insertBefore(id, newParentId, beforeIdx)
            res.sendStatus(200)
        }
        catch (e) {
            res.status(400).send(e.message)
        }
    })


    router.post('/changeParent', async function (req, res) {
        const { id, newParentId } = req.body

        //console.log('changeParent', userName, id, newParentId)

        try {
            const ret = await changeParent(id, newParentId)
            res.sendStatus(200)
        }
        catch (e) {
            res.status(400).send(e.message)
        }
    })


    router.delete('/removeFavorite/:id', async function (req, res) {
        //console.log('removeFavorite', req.params)
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