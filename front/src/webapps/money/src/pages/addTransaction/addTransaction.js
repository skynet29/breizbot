$$.control.registerControl('addTransaction', {

    template: { gulp_inject: './addTransaction.html' },

    deps: ['breizbot.pager', 'breizbot.http'],

    props: {
        accountId: null,
        isAdd: false,
        formData: {
            type: 'debit'
        }
    },

    init: function (elt, pager, http) {
        const { accountId, formData, isAdd } = this.props
       
        const { type } = formData

        const ctrl = $$.viewController(elt, {

            data: {
                formData,
                categories: [],
                payees: [],
                subcategories: [],
                type,
                isAdd,
                isTransfer: function () {
                    return this.type === 'transfer'
                }
            },

            events: {
                onSubmit: function (ev) {
                    ev.preventDefault()
                    const data = $(this).getFormData()
                    data.type = ctrl.model.type
                    data.toAccount = ctrl.scope.toAccount.getSelItem()
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
            accounts = accounts.filter((acc) => acc._id.toString() != accountId).map((acc) => { return { label: acc.name, value: acc._id.toString() } })
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