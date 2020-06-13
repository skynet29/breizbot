const fetch = require('node-fetch')
const getFavicons = require('get-website-favicon')

module.exports = function (ctx, router) {

    const { db, util, events } = ctx

    events.on('userdeleted', async (userName) => {
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

    function getFavorites(userName, parentId) {
        return db
            .find({ userName, parentId })
            .toArray()
    }

    function changeParent(id, newParentId) {
        const update = {parentId: newParentId, idx: 0}
        return db.updateOne({_id: util.dbObjectID(id)}, {$set: update})
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

    // async function getRecursively(parentId, result) {
    //     const children = await db.find({ parentId })
    //     while (await children.hasNext()) {
    //         if (!result.folder) {
    //             result.folder = true
    //             result.children = []
    //         }
    //         const child = await children.next()
    //         const id = child._id.toString()
    //         const {link, icon, name, type} = child.info
    //         const newChild = {title: name, key: id}
    //         if (type == 'link') {
    //             newChild.data = {icon, link}
    //         }
    //         result.children.push(newChild)
    //         await getRecursively(id, newChild)
    //     }
    // }


    async function removeFavorite(id) {
        console.log(`removeFavorite`, id)
        const ids = []
        await getIdsRecursively(id, ids)
        //console.log('ids', ids)

        await db.deleteMany({ _id: { $in: ids.map((i) => util.dbObjectID(i)) } })
    }


    router.post('/getFavorites', async function (req, res) {
        const userName = req.session.user
        const { parentId } = req.body

        //console.log('getFavorites', userName, parentId)

        try {
            const results = await getFavorites(userName, parentId)
            //console.log('results', results)
            res.json(results)
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
    
    router.post('/changeParent', async function (req, res) {
        const userName = req.session.user
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