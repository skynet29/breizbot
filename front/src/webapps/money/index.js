const qif2json = require('qif2json')

module.exports = function (ctx, router) {

    const { db, buildDbId, util } = ctx

    router.post('/account', async function (req, res) {

        const userName = req.session.user
        const data = req.body

        data.type = 'account'
        data.userName = userName
        data.finalBalance = data.initialBalance

        try {
            await db.insertOne(data)
            res.sendStatus(200)
        }
        catch (e) {
            res.status(404).send(e.message)
        }
    })


    router.get('/account', async function (req, res) {

        const userName = req.session.user

        try {
            const data = await db.find({ userName, type: 'account' }, { projection: { name: 1, finalBalance: 1 } }).toArray()
            res.json(data)
        }
        catch (e) {
            res.status(404).send(e.message)
        }

    })

    router.delete('/account/:id', async function (req, res) {

        const accountId = req.params.id

        try {
            await db.deleteMany({ type: 'transaction', accountId })
            await db.deleteOne(buildDbId(accountId))
            res.sendStatus(200)
        }
        catch (e) {
            res.status(404).send(e.message)
        }

    })

    router.get('/account/:id/transactions', async function (req, res) {

        const accountId = req.params.id
        const offset = parseInt(req.query.offset)

        try {
            const data = await db.find({ type: 'transaction', accountId }).sort({date: -1}).skip(offset).limit(20).toArray()
            res.json(data)
        }
        catch (e) {
            res.status(404).send(e.message)
        }

    })

    router.post('/account/:id/importTransactions', async function (req, res) {

        const userName = req.session.user
        const accountId = req.params.id
        const { fileName } = req.body

        const filePath = util.getFilePath(userName, fileName)

        qif2json.parseFile(filePath, {}, async (err, data) => {
            if (err) {
                console.error('importTransactions', err)
                res.status(404).send(err.message)
            }
            else {
                const { transactions } = data
                if (transactions.length > 0) {
                    const initialBalance = transactions.shift().amount
                    console.log('initialBalance', initialBalance)
                    let finalBalance = initialBalance

                    transactions.forEach((item) => {
                        item.accountId = accountId
                        item.type = 'transaction'
                        finalBalance += item.amount
                    })
                    console.log('finalBalance', finalBalance)
                    await db.updateOne(buildDbId(accountId), {$set: {initialBalance, finalBalance}})
                    
                }
                try {
                    await db.deleteMany({ type: 'transaction', accountId })
                    const ret = await db.insertMany(transactions)
                    res.sendStatus(200)
                }
                catch (e) {
                    res.status(404).send(e.message)
                }

            }
        })

    })
}