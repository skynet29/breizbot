//@ts-check
$$.control.registerControl('unclearedTransactions', {

    template: { gulp_inject: './transactions.html' },

    deps: ['breizbot.pager', 'breizbot.http'],

    props: {
        transactions: [],
        accountId: null,
        lastStatementInfo: null
    },

    /**
     * 
     * @param {Breizbot.Services.Pager.Interface} pager 
     * @param {Breizbot.Services.Http.Interface} http 
     */
    init: function (elt, pager, http) {

        //@ts-ignore
        const { transactions, accountId, lastStatementInfo } = this.props
        const { initialBalance, finalBalance } = lastStatementInfo

        const checkedAmount = transactions.reduce((acc, item) => {
            return (item.clearedStatus === 'P') ? acc + item.amount : acc
        }, 0)

        const income = transactions.filter((item) => item.amount > 0)
        const expenses = transactions.filter((item) => item.amount < 0 && item.number == undefined)
        const checks = transactions.filter((item) => item.amount < 0 && item.number != undefined)

        const ctrl = $$.viewController(elt, {
            data: {
                transactions: income.concat(checks, expenses),
                initialBalance,
                finalBalance,
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
                },
                getStyle: function (scope) {
                    const hadBorder = (scope.trIndex == income.length - 1) || (scope.trIndex == income.length + checks.length - 1)
                    return { 'border-bottom': hadBorder ? '2px solid black' : '1px solid #ddd' }
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
                        const isOk = (parseInt(ctrl.model.getDifference()) == 0)
                        const clearedStatus = isOk ? 'X' : 'P'
                        const ids = getCheckedTransactions().map((item) => item._id.toString())
                        //console.log('ids', ids)
                        await http.put(`/account/${accountId}/unclearedTransactions`, { ids, clearedStatus })

                        let { initialBalance, finalBalance } = ctrl.model
                        if (isOk) {
                            initialBalance = finalBalance
                            finalBalance = 0
                        }

                        await http.put(`/account/${accountId}/lastStatementInfo`, { lastStatement: { initialBalance, finalBalance } })
                        pager.popPage()
                    }
                }
            }
        }
    }
});

