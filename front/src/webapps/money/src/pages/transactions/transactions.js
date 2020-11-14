$$.control.registerControl('transactions', {

    template: { gulp_inject: './transactions.html' },

    deps: ['breizbot.pager', 'breizbot.http'],

    props: {
        accountId: null
    },

    init: function (elt, pager, http) {


        const { accountId } = this.props

        let notPassedNumber = 0

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
                getStyle: function (scope) {
                    return { 'border-bottom': (scope.trIndex == notPassedNumber - 1) ? '2px solid black' : '1px solid #ddd' }
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

                        const transactionId = info._id.toString()

                        pager.pushPage('addTransaction', {
                            title: 'Edit Transaction',
                            props: {
                                formData: info,
                                accountId
                            },
                            onReturn: async function (data) {
                                console.log('onReturn', data)                                
                                await http.put(`/account/${accountId}/transaction/${transactionId}`, data)
                                data = $.extend(info, data)

                                ctrl.updateArrayItem('transactions', idx, data, 'transactions')
                            }
                        })
                    }
                }
            }

        })


        async function loadTransactions(offset) {
            offset = offset || 0

            const transactions = await http.get(`/account/${accountId}/transactions?offset=${offset}`)
            //console.log('transactions', offset, transactions)
            if (offset == 0) {
                ctrl.setData({ transactions })
            }
            else {
                ctrl.model.transactions = ctrl.model.transactions.concat(transactions)
                return transactions
            }
        }

        async function getTransactionNotPassedNumber() {
            const data  = await http.get(`/account/${accountId}/transactions/notPassedNumber`)
            //console.log('getTransactionNotPassedNumber', data)
            notPassedNumber = data.notPassedNumber
        }


    
        async function load() {
            await getTransactionNotPassedNumber()
            await loadTransactions()
        }

        
        load()

        function importTransactions() {
            pager.pushPage('breizbot.files', {
                title: 'Import transactions from QIF file',
                props: {
                    filterExtension: 'qif'
                },
                events: {
                    fileclick: function (ev, data) {
                        pager.popPage(data)
                    }
                },
                onReturn: async function (data) {
                    //console.log('onReturn', data)
                    const fileName = data.rootDir + data.fileName
                    await http.post(`/account/${accountId}/importTransactions`, { fileName })
                    loadTransactions()
                }
            })
        }

        this.getButtons = function () {
            return {
                import: {
                    title: 'import from QIF file',
                    icon: 'fa fa-download',
                    onClick: function () {
                        $$.ui.showConfirm({
                            title: 'Import Transactions',
                            content: 'This operation will remove all your current transactions<br><br>Are you sure ?'
                        }, importTransactions)
                    }
                },
                reload: {
                    title: 'Update',
                    icon: 'fa fa-redo-alt',
                    onClick: async function() {
                        await load()
                        ctrl.scope.scrollPanelTable.scrollTop(0)
                    }
                },
                add: {
                    title: 'Add Transaction',
                    icon: 'fa fa-plus',
                    onClick: function () {
                        pager.pushPage('addTransaction', {
                            title: 'Add Transaction',
                            props: {
                                accountId,
                                isAdd: true
                            },
                            onReturn: async function (data) {
                                //console.log('onReturn', data)                               
                                const { insertedId } = await http.post(`/account/${accountId}/transaction`, data)
                                //console.log('insertedId', insertedId)
                                data._id = insertedId
                                const date = new Date(data.date)
                                if (date.getTime() < Date.now()) {
                                    ctrl.insertArrayItemBefore('transactions', notPassedNumber, data, 'transactions')
                                }
                                else {
                                    notPassedNumber++
                                    ctrl.insertArrayItemBefore('transactions', 0, data, 'transactions')
                                }

                            }
                        })
                    }
                }
            }
        }
    }
});

