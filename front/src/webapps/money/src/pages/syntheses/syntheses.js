$$.control.registerControl('syntheses', {

    template: { gulp_inject: './syntheses.html' },

    deps: ['breizbot.http'],

    props: {
        accountId: null
    },

    init: function (elt, http) {

        const { accountId } = this.props

        const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        const ctrl = $$.viewController(elt, {
            data: {
                syntheses: [],
                months,
                formatIncome: function (scope) {                    
                    //const synthesis = this.syntheses[scope.idx]
                    return (scope.idx == 0) ? 'Income' : this.syntheses[scope.idx].income.toFixed(2)
                },
                formatExpenses: function (scope) {
                    return (scope.idx == 0) ? 'Expenses' : this.syntheses[scope.idx].expenses.toFixed(2)
                },
                formatDifference: function (scope) {
                    const { income, expenses } = this.syntheses[scope.idx]
                    return (scope.idx == 0) ? 'Difference' : (income - expenses).toFixed(2)    
                },
                getDiffColor: function(scope) {
                    if (scope.idx == 0) {
                        return 'black'
                    }
                    return (parseInt(this.formatDifference(scope)) < 0) ?  'red' : 'green'
                }
            }

        })


        async function load() {
            const syntheses = await http.get(`/account/${accountId}/syntheses`, { year: new Date().getFullYear() })
            //console.log('syntheses', syntheses)
            syntheses.unshift({})
            ctrl.setData({ syntheses })

        }

        load()
    }

});
