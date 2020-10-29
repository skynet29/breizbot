//@ts-check

const qif2json = require('qif2json')

const stdCategories = {
    'Factures': ['Electicité', 'Gaz', 'Internet', 'Téléphone', 'Eau'],
    'Alimentation': ['Restaurant', 'Courses'],
    'Santé': ['Médecin', 'Pharmacie', 'Dentiste'],
    'Revenu': [],
    'Assurance': ['Maison', 'Automobile'],
    'Impôts': ['Revenu', 'Foncier', 'Habitation', 'Ordures ménagères'],
    'Loisirs': ['Magazines', 'Cinemas', 'Livres', 'Musées'],
    'Automobile': ['Carburant', 'Péage', 'Parking', 'Révision', 'Réparation'],
    'Maison': ['Habillement', 'Equipement'],
    'Vacances': ['Location'],
    'Dépôt': [],
    'Retrait': [],
    'Remboursement': ['CPAM', 'Mutuelle', 'Impôts', 'Autres'],
    'Frais bancaires': []
}

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

    async function computeMonthSynthesis(account) {
        const now = new Date()
        const daysOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

        const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        const endDate = new Date(now.getFullYear(), now.getMonth(), daysOfMonth)

        let income = 0
        let expenses = 0
        const transations = await db.find(
            {
                accountId: account._id.toString(),
                type: 'transaction',
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            }).toArray()

        transations.forEach((tr) => {
            if (tr.amount > 0) {
                income += tr.amount
            }
            else {
                expenses += -tr.amount
            }
        })

        return { income, expenses }

    }

    router.get('/account', async function (req, res) {

        const userName = req.session.user


        try {
            const accounts = await db.find({ userName, type: 'account' }, { projection: { name: 1, finalBalance: 1 } }).toArray()
            for await (const account of accounts) {
                account.synthesis = await computeMonthSynthesis(account)
            }
            res.json(accounts)
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
            const data = await db.find({ type: 'transaction', accountId }).sort({ date: -1 }).skip(offset).limit(20).toArray()
            res.json(data)
        }
        catch (e) {
            res.status(404).send(e.message)
        }

    })

    router.get('/account/:id/categories', async function (req, res) {

        const accountId = req.params.id

        try {
            let data = await db.distinct('category', { type: 'transaction', accountId })
            data = Object.keys(stdCategories).concat(data)
            data = [...new Set(data)] // vier les doublons

            res.json(data)
        }
        catch (e) {
            res.status(404).send(e.message)
        }

    })

    router.get('/account/:id/subcategories', async function (req, res) {

        const accountId = req.params.id
        const { category } = req.query

        try {
            let data = await db.distinct('subcategory', { type: 'transaction', accountId, category })
            data = stdCategories[category].concat(data)
            data = [...new Set(data)] // vier les doublons

            res.json(data)
        }
        catch (e) {
            res.status(404).send(e.message)
        }

    })


    router.get('/account/:id/payees', async function (req, res) {

        const accountId = req.params.id

        try {
            const data = await db.distinct('payee', { type: 'transaction', accountId })
            res.json(data)
        }
        catch (e) {
            res.status(404).send(e.message)
        }

    })

    router.post('/account/:id/addTransaction', async function (req, res) {

        const accountId = req.params.id

        const data = req.body
        data.type = 'transaction'
        data.accountId = accountId

        try {
            await db.insertOne(data)
            await db.updateOne(buildDbId(accountId), { $inc: { finalBalance: data.amount } })
            res.sendStatus(200)
        }
        catch (e) {
            res.status(404).send(e.message)
        }
    })

    router.delete('/transaction/', async function (req, res) {

        const data = req.body
        const { accountId, _id, amount } = data

        try {
            const ret = await db.deleteOne(buildDbId(_id))
            await db.updateOne(buildDbId(accountId), { $inc: { finalBalance: -amount } })
            res.sendStatus(200)
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
                        item.date = new Date(item.date)
                        finalBalance += item.amount
                    })
                    console.log('finalBalance', finalBalance)
                    await db.updateOne(buildDbId(accountId), { $set: { initialBalance, finalBalance } })

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