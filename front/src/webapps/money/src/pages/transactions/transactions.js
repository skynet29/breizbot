$$.control.registerControl('transactions', {

    template: { gulp_inject: './transactions.html' },

    deps: ['breizbot.pager', 'breizbot.http'],

    props: {
        accountId: null
    },

    init: function (elt, pager, http) {


        const { accountId } = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                transactions: [],
                formatAmount: function (scope) {
                    return scope.$i.amount.toFixed(2)
                },
                formatDate: function (scope) {
                    return new Date(scope.$i.date).toLocaleDateString()
                },
                getItems: async function (idx) {
                    //console.log('getItems', idx)
                    return loadTransactions(idx)
                },
                getAmountColor: function (scope) {
                    return (scope.$i.amount < 0) ? 'red' : 'black'
                },
                formatPayee: function (scope) {
                    const { category, payee } = scope.$i
                    if (category.startsWith('[')) {
                        return category.substring(1, category.length - 1)
                    }
                    return payee
                },
                formatCategory: function(scope) {
                    const { category } = scope.$i
                    if (category.startsWith('[')) {
                        return 'virement'
                    }
                    return category                    
                }
            },
            events: {
                onItemContextMenu: function (ev, data) {
                    const idx = $(this).index()
                    //console.log('onItemContextMenu', idx, data)
                    const { cmd } = data
                    const info = ctrl.model.transactions[idx]
                    //console.log('info', info)
                    if (cmd == 'del') {
                        $$.ui.showConfirm({ title: 'Delete Transaction', content: 'Are you sure ?' }, async () => {
                            await http.delete('/transaction/', info)
                            ctrl.removeArrayItem('transactions', idx, 'transactions')
                        })
                    }
                    else if (cmd == 'edit') {
                        if (info.amount < 0) {
                            info.type = "debit"
                            info.amount *= -1
                        }
                        else {
                            info.type = 'credit'
                        }

                        const transactionId = info._id.toString()

                        pager.pushPage('addTransaction', {
                            title: 'Edit Transaction',
                            props: {
                                formData: info
                            },
                            onReturn: async function (data) {
                                updateData(data)
                                //console.log('onReturn', data)
                                await http.put(`/account/${accountId}/transaction/${transactionId}`, data)

                                ctrl.updateArrayItem('transactions', idx, data, 'transactions')
                            }
                        })
                    }
                }
            }

        })

        function updateData(data) {
            let { date } = data

            date = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}T00:00:00`

            data.date = date

            if (data.type == 'debit') {
                data.amount *= -1
            }
            delete data.type

        }

        async function loadTransactions(offset) {
            offset = offset || 0

            const transactions = await http.get(`/account/${accountId}/transactions?offset=${offset}`)
            //console.log('transactions', transactions)
            if (offset == 0) {
                ctrl.setData({ transactions })
            }
            else {
                ctrl.model.transactions = ctrl.model.transactions.concat(transactions)
                return transactions
            }
        }

        loadTransactions()

        this.getButtons = function () {
            return {
                import: {
                    title: 'import from QIF file',
                    icon: 'fa fa-download',
                    onClick: function () {
                        console.log('Import')
                        pager.pushPage('breizbot.files', {
                            title: 'Import QIF file',
                            props: {
                                filterExtension: 'qif'
                            },
                            events: {
                                fileclick: function (ev, data) {
                                    pager.popPage(data)
                                }
                            },
                            onReturn: async function (data) {
                                console.log('onReturn', data)
                                const fileName = data.rootDir + data.fileName
                                await http.post(`/account/${accountId}/importTransactions`, { fileName })
                                loadTransactions()
                            }
                        })
                    }
                },
                add: {
                    title: 'Add Transaction',
                    icon: 'fa fa-plus',
                    onClick: function () {
                        pager.pushPage('addTransaction', {
                            title: 'Add Transaction',
                            props: {
                                accountId
                            },
                            onReturn: async function (data) {

                                updateData(data)
                                console.log('onReturn', data)
                                await http.post(`/account/${accountId}/addTransaction`, data)
                                ctrl.insertArrayItemAfter('transactions', 0, data, 'transactions')

                            }
                        })
                    }
                }
            }
        }
    }
});

