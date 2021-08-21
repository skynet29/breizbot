//@ts-check
$$.control.registerControl('filteredTransactions', {

    template: { gulp_inject: './transactions.html' },


    props: {
        transactions: []
    },

    init: function (elt) {


        const { transactions } = this.props


        const ctrl = $$.viewController(elt, {
            data: {
                transactions,
                formatAmount: function (scope) {
                    return scope.$i.amount.toFixed(2)
                },
                formatDate: function (scope) {
                    return new Date(scope.$i.date).toLocaleDateString()
                },
                getAmountColor: function (scope) {
                    return (scope.$i.amount < 0) ? 'red' : 'black'
                }

            }

        })

    }
});

