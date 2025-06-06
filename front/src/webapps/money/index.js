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
    'Automobile': ['Carburant', 'Péage', 'Parking', 'Entretien', 'Réparation'],
    'Maison': ['Habillement', 'Equipement'],
    'Vacances': ['Location'],
    'Dépôt': [],
    'Retrait': [],
    'Remboursement': ['Santé', 'Impôts', 'Autres'],
    'Frais bancaires': []
}

module.exports = function (ctx, router) {

    const { db, util } = ctx
    const { buildDbId } = db.constructor


    router.post('/account', async function (req, res) {

        const data = req.body

        data.type = 'account'
        data.finalBalance = data.initialBalance

        try {
            await db.insertOne(data)
            res.sendStatus(200)
        }
        catch (e) {
            res.status(404).send(e.message)
        }
    })


    function getMonthDateFilter(year, month) {
        const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0)); // Début du mois en UTC
        const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)); // Fin du mois en UTC
    
        console.log("Fixed UTC Start:", startDate);
        console.log("Fixed UTC End:", endDate);

    
        return { $gte: startDate, $lte: endDate };
    }

    function getCurrentMonthDateFilter() {
        const now = new Date()

        return getMonthDateFilter(now.getFullYear(), now.getMonth())
    }

    async function computeMonthSynthesis(accountId, year, month) {

        let income = 0
        let expenses = 0
        const transations = await db.find(
            {
                accountId,
                type: 'transaction',
                date: getMonthDateFilter(year, month)
            }).toArray()

        const categories = {}

        transations.forEach((tr) => {
            let { category, subcategory } = tr
            if (subcategory && subcategory != '') {
                subcategory = category + ':' + subcategory

                if (categories[subcategory] != undefined) {
                    categories[subcategory] += tr.amount
                }
                else {
                    categories[subcategory] = tr.amount
                }

            }

            if (categories[category] != undefined) {
                categories[category] += tr.amount
            }
            else {
                categories[category] = tr.amount
            }

            if (tr.amount > 0) {
                income += tr.amount
            }
            else {
                expenses += -tr.amount
            }
        })

        return { income, expenses, categories }

    }

    router.get('/account', async function (req, res) {

        const { synthesis } = req.query


        try {
            const accounts = await db.find({ type: 'account' }).toArray()
            if (synthesis === '1') {
                const now = new Date()

                for await (const account of accounts) {
                    const accountId = account._id.toString()
                    account.synthesis = await computeMonthSynthesis(accountId, now.getFullYear(), now.getMonth())
                }
            }
            res.json(accounts)
        }
        catch (e) {
            res.status(404).send(e.message)
        }

    })

    router.get('/account/:accountId/checkBalance', async function(req, res) {
        const { accountId } = req.params

        try {
            const ret = await db.sum({accountId, type: 'transaction'}, 'amount')
            //console.log('ret', ret)
            res.json({totalTransactions: ret})
        }
        catch(e) {
            console.log(e)
            res.status(400).send(e.message)
        }        
    })

    router.get('/account/:accountId/unclearedTransactions', async function (req, res) {

        const { accountId } = req.params


        try {
            const transations = await db.find(
                {
                    accountId,
                    type: 'transaction',
                    clearedStatus: { $ne: 'X' }
                }).sort({ date: 1 }).toArray()

            res.json(transations)
        }
        catch (e) {
            res.status(404).send(e.message)
        }

    })

    router.get('/account/:accountId/lastStatementInfo', async function (req, res) {

        const { accountId } = req.params


        try {
            const info = await db.findOne(buildDbId(accountId))

            res.json(info.lastStatement || { initialBalance: 0, finalBalance: 0 })
        }
        catch (e) {
            res.status(404).send(e.message)
        }

    })

    router.put('/account/:accountId/lastStatementInfo', async function (req, res) {

        const { accountId } = req.params
        const { lastStatement } = req.body


        try {
            await db.updateOne(buildDbId(accountId), { $set: { lastStatement } })

            res.sendStatus(200)
        }
        catch (e) {
            res.status(404).send(e.message)
        }

    })

    router.put('/account/:accountId/unclearedTransactions', async function (req, res) {

        const { accountId } = req.params
        const { ids, clearedStatus } = req.body


        try {
            await db.updateMany({ type: 'transaction', accountId, clearedStatus: 'P' }, {
                $unset: { clearedStatus: 1 }
            })
            if (ids.length > 0) {
                await db.updateMany(buildDbId(ids), { $set: { clearedStatus } })
            }

            res.sendStatus(200)
        }
        catch (e) {
            res.status(404).send(e.message)
        }

    })

    router.get('/account/:accountId/oldestYearTransaction', async function (req, res) {

        const { accountId } = req.params

        try {
            const oldestTransaction = await db.find({ accountId, type: 'transaction' }).sort({ date: 1 }).limit(1).toArray()
            const oldestYear = new Date(oldestTransaction[0].date).getFullYear()

            res.json({ oldestYear })
        }
        catch (e) {
            res.status(404).send(e.message)
        }

    })

    async function getAccountIds() {
        const accounts = await db.find({ type: 'account' }).toArray()

        const accountIds = []

        for await (const account of accounts) {
            const accountId = account._id.toString()
            accountIds.push(accountId)
        }
        return accountIds

    }

    router.get('/account/oldestYearTransaction', async function (req, res) {


        try {

            const accountIds = await getAccountIds()

            const oldestTransaction = await db.find({
                accountId: { $in: accountIds },
                type: 'transaction'
            }).sort({ date: 1 }).limit(1).toArray()
            const oldestYear = new Date(oldestTransaction[0].date).getFullYear()

            res.json({ oldestYear })
        }
        catch (e) {
            res.status(404).send(e.message)
        }

    })


    router.get('/account/:accountId/syntheses', async function (req, res) {

        const { accountId } = req.params
        const { year } = req.query

        const months = Array.from(Array(12).keys())
        const syntheses = []

        try {
            for await (const month of months) {
                const synthesis = await computeMonthSynthesis(accountId, year, month)
                syntheses.push(synthesis)
            }

            res.json(syntheses)
        }
        catch (e) {
            res.status(404).send(e.message)
        }

    })

    router.get('/account/synthesis', async function (req, res) {

        const { year } = req.query

        const months = Array.from(Array(12).keys())
        const syntheses = []

        try {
            const accountIds = await getAccountIds()

            for await (const month of months) {
                let income = 0
                let expenses = 0
                const transations = await db.find(
                    {
                        accountId: { $in: accountIds },
                        type: 'transaction',
                        date: getMonthDateFilter(year, month)
                    }).toArray()

                transations.forEach((tr) => {

                    if (tr.amount > 0) {
                        income += tr.amount
                    }
                    else {
                        expenses += -tr.amount
                    }
                })

                syntheses.push({ income, expenses })
            }

            res.json(syntheses)
        }
        catch (e) {
            res.status(404).send(e.message)
        }

    })


    router.put('/account/:accountId', async function (req, res) {

        const { accountId } = req.params
        const data = req.body

        try {
            await db.updateOne(buildDbId(accountId), { $set: data })
            res.sendStatus(200)
        }
        catch (e) {
            res.status(404).send(e.message)
        }

    })

    router.delete('/account/:accountId', async function (req, res) {

        const { accountId } = req.params

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
            const data = await db.find({ type: 'transaction', accountId }).sort({ date: -1, _id: 1 }).skip(offset).limit(20).toArray()
            res.json(data)
        }
        catch (e) {
            res.status(404).send(e.message)
        }
    })

    router.get('/account/:accountId/filteredTransactions', async function (req, res) {

        const { accountId } = req.params
        const { year, month, category, subcategory } = req.query

        const filter = {
            type: 'transaction',
            accountId,
            date: getMonthDateFilter(parseInt(year), parseInt(month)),
            category
        }
        if (subcategory != undefined) {
            filter.subcategory = subcategory
        }

        try {
            const data = await db.find(filter).sort({ date: 1 }).toArray()
            res.json(data)
        }
        catch (e) {
            res.status(404).send(e.message)
        }

    })

    router.get('/account/:id/transactions/notPassedNumber', async function (req, res) {

        const accountId = req.params.id
        const now = new Date()

        try {
            const notPassedNumber = await db.countDocuments({ type: 'transaction', accountId, date: { $gte: now } })
            res.json({ notPassedNumber })
        }
        catch (e) {
            res.status(404).send(e.message)
        }
    })

    router.get('/account/:id/recurringTransactions', async function (req, res) {

        const accountId = req.params.id

        try {
            const data = await db.find({ type: 'recurringTransaction', accountId }).sort({ date: 1 }).toArray()
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
            data = (stdCategories[category] || []).concat(data)
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


    router.get('/account/:accountId/lastNumber', async function (req, res) {

        const { accountId } = req.params

        try {
            const ret = await db.findOne({ type: 'transaction', accountId, number: { $exists: true } }, { sort: { date: -1 } })

            const ret2 = await db.find({ type: 'transaction', accountId, number: { $exists: true }, date: ret.date }).toArray()

            const number = Math.max(...ret2.map((i) => i.number))
            res.json({ number })
        }
        catch (e) {
            res.status(404).send(e.message)
        }
    })

    router.post('/account/:accountId/transaction', async function (req, res) {

        const { accountId } = req.params

        const data = req.body
        data.type = 'transaction'
        data.accountId = accountId
        data.date = new Date(data.date)

        try {
            const { insertedId } = await db.insertOne(data)
            delete data._id
            await db.updateOne(buildDbId(accountId), { $inc: { finalBalance: data.amount } })

            if (data.category == 'virement') {
                const toAccount = await db.findOne({ type: 'account', name: data.payee })
                const fromAccount = await db.findOne(buildDbId(accountId))
                data.amount *= -1
                data.payee = fromAccount.name
                data.accountId = toAccount._id.toString()
                await db.insertOne(data)
                await db.updateOne(buildDbId(data.accountId), { $inc: { finalBalance: data.amount } })


            }
            res.json({ insertedId })
        }
        catch (e) {
            res.status(404).send(e.message)
        }
    })

    router.post('/account/:accountId/recurringTransactions', async function (req, res) {

        const { accountId } = req.params

        const data = req.body
        data.type = 'recurringTransaction'
        data.accountId = accountId
        data.date = new Date(data.date)

        try {
            const { insertedId } = await db.insertOne(data)
            res.json({ insertedId })
        }
        catch (e) {
            res.status(404).send(e.message)
        }
    })

    router.put('/account/:accountId/transaction/:transactionId', async function (req, res) {

        const { accountId, transactionId } = req.params

        const data = req.body
        data.type = 'transaction'
        data.accountId = accountId
        data.date = new Date(data.date)

        try {
            const { value } = await db.findOneAndUpdate(buildDbId(transactionId), { $set: data })

            const diffAmount = data.amount - value.amount

            if (diffAmount != 0) {
                await db.updateOne(buildDbId(accountId), { $inc: { finalBalance: diffAmount } })
            }

            res.sendStatus(200)
        }
        catch (e) {
            res.status(404).send(e.message)
        }
    })

    router.put('/account/:accountId/recurringTransactions/:transactionId', async function (req, res) {

        const { accountId, transactionId } = req.params

        const data = req.body
        data.type = 'recurringTransaction'
        data.accountId = accountId
        data.date = new Date(data.date)

        try {
            await db.updateOne(buildDbId(transactionId), { $set: data })

            res.sendStatus(200)
        }
        catch (e) {
            res.status(404).send(e.message)
        }
    })

    function getNextOccurenceDate(date, periodicity) {
        if (periodicity == 'Monthly') {
            if (date.getMonth() == 11) {// décembre
                return new Date(Date.UTC(date.getFullYear() + 1, 0, date.getDate()))
            }
            return new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, date.getDate()))
        }
        else if (periodicity == 'Yearly') {
            return new Date(Date.UTC(date.getFullYear() + 1, date.getMonth(), date.getDate()))
        }
    }

    async function enterRecurringTransaction(accountId, transactionId, data) {
        data.date = new Date(data.date)

        const nextDate = getNextOccurenceDate(data.date, data.period)
        await db.updateOne(buildDbId(transactionId), { $set: { date: nextDate } })

        data.type = 'transaction'
        delete data.period
        delete data._id

        await db.insertOne(data)
        await db.updateOne(buildDbId(accountId), { $inc: { finalBalance: data.amount } })

    }

    router.post('/account/:accountId/recurringTransactions/:transactionId/ignoreNextOccurence', async function (req, res) {

        const { accountId, transactionId } = req.params

        try {
            const data = await db.findOne(buildDbId(transactionId))

            data.date = new Date(data.date)

            const nextDate = getNextOccurenceDate(data.date, data.period)
            await db.updateOne(buildDbId(transactionId), { $set: { date: nextDate } })

            res.sendStatus(200)
        }
        catch (e) {
            res.status(404).send(e.message)
        }
    })

    router.post('/account/:accountId/recurringTransactions/:transactionId/enterNextOccurence', async function (req, res) {

        const { accountId, transactionId } = req.params

        try {
            const data = await db.findOne(buildDbId(transactionId))

            await enterRecurringTransaction(accountId, transactionId, data)
            res.sendStatus(200)
        }
        catch (e) {
            res.status(404).send(e.message)
        }
    })

    router.post('/account/:accountId/recurringTransactions/enterAllOccurenceOfCurrentMonth', async function (req, res) {

        const { accountId } = req.params

        try {
            const recurringTransactions = await db.find({
                accountId,
                type: 'recurringTransaction',
                date: getCurrentMonthDateFilter()
            }).toArray()

            for await (const data of recurringTransactions) {
                await enterRecurringTransaction(accountId, data._id.toString(), data)
            }

            res.json({ inserted: recurringTransactions.length })
        }
        catch (e) {
            res.status(404).send(e.message)
        }
    })


    router.delete('/recurringTransactions/', async function (req, res) {

        const data = req.body
        const { _id } = data

        try {
            await db.deleteOne(buildDbId(_id))
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
                        const { date, amount, number, category } = item
                        item.accountId = accountId
                        item.type = 'transaction'
                        item.date = new Date(date)
                        finalBalance += amount
                        if (typeof number == 'string') {
                            item.number = parseInt(number)
                        }
                        if (category.startsWith('[')) {
                            item.payee = category.substring(1, category.length - 1)
                            item.category = 'virement'
                        }

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