$$.control.registerControl('addTransaction', {

    template: { gulp_inject: './addTransaction.html' },

    deps: ['breizbot.pager', 'breizbot.http'],

    props: {
        accountId: null
    },

    init: function (elt, pager, http) {

        const { accountId } = this.props

        const ctrl = $$.viewController(elt, {

            data: {
                formData: {
                    type: 'debit'
                },
                categories: [],
                payees: []
            },

            events: {
                onSubmit: function (ev) {
                    ev.preventDefault()
                    const data = $(this).getFormData()
                    pager.popPage(data)
                }
            }

        })

        async function loadInfo() {
            const categories = await http.get(`/account/${accountId}/categories`)
            //console.log('categories', categories)
            const payees = await http.get(`/account/${accountId}/payees`)
            //console.log('payees', payees)

            ctrl.setData({payees, categories})
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