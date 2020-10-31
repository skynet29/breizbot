$$.control.registerControl('recurringTransactions', {

    template: { gulp_inject: './transactions.html' },

    deps: ['breizbot.pager', 'breizbot.http'],

    props: {
        accountInfo: null
    },

    init: function (elt, pager, http) {


        const { accountInfo } = this.props
        const accountId = accountInfo._id.toString()

        const ctrl = $$.viewController(elt, {
            data: {
                transactions: [],
                formatAmount: function (scope) {
                    return scope.$i.amount.toFixed(2)
                },
                formatDate: function (scope) {
                    return new Date(scope.$i.date).toLocaleDateString()
                },
                getAmountColor: function (scope) {
                    return (scope.$i.amount < 0) ? 'red' : 'black'
                }
            },
            events: {
                onItemContextMenu: async function (ev, data) {
                    const idx = $(this).index()
                    //console.log('onItemContextMenu', idx, data)
                    const { cmd } = data
                    const info = ctrl.model.transactions[idx]
                    const transactionId = info._id.toString()

                    //console.log('info', info)
                    if (cmd == 'del') {
                        $$.ui.showConfirm({ title: 'Delete Transaction', content: 'Are you sure ?' }, async () => {
                            await http.delete('/transaction/', info)
                           loadTransactions()
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


                        pager.pushPage('addTransaction', {
                            title: 'Edit Recurring Transaction',
                            props: {
                                formData: info,
                                accountId,
                                isRecurring: true
                            },
                            onReturn: async function (data) {
                                updateData(data)
                                //console.log('onReturn', data)
                                await http.put(`/account/${accountId}/recurringTransactions/${transactionId}`, data)
                                loadTransactions()

                            }
                        })
                    }
                    else if (cmd == 'enterNextOccur') {
                        await http.post(`/account/${accountId}/recurringTransactions/${transactionId}/enterNextOccurence`)
                        loadTransactions()
                    }
                    else if (cmd == 'ignoreNextOccur') {
                        await http.post(`/account/${accountId}/recurringTransactions/${transactionId}/ignoreNextOccurence`)
                        loadTransactions()
                    }
                }
            }

        })

        function updateData(data) {

            //console.log('updateData', data)
            let { date, toAccount, memo, number, subcategory } = data

            let month = date.getMonth() + 1
            if (month < 10) {
                month = '0' + month
            }
            let day = date.getDate()
            if (day < 10) {
                day = '0' + day
            }

            date = `${date.getFullYear()}-${month}-${day}T00:00:00`

            data.date = date

            if (data.type == 'transfer') {
                data.category = 'virement'
                data.amount *= -1
                data.payee = toAccount.label
                data.toAccount = toAccount.value
            }
            else {
                delete data.toAccount
            }

            if (data.type == 'debit') {
                data.amount *= -1
            }

            delete data.type

            if (isNaN(number)) {
                delete data.number
            }

            if (memo == '') {
                delete data.memo
            }

            if (subcategory == '') {
                delete data.subcategory
            }

        }

        async function loadTransactions() {

            const transactions = await http.get(`/account/${accountId}/recurringTransactions`)
            //console.log('transactions', transactions)
            ctrl.setData({ transactions })
        }

        loadTransactions()


        this.getButtons = function () {
            return {
                add: {
                    title: 'Add Recurring Transaction',
                    icon: 'fa fa-plus',
                    onClick: function () {
                        pager.pushPage('addTransaction', {
                            title: 'Add Recurring Transaction',
                            props: {
                                accountId,
                                isAdd: true,
                                isRecurring: true
                            },
                            onReturn: async function (data) {
                                updateData(data)
                                //console.log('onReturn', data)

                                await http.post(`/account/${accountId}/recurringTransactions`, data)
                                loadTransactions()
                            }
                        })
                    }
                },
                enterAll: {
                    title: 'Enter all transactions of current month',
                    icon: 'fa fa-external-link-alt',
                    onClick: async function() {
                        await http.post(`/account/${accountId}/recurringTransactions/enterAllOccurenceOfCurrentMonth`)
                        loadTransactions()
                    }
                }
            }
        }
    }
});

