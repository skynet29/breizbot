//@ts-check
$$.control.registerControl('syntheses', {

    template: { gulp_inject: './syntheses.html' },

    deps: ['breizbot.http'],

    props: {
        accountId: null
    },

    /**
     * 
     * @param {Breizbot.Services.Http.Interface} http 
     */
    init: function (elt, http) {

        const { accountId } = this.props


        const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Total']

        const ctrl = $$.viewController(elt, {
            data: {
                syntheses: [],
                months,
                years: [],
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
                getDiffColor: function (scope) {
                    if (scope.idx == 0) {
                        return 'black'
                    }
                    return (parseInt(this.formatDifference(scope)) < 0) ? 'red' : 'green'
                }
            },
            events: {
                onYearChange: async function(ev, data) {
                    //console.log('onYearChange', data)
                    ctrl.setData({syntheses: []})
                    loadSyntheses(parseInt($(this).getValue()))
                }
            }

        })

        async function loadSyntheses(year) {
            const syntheses = await http.get(`/account/${accountId}/syntheses`, { year })

            const income = syntheses.reduce((acc, item) => { return acc + item.income }, 0)
            const expenses = syntheses.reduce((acc, item) => { return acc + item.expenses }, 0)
            syntheses.unshift({})
            syntheses.push({ income, expenses })

            ctrl.setData({ syntheses })

        }

        async function load() {
            const currentYear = new Date().getFullYear()

            const { oldestYear } = await http.get(`/account/${accountId}/oldestYearTransaction`)

            const years = []
            for(let i = currentYear; i >= oldestYear; i--) {
                years.push(i.toString())
            }
            ctrl.setData({ years })
            loadSyntheses(currentYear)
        }

        load()

    }


});
