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
                formatAmount: function(scope) {
                    return scope.$i.amount.toFixed(2)
                },
                formatDate: function(scope) {
                    return new Date(scope.$i.date).toLocaleDateString()
                },
                getItems: async function(idx) {
                    //console.log('getItems', idx)
                    return loadTransactions(idx)
                },
                getAmountColor: function(scope) {
                    return (scope.$i.amount < 0) ? 'red' : 'black'
                }
            }

        })

        async function loadTransactions(offset) {
            offset = offset || 0

            const transactions = await http.get(`/account/${accountId}/transactions?offset=${offset}`)
            //console.log('transactions', transactions)
            if (offset == 0) {
                ctrl.setData({ transactions })
            }
            else {
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
                                filterExtension: 'qif',
                                selectionEnabled: true,
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
                }
            }
        }
    }
});

