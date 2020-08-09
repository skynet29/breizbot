const fetch = require('node-fetch')
const getFavicons = require('get-website-favicon')

module.exports = function (ctx, router) {

    const { db, buildDbId, events } = ctx

    events.on('userDeleted', async (userName) => {
        try {
            await db.deleteMany({ userName })
        }
        catch (e) {
            console.error(e)
        }
    })

    events.on('addFavorite', async (data) => {
        console.log('addFavorite', data)
        const { userName, name, link } = data
        try {
            await addFavorite(userName, "0", {
                type: 'link',
                link,
                name
            })
        }
        catch (e) {
            console.error(e)
        }
    })


    async function changeParent(userName, id, newParentId) {
        const count = await db.countDocuments({ userName, parentId: newParentId })
        const update = { parentId: newParentId, idx: count }
        return db.updateOne(buildDbId(id), { $set: update })
    }

    async function insertBefore(userName, id, newParentId, beforeIdx) {
        let update = { $inc: { idx: 1 } }
        let filter = { userName, parentId: newParentId, idx: { $gte: beforeIdx } }
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

    async function addFavorite(userName, parentId, info) {
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

        const ret = await db.insertOne({ userName, parentId, info, idx: count })
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

    async function getFavorites(userName, result) {
        const children = await db.find({ userName, parentId: result.key }).sort({ idx: 1 })
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
            await getFavorites(userName, newChild)
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
        const userName = req.session.user

        //console.log('getFavorites', userName, parentId)

        try {
            const result = { title: 'Home', key: '0', folder: true, children: [] }
            await getFavorites(userName, result)
            res.json(result)
        }
        catch (e) {
            res.sendStatus(400)
        }

    })

    router.post('/addFavorite', async function (req, res) {
        const userName = req.session.user
        const { parentId, info } = req.body

        //console.log('addFavorite', userName, parentId, info)

        try {
            const ret = await addFavorite(userName, parentId, info)
            res.json(ret)
        }
        catch (e) {
            res.status(400).send(e.message)
        }
    })

    router.post('/updateLink', async function (req, res) {
        const userName = req.session.user
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

    router.post('/insertBefore', async function (req, res) {
        const userName = req.session.user
        const { id, newParentId, beforeIdx } = req.body

        //console.log('changeParent', userName, id, newParentId)

        try {
            await insertBefore(userName, id, newParentId, beforeIdx)
            res.sendStatus(200)
        }
        catch (e) {
            res.status(400).send(e.message)
        }
    })


    router.post('/changeParent', async function (req, res) {
        const userName = req.session.user
        const { id, newParentId } = req.body

        //console.log('changeParent', userName, id, newParentId)

        try {
            const ret = await changeParent(userName, id, newParentId)
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