//@ts-check
$$.control.registerControl('synthCategories', {

    template: { gulp_inject: './syntheses.html' },

    deps: ['breizbot.http', 'breizbot.pager'],

    props: {
        accountId: null
    },

    /**
     * 
     * @param {Breizbot.Services.Http.Interface} http 
     * @param {Breizbot.Services.Pager.Interface} pager 
     */
    init: function (elt, http, pager) {

        const { accountId } = this.props


        const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Total']

        let nbIncomeCat = 0
        let selectedYear = null

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
                        if (t.length == 1) {
                            const nbSubCategories = getNbSubcategories(t[0])
                            return  (nbSubCategories > 0) ? `${t[0]} (${nbSubCategories})` : t[0]
                        }
                        return t[1]
                    }

                    const value = scope.$i.value[scope.monthIdx]
                    return (value == 0) ? '    ' : value.toFixed(2)
                },
                getStyle: function (scope) {
                    let borderBottom = '1px solid #ddd'
                    if (scope.catIdx == nbIncomeCat) {
                        borderBottom = '2px solid black'
                    }
                    let color = 'black'
                    if (scope.$i.name.split(':').length == 1) {
                        color = 'blue'
                    }
                    return { 'border-top': borderBottom, color }
                },
                isCategory: function(scope) {
                    return (scope.$i.name.split(':').length == 1)
                },
                getCellStyle: function (scope) {
                    let paddingLeft = 8
                    const ret =  {}

                    if (scope.monthIdx == 0) {

                        const t = scope.$i.name.split(':')
                        
                        if (t.length == 2) {
                            paddingLeft += 15
                        }
                        else if (getNbSubcategories(t[0])) {
                            ret.cursor = 'pointer'
                        }
                    }

                    ret['padding-left'] = `${paddingLeft}px`
                   
                    const value = scope.$i.value[scope.monthIdx]
                    if (value != 0 && scope.monthIdx < 13) {
                        ret.cursor = 'pointer'
                    }

                    return ret

                }
            },
            events: {
                onYearChange: async function (ev, data) {
                    //console.log('onYearChange', data)
                    ctrl.setData({ syntheses: [] })
                    await loadSyntheses(parseInt(data.item.value))
                    ctrl.scope.scrollPanel.scrollTop(0)
                },
                onCellClick: async function () {
                    const elt = $(this)
                    let month = elt.index()
                    const idx = elt.closest('tr').index()            
                    //console.log('onCellClick', month, idx)
                    //console.log('info', ctrl.model.categories[idx])
                    const { name, value } = ctrl.model.categories[idx]
                    const t = name.split(':')
                    if (month == 0 && t.length == 1)
                    {
                        const nbSubCategories = getNbSubcategories(name)
                        //console.log('nbSubCategories', nbSubCategories)
                        const $tr = elt.closest('tbody').find('tr')
                        for (let i = 1; i <= nbSubCategories; i++) {
                            $tr.eq(i + idx).toggle()
                        }
                    }
                    else if (month > 0 && month < 13) {
                        
                        if (value[month] !== 0) {
                            
                            const category = t[0]
                            const subcategory = t[1]
                            month--
    
                            const options = { year: selectedYear, month, category, subcategory }
    
        
                            //console.log('onCellClick', options)
                            const transactions = await http.get(`/account/${accountId}/filteredTransactions`, options)
                            //console.log('transactions', transactions)
                            pager.pushPage('filteredTransactions', {
                                title: 'Selected Transactions',
                                props: {
                                    transactions
                                }
                            })
    
                        }
    
                    }
                }
            }

        })

        function getNbSubcategories(category) {
            category += ':'
            return ctrl.model.categories.filter((cat) => cat.name.startsWith(category)).length
        }

        function sortByName(a, b) {
            return a.name.localeCompare(b.name)
        }

        async function loadSyntheses(year) {
            selectedYear = year
            const syntheses = await http.get(`/account/${accountId}/syntheses`, { year })

            //console.log('syntheses', syntheses)

            let categories = {}
            syntheses.forEach((item, idx) => {

                for (let cat in item.categories) {
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
