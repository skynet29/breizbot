
module.exports = function (ctx, router) {

    const { websocket, db, buildDbId } = ctx

    const wssServer = websocket.addServer('/stream/server/', true, false, (sock, userName) => {


        console.log('wssServer connection', userName)
        const webcastId = sock.path.split('/')[3]

        sock.on('message', (buffer) => {
            //console.log('streamer message')
            wssClient.clients.forEach((client) => {
                if (client.webcastId == webcastId) {
                    client.send(buffer)
                }
            })

        })

        sock.on('close', (code) => {
            console.log('wssServer deconnection', userName)
        })

        sock.on('error', (err) => {
            console.log('connection error')
        })
    })

    const wssClient = websocket.addServer('/stream/client/', true, false, (sock, userName) => {
        console.log('wssClient connection', userName)
        sock.webcastId = sock.path.split('/')[3]

        sock.on('close', (code) => {
            console.log('wssClient deconnection', userName)
        })

    })

    router.post('/', async function (req, res) {

        const data = req.body
        data.userName = req.session.user


        const ret = await db.insertOne(data)
        console.log('ret', ret)
        res.sendStatus(200)

    })

    router.put('/:id', async function (req, res) {

        const { id } = req.params
        const data = req.body
        console.log('data', data)

        const ret = await db.updateOne(buildDbId(id), {$set: data})
        console.log('ret', ret)
        res.sendStatus(200)

    })

    router.delete('/:id', async function (req, res) {

        const { id } = req.params

        const ret = await db.deleteOne(buildDbId(id))
        console.log('ret', ret)
        res.sendStatus(200)

    })

    router.get('/:id', async function (req, res) {

        const { id } = req.params

        const ret = await db.findOne(buildDbId(id))
        res.json(ret)

    })

    router.get('/', async function (req, res) {

        console.log('get')

        const userName = req.session.user

        const results = []

        const servers = await db.find({ userName }).toArray()

        results.push({
            title: 'Servers',
            icon: 'fa fa-upload',
            children: servers.map((i) => {
                return {
                    title: i.name,
                    icon: 'fa fa-video',
                    data: {
                        id: i._id.toString(),
                        type: 'server'
                    }
                }
            })
        })

        const clients = await db.find({ users: userName }).toArray()

        results.push({
            title: 'Clients',
            icon: 'fa fa-download',
            children: clients.map((i) => {
                return {
                    title: i.name,
                    icon: 'fa fa-video',
                    data: {
                        id: i._id.toString(),
                        type: 'client'
                    }
                }
            })
        })

        console.log('results', results)
        res.json(results)

    })

}