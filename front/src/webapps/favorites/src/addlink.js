$$.control.registerControl('addLink', {

    template: { gulp_inject: './addlink.html' },

    deps: ['breizbot.pager'],

    props: {
        data: {}
    },

    init: function (elt, pager) {

        const { data } = this.props

        const ctrl = $$.viewController(elt, {
            data: {
                data
            },
            events: {
                onSubmit: function (ev) {
                    ev.preventDefault()
                    pager.popPage($(this).getFormData())

                }
            }
        })

        this.getButtons = function () {
            return {
                apply: {
                    title: 'Apply',
                    icon: 'fas fa-check',
                    onClick: function () {
                        ctrl.scope.submit.click()
                    }
                }
            }
        }
    }
})