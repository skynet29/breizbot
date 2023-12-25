// @ts-check

$$.control.registerControl('search', {

    template: { gulp_inject: './search.html' },

    deps: ['breizbot.pager'],


    /**
     * 
     * @param {Breizbot.Services.Pager.Interface} pager 
     */
    init: function (elt, pager) {

        const ctrl = $$.viewController(elt, {
            data: {},

            events: {
                onSubmit: async function (ev) {
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