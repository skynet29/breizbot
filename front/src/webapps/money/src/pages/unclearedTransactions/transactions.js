$$.control.registerControl('unclearedTransactions', {

    template: { gulp_inject: './transactions.html' },

    deps: ['breizbot.pager', 'breizbot.http'],

    props: {
        transactions: [],
        accountId: null
    },

    init: function (elt, pager, http) {


        const { transactions, accountId } = this.props

        const checkedAmount = transactions.reduce((acc, item) => {
            return (item.clearedStatus === 'P') ? acc + item.amount : acc
        }, 0)

        const ctrl = $$.viewController(elt, {
            data: {
                transactions,
                initialBalance: 0,
                finalBalance: 0,
                checkedAmount,
                getDifference: function () {
                    return (this.finalBalance - this.initialBalance - this.checkedAmount).toFixed(2)
                },
                formatAmount: function (scope) {
                    return scope.$i.amount.toFixed(2)
                },
                formatDate: function (scope) {
                    return new Date(scope.$i.date).toLocaleDateString()
                },
                getAmountColor: function (scope) {
                    return (scope.$i.amount < 0) ? 'red' : 'black'
                },
                isChecked: function (scope) {
                    return scope.$i.clearedStatus === 'P'
                }
            },
            events: {
                onCheckClick: function () {
                    //console.log('onCheckClick')
                    let checkedAmount = getCheckedTransactions().reduce((acc, item) => {
                        return acc + item.amount
                    }, 0)
                    //console.log('checkedAmount', checkedAmount)
                    ctrl.setData({ checkedAmount })
                }
            }

        })


        function getCheckedTransactions() {
            const checked = ctrl.scope.transactions.find('.w3-check:checked')
            const ret = []
            checked.each(function () {
                const idx = $(this).closest('tr').index()
                //console.log('idx', idx)
                ret.push(ctrl.model.transactions[idx])
            })
            return ret

        }

        this.getButtons = function () {
            return {
                apply: {
                    title: 'Apply',
                    icon: 'fa fa-check',
                    onClick: async function () {
                        const clearedStatus = (parseInt(ctrl.model.getDifference()) == 0) ? 'X' : 'P'
                        const ids = getCheckedTransactions().map((item) => item._id.toString())
                        //console.log('ids', ids)
                        await http.put(`/account/${accountId}/unclearedTransactions`, { ids, clearedStatus })
                        pager.popPage()
                    }
                }
            }
        }
    }
});

