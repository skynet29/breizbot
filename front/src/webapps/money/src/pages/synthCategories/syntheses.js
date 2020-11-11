$$.control.registerControl('synthCategories', {

    template: { gulp_inject: './syntheses.html' },

    deps: ['breizbot.http'],

    props: {
        accountId: null
    },

    init: function (elt, http) {

        const { accountId } = this.props


        const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Total']

        let nbIncomeCat = 0

        const ctrl = $$.viewController(elt, {
            data: {
                categories: [],
                months,
                years: [],
                formatAmount: function (scope) {
                    //console.log('formatAmount', scope)
                    if (scope.monthIdx == 0) {
                        //console.log('name', scope.$i.name)
                        const t = scope.$i.name.split(':')
                        return (t.length == 2) ? t[1] : t[0]
                    }

                    const value = scope.$i.value[scope.monthIdx]
                    return (value == 0) ? '    ' : value.toFixed(2)
                },
                getStyle: function (scope) {
                    let borderBottom = '1px solid #ddd'
                    if (scope.catIdx == nbIncomeCat - 1) {
                        borderBottom = '2px solid black'
                    }
                    let color = 'black'
                    if (scope.$i.name.split(':').length == 1) {
                        color = 'blue'
                    }
                    return { 'border-bottom': borderBottom, color }
                },
                getCellStyle: function(scope) {
                    let paddingLeft = 8
                    if (scope.monthIdx == 0) {
                        if (scope.$i.name.split(':').length == 2) {
                            paddingLeft += 15
                        }
                    }
                    return {'padding-left': `${paddingLeft}px`}

                }
            },
            events: {
                onYearChange: async function (ev, data) {
                    //console.log('onYearChange', data)
                    ctrl.setData({ syntheses: [] })
                    await loadSyntheses(parseInt(data.item.value))
                    ctrl.scope.scrollPanel.scrollTop(0)
                }
            }

        })

        function sortByName(a, b) {
            return a.name.localeCompare(b.name)
        }

        async function loadSyntheses(year) {
            const syntheses = await http.get(`/account/${accountId}/syntheses`, { year })

            //console.log('syntheses', syntheses)

            let categories = {}
            syntheses.forEach((item, idx) => {

                for (cat in item.categories) {
                    if (categories[cat] == undefined) {
                        categories[cat] = new Array(13).fill(0)
                    }
                    categories[cat][idx + 1] = item.categories[cat]
                }

            })
            //console.log('categories', categories)
            categories = $$.util.objToArray2(categories)
            categories.forEach((item) => {
                const total = item.value.reduce((acc, i) => acc + i, 0)
                item.value.push(total)
            })
            const income = categories.filter((item) => item.value[13] > 0).sort(sortByName)
            nbIncomeCat = income.length
            //console.log('nbIncomeCat', nbIncomeCat)
            const expenses = categories.filter((item) => item.value[13] < 0).sort(sortByName)
            categories = income.concat(expenses)


            ctrl.setData({ categories })

        }

        async function load() {
            const currentYear = new Date().getFullYear()

            const { oldestYear } = await http.get(`/account/${accountId}/oldestYearTransaction`)

            const years = []
            for (let i = currentYear; i >= oldestYear; i--) {
                years.push(i.toString())
            }
            ctrl.setData({ years })
            loadSyntheses(currentYear)
        }

        load()

    }


});
