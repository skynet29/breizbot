//@ts-check
$$.control.registerControl('addTransaction', {

    template: { gulp_inject: './addTransaction.html' },

    deps: ['breizbot.pager', 'breizbot.http'],

    props: {
        accountId: null,
        isAdd: false,
        isRecurring: false,
        formData: null
    },

    /**
     * 
     * @param {Breizbot.Services.Pager.Interface} pager 
     * @param {Breizbot.Services.Http.Interface} http 
     */
    init: function (elt, pager, http) {

        //@ts-ignore
        const { accountId, formData, isAdd, isRecurring } = this.props

        let type = 'credit'
        let toAccount = ''
        let data = $.extend({}, formData)

        if (formData != null) {
            if (data.amount < 0) {
                data.amount *= -1
                type = 'debit'
            }
        }
        else {
            type = 'debit',
            data.period = 'Monthly'
        }

        const ctrl = $$.viewController(elt, {

            data: {
                formData: data,
                categories: [],
                payees: [],
                subcategories: [],
                type,
                isAdd,
                isRecurring,
                toAccount,
                isTransfer: function () {
                    return this.type === 'transfer'
                },
                getDateLabel: function () {
                    return (this.isRecurring) ? 'Next Occurence' : 'Date'
                },
                hasNumber: function () {
                    return !this.isRecurring && !this.isTransfer()
                }
            },

            events: {
                onSubmit: function (ev) {
                    ev.preventDefault()
                    const data = $(this).getFormData()
                    const {date} = data
                    const { type, toAccount } = ctrl.model
                    if (type == 'transfer') {
                        data.payee = toAccount
                        data.category = 'virement'
                        data.amount*= -1
                    }

                    if (type == 'debit') {
                        data.amount*= -1
                    }

                    if (!isRecurring) {
                        delete data.period
                    }


                    const utcDate = new Date(Date.UTC(
                        date.getFullYear(),
                        date.getMonth(),
                        date.getDate()
                    ))

                   data.date = utcDate.toISOString()
                   console.log('date', data.date)

                    if (isNaN(data.number)) {
                        delete data.number
                    }
        
        
                    pager.popPage(data)
                },

                onCategoryChange: async function (ev, ui) {
                    //console.log('onCategoryChange', ui)
                    const subcategories = await http.get(`/account/${accountId}/subcategories`, { category: ui.item.value })
                    ctrl.setData({ subcategories })
                },

                onFindNextNumber: async function () {
                    const { number } = await http.get(`/account/${accountId}/lastNumber`)
                    ctrl.scope.number.val(number + 1)
                }


            }

        })

        async function loadInfo() {
            const categories = await http.get(`/account/${accountId}/categories`)
            //console.log('categories', categories)
            const payees = await http.get(`/account/${accountId}/payees`)

            let accounts = await http.get(`/account`)
            accounts = accounts.filter((acc) => acc._id.toString() != accountId).map((acc) => acc.name)
            ctrl.setData({toAccount: accounts[0]})
            //console.log('accounts', accounts)

            ctrl.setData({ payees, categories, accounts })
        }

        loadInfo()

        this.getButtons = function () {
            return {
                apply: {
                    title: 'Appply',
                    icon: 'fa fa-check',
                    onClick: function () {
                        ctrl.scope.submit.click()
                    }
                }
            }
        }
    }
})